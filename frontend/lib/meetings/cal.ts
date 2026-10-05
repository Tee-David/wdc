import "server-only";

export class CalError extends Error {
  constructor(public readonly status: number, public readonly uncertain = false) {
    super(status === 429 ? "Scheduling is busy. Please try again shortly." : uncertain ? "The provider response was interrupted. Check the result before retrying." : "The scheduling provider could not complete this request.");
  }
}

/** Fixed provider origin: caller input must never become a network destination. */
export async function cal<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const key = process.env.CAL_API_KEY?.trim();
  if (!key) throw new CalError(503);
  const version = path.startsWith("/bookings") ? "2026-02-25" : path.startsWith("/slots") ? "2024-09-04" : path.startsWith("/event-types") ? "2026-06-12" : "2024-06-11";
  let response: Response;
  try {
    response = await fetch(`https://api.cal.com/v2${path}`, {
      method, cache: "no-store", signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${key}`, "cal-api-version": version, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch { throw new CalError(502, method !== "GET"); }
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
export type MeetingType = { id: number; title: string; slug: string; lengthInMinutes: number; hidden?: boolean; locations?: { type: string }[]; scheduleId?: number };
export type Schedule = {id:number;name:string;timeZone:string;availability:{days:string[];startTime:string;endTime:string}[];overrides:{date:string;startTime:string;endTime:string}[]};
export type Slots = Record<string, { start: string }[]>;
