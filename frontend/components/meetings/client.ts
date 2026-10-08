"use client";

import { describeMeetingError, isMeetingErrorCode, loadFailureCode, type MeetingErrorCode } from "@/lib/meetings/errors";

/** A request the server refused or could not finish; `code` says why, for the page to explain. */
export class MeetingRequestError extends Error {
  constructor(message: string, public readonly code?: MeetingErrorCode, public readonly extra?: Record<string, unknown>) {
    super(message);
  }
}

/**
 * The saved command did not settle. The request is safe on the server; the
 * page offers "Check again" instead of blocking every other change.
 * `state` is the server's word for it, or "blocked" when a different change was refused.
 */
export class MeetingPending extends Error {
  constructor(public readonly state: string, message: string) {
    super(message);
  }
}

export async function meetingRequest(body: Record<string, unknown>) {
  let response: Response;
  try {
    response = await fetch("/api/meetings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(30_000) });
  } catch (error) {
    const code = loadFailureCode(error);
    throw new MeetingRequestError(describeMeetingError(code).message, code);
  }
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const code = isMeetingErrorCode(result?.code) ? result.code : result ? undefined : "bad_reply";
    throw new MeetingRequestError(result?.error || describeMeetingError(code).message, code, result ?? undefined);
  }
  return result;
}

const KEY = "wdc:meeting-command";
export type StoredCommand = { id: string; token?: string; action: string; scope: string };

/** The saved command, if there is a readable one. A corrupt value is treated as none. */
export function pendingMeetingCommand(): StoredCommand | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    const value = raw ? JSON.parse(raw) : null;
    return value && typeof value.id === "string" && typeof value.action === "string" && typeof value.scope === "string" ? value : null;
  } catch {
    return null;
  }
}
/** Forget the saved command in this tab. The server keeps its record; nothing is undone. */
export function clearMeetingCommand() {
  try { sessionStorage.removeItem(KEY); } catch { /* storage can be blocked */ }
}
function saveCommand(value: StoredCommand) {
  try { sessionStorage.setItem(KEY, JSON.stringify(value)); } catch { /* the request still runs; it just cannot be resumed after a reload */ }
}

const POLLS = 30;
const POLL_MS = 1500;

/** What the server stored for a finished command: its shape depends on the action, as it always has. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CommandResult = any;

/** Poll until the command settles or ~45 s pass. Throws MeetingPending when it has not settled. */
async function settle(id: string, token: unknown, first: { state: string; result?: CommandResult; error?: string }, progress: (message: string) => void): Promise<CommandResult> {
  let state = first;
  for (let n = 0; n < POLLS && ["pending", "executing"].includes(state.state); n++) {
    progress("Your request is saved. Checking the scheduling provider…");
    await new Promise(resolve => setTimeout(resolve, POLL_MS));
    state = await meetingRequest({ action: "status", id, token });
  }
  if (state.state === "failed") {
    clearMeetingCommand();
    throw new Error(state.error || "The change was not applied.");
  }
  if (state.state !== "completed") {
    throw new MeetingPending(state.state, state.error || "Your request is saved but Cal.com has not confirmed it yet.");
  }
  clearMeetingCommand();
  return state.result;
}

/** Poll a persisted command, never repeat its mutation. An interrupted tab can resume by ID. */
export async function meetingCommand(body: Record<string, unknown>, progress: (message: string) => void) {
  const previous = pendingMeetingCommand();
  const scope = JSON.stringify(body);
  if (previous && (previous.action !== body.action || previous.scope !== scope)) {
    throw new MeetingPending("blocked", "An earlier change is still being checked. Check it again before making a different change.");
  }
  const id = previous?.id || crypto.randomUUID();
  saveCommand({ id, token: body.token as string | undefined, action: String(body.action), scope });
  const first = previous ? await meetingRequest({ action: "status", id, token: previous.token }) : await meetingRequest({ ...body, id });
  return settle(id, body.token, first, progress);
}

/** Ask once more about the saved command (the page's "Check again"). Resolves with its result when it has completed. */
export async function checkMeetingCommand(progress: (message: string) => void) {
  const previous = pendingMeetingCommand();
  if (!previous) return undefined;
  const first = await meetingRequest({ action: "status", id: previous.id, token: previous.token });
  return settle(previous.id, previous.token, first, progress);
}

export function guestToken() {
  const existing = sessionStorage.getItem("wdc:booking-token");
  if (existing && /^[a-f0-9]{64}$/.test(existing)) return existing;
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token=Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("");
  sessionStorage.setItem("wdc:booking-token",token);
  return token;
}
