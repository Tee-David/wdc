import "server-only";
import { SITE_URL } from "@/lib/site";
import { timingSafeEqual } from "node:crypto";
import { codeForCalStatus, plainMeetingMessage, type MeetingErrorCode, type WebhookState } from "./errors";

/**
 * A failed call to Cal.com. `meetingCode` is what the route returns and the
 * page turns into words (lib/meetings/errors.ts); `message` is the public-safe
 * sentence, so it can be stored on a command and shown without naming a key.
 */
export class CalError extends Error {
  public readonly meetingCode: MeetingErrorCode;
  constructor(public readonly status: number, public readonly uncertain = false, code?: MeetingErrorCode) {
    const meetingCode = code ?? codeForCalStatus(status);
    super(uncertain ? "The provider response was interrupted. Check the result before retrying." : plainMeetingMessage(meetingCode));
    this.meetingCode = meetingCode;
  }
}

/** Fixed provider origin: caller input must never become a network destination. */
export async function cal<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const key = process.env.CAL_API_KEY?.trim();
  if (!key) throw new CalError(503, false, "no_api_key");
  const version = path.startsWith("/bookings") ? "2026-02-25" : path.startsWith("/slots") ? "2024-09-04" : path.startsWith("/event-types") ? "2026-06-12" : "2024-06-11";
  let response: Response;
  try {
    response = await fetch(`https://api.cal.com/v2${path}`, {
      method, cache: "no-store", signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${key}`, "cal-api-version": version, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    throw new CalError(502, method !== "GET", timedOut ? "cal_timeout" : "cal_unreachable");
  }
  if (!response.ok) throw new CalError(response.status, method !== "GET" && response.status >= 500);
  try {
    const result = await response.json();
    if (result.status !== "success") throw new CalError(502, method !== "GET");
    return result.data as T;
  } catch (error) {
    if (error instanceof CalError) throw error;
    throw new CalError(502, method !== "GET");
  }
}

export type Booking = {
  uid: string; title: string; start: string; end: string; status: string;
  attendees?: { name: string; email: string; timeZone?: string }[];
  meetingUrl?: string; location?: string; metadata?: Record<string, string>;
};
export type MeetingType = { id: number; title: string; slug: string; lengthInMinutes: number; hidden?: boolean; locations?: { type: string }[]; scheduleId?: number; minimumBookingNotice?:number; beforeEventBuffer?:number; afterEventBuffer?:number };
export type Schedule = {id:number;name:string;timeZone:string;availability:{days:string[];startTime:string;endTime:string}[];overrides:{date:string;startTime:string;endTime:string}[]};
export type Slots = Record<string, { start: string }[]>;

/**
 * Is the signed webhook registered, and does its secret match ours?
 *
 * UNVERIFIED with Cal.com: whether GET /webhooks returns each hook's `secret`
 * is not confirmed against the live API. The old check demanded it and so
 * could never pass if Cal withholds it. A hook that is otherwise right but
 * shows no secret is therefore "unconfirmed", a state the owner can resolve
 * by re-checking or by ticking that they confirmed the secret in Cal.com;
 * a hook that shows a DIFFERENT secret, or none registered at all, still blocks.
 */
export async function webhookState(): Promise<WebhookState> {
  const secret = process.env.CAL_WEBHOOK_SECRET;
  if (!secret) return "no_secret";
  const target = new URL("/api/meetings/webhook", SITE_URL).href;
  const hooks = await cal<{ subscriberUrl: string; active: boolean; secret?: string; triggers: string[]; payloadTemplate?: string }[]>("/webhooks");
  const triggers = ["BOOKING_CREATED", "BOOKING_REQUESTED", "BOOKING_RESCHEDULED", "BOOKING_CANCELLED", "BOOKING_REJECTED"];
  const candidates = hooks.filter(hook => hook.active && hook.subscriberUrl === target && !hook.payloadTemplate && triggers.every(trigger => hook.triggers?.includes(trigger)));
  if (!candidates.length) return "not_registered";
  const expected = Buffer.from(secret);
  const matches = (hook: { secret?: string }) => {
    const actual = Buffer.from(hook.secret ?? "");
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  };
  if (candidates.some(matches)) return "ready";
  return candidates.some(hook => hook.secret) ? "secret_mismatch" : "unconfirmed";
}
