/**
 * WHAT WENT WRONG WITH MEETINGS, AND WHAT TO DO NEXT.
 *
 * Pure on purpose (no server-only, no env reads, no network): the API route
 * stamps a `code` on every failure, the page turns that code into words and a
 * next action, and tests/meetings-errors.spec.ts pins every pair. The public
 * booking widget shows `plain` only, because it must never name an
 * environment variable to a visitor.
 *
 * Nothing here carries a secret. Env var NAMES are fine; values never pass
 * through this module.
 */
export const MEETING_ERROR_CODES = [
  "not_owner",
  "no_api_key",
  "cal_rejected",
  "cal_timeout",
  "cal_unreachable",
  "cal_busy",
  "cal_error",
  "migration_missing",
  "database_unavailable",
  "setup_missing",
  "request_timeout",
  "bad_reply",
  "offline",
  "unknown",
] as const;
export type MeetingErrorCode = (typeof MEETING_ERROR_CODES)[number];

export type MeetingErrorAction =
  | { kind: "retry"; label: string }
  | { kind: "setup"; label: string }
  | { kind: "link"; label: string; href: string };

export type MeetingErrorInfo = {
  /** One short heading for the page. */
  title: string;
  /** The owner's version: what is missing, in plain words, naming the fix. */
  message: string;
  /** The version that is safe to show a visitor on the public booking widget. */
  plain: string;
  /** Next actions, primary first. Every code has at least one. */
  actions: MeetingErrorAction[];
  /** Whether trying again can help without anyone changing anything. */
  transient: boolean;
};

const RETRY: MeetingErrorAction = { kind: "retry", label: "Retry" };
const SYSTEM: MeetingErrorAction = { kind: "link", label: "Open Settings › System", href: "/admin/settings/system" };
const INTEGRATIONS: MeetingErrorAction = { kind: "link", label: "Open Settings › Integrations", href: "/admin/settings/integrations" };
const ERRORS: MeetingErrorAction = { kind: "link", label: "Open the Error log", href: "/admin/settings/errors" };

const TABLE: Record<MeetingErrorCode, MeetingErrorInfo> = {
  not_owner: {
    title: "Only the owner can change scheduling",
    message: "Scheduling settings are for the owner. Ask the owner if you need something changed here.",
    plain: "You do not have access to this.",
    actions: [{ kind: "link", label: "Back to the dashboard", href: "/admin" }],
    transient: false,
  },
  no_api_key: {
    title: "Cal.com is not connected",
    message: "The server has no CAL_API_KEY. Add your Cal.com API key to the hosting environment as CAL_API_KEY (the key is never entered or shown here), redeploy, then check again.",
    plain: "Meeting booking is being configured. Please use the contact form.",
    actions: [INTEGRATIONS, RETRY],
    transient: false,
  },
  cal_rejected: {
    title: "Cal.com refused the key",
    message: "Cal.com refused the request, so the CAL_API_KEY on the server is wrong, expired or lacks permission. Create a new key in your Cal.com account, replace CAL_API_KEY in the hosting environment, redeploy, then retry.",
    plain: "Meeting booking is being configured. Please use the contact form.",
    actions: [{ kind: "link", label: "Open Cal.com", href: "https://app.cal.com/settings/developer/api-keys" }, RETRY],
    transient: false,
  },
  cal_timeout: {
    title: "Cal.com did not answer in time",
    message: "Cal.com did not answer within 15 seconds. Nothing was changed. Retry in a moment.",
    plain: "Scheduling is slow to respond. Please try again shortly.",
    actions: [RETRY],
    transient: true,
  },
  cal_unreachable: {
    title: "Cal.com could not be reached",
    message: "The server could not connect to Cal.com. Nothing was changed. Retry in a moment; if it keeps happening, check Cal.com's status page.",
    plain: "Scheduling could not be reached. Please try again shortly.",
    actions: [RETRY],
    transient: true,
  },
  cal_busy: {
    title: "Cal.com is busy",
    message: "Cal.com is limiting how often we can ask. Wait a minute, then retry.",
    plain: "Scheduling is busy. Please try again shortly.",
    actions: [RETRY],
    transient: true,
  },
  cal_error: {
    title: "Cal.com answered with an error",
    message: "Cal.com answered, but with an error or a reply we did not expect. Retry once; if it repeats, the Error log has the detail.",
    plain: "The scheduling provider could not complete this request.",
    actions: [RETRY, ERRORS],
    transient: true,
  },
  migration_missing: {
    title: "The Meetings tables are not in the database",
    message: "The Meetings migration (0035_meetings) has not been applied. Open Settings › System, apply the pending migration there (owner only), then check again.",
    plain: "Meeting booking is being configured. Please use the contact form.",
    actions: [SYSTEM, RETRY],
    transient: false,
  },
  database_unavailable: {
    title: "The database could not be reached",
    message: "Meetings store their settings in the database and it did not answer. Check Settings › System, then retry.",
    plain: "Scheduling could not be loaded. Please try again shortly.",
    actions: [SYSTEM, RETRY],
    transient: true,
  },
  setup_missing: {
    title: "Scheduling is not set up yet",
    message: "The private WDC meeting type has not been created or linked to a schedule yet. Set it up first; nothing is published until you turn bookings on.",
    plain: "Meeting booking is being configured. Please use the contact form.",
    actions: [{ kind: "setup", label: "Set up now" }],
    transient: false,
  },
  request_timeout: {
    title: "The page did not answer in time",
    message: "Checking Cal.com took longer than 25 seconds. Nothing was changed. Retry in a moment.",
    plain: "Scheduling is slow to respond. Please try again shortly.",
    actions: [RETRY],
    transient: true,
  },
  bad_reply: {
    title: "The server sent back something unreadable",
    message: "The server replied with a page instead of data, which usually means it timed out or restarted. Retry; if it repeats, the Error log has the detail.",
    plain: "Scheduling could not be loaded. Please try again shortly.",
    actions: [RETRY, ERRORS],
    transient: true,
  },
  offline: {
    title: "No connection",
    message: "This device could not reach the studio's server. Check your connection, then retry.",
    plain: "Check your connection and try again.",
    actions: [RETRY],
    transient: true,
  },
  unknown: {
    title: "Scheduling could not be loaded",
    message: "Something unexpected stopped the check. The Error log has the detail; retry once first.",
    plain: "Scheduling could not be loaded. Check setup or try again.",
    actions: [RETRY, ERRORS],
    transient: true,
  },
};

export function isMeetingErrorCode(value: unknown): value is MeetingErrorCode {
  return typeof value === "string" && (MEETING_ERROR_CODES as readonly string[]).includes(value);
}

/** The words and next actions for a code. An unrecognised code is "unknown", never a blank. */
export function describeMeetingError(code: unknown): MeetingErrorInfo {
  return TABLE[isMeetingErrorCode(code) ? code : "unknown"];
}

/**
 * The code an error carries. Server errors set `meetingCode` (CalError and
 * the store's config error), so this needs no import of server-only modules.
 */
export function meetingErrorCode(error: unknown): MeetingErrorCode {
  const code = (error as { meetingCode?: unknown } | null | undefined)?.meetingCode;
  return isMeetingErrorCode(code) ? code : "unknown";
}

/** The code for a Cal.com HTTP status (or 0 when the call never got an answer). */
export function codeForCalStatus(status: number): MeetingErrorCode {
  if (status === 401 || status === 403) return "cal_rejected";
  if (status === 429) return "cal_busy";
  return "cal_error";
}

/** The code for a failed browser fetch or an unreadable reply (client side). */
export function loadFailureCode(error: unknown): MeetingErrorCode {
  const name = (error as { name?: string } | null | undefined)?.name;
  if (name === "TimeoutError" || name === "AbortError") return "request_timeout";
  if (name === "SyntaxError") return "bad_reply";
  if (name === "TypeError") return "offline";
  return "unknown";
}

/** The public-safe sentence for a code. */
export function plainMeetingMessage(code: unknown): string {
  return describeMeetingError(code).plain;
}

/**
 * The one-word state shown on the Settings index card, from stored config only.
 * `config` is null when it could not be read (no migration, no database).
 */
export function meetingsStatusLabel(input: { hasKey: boolean; config: { event_type_id: number | null; enabled: boolean } | null }): string {
  if (!input.hasKey || !input.config || !input.config.event_type_id) return "Not set up";
  return input.config.enabled ? "Taking bookings" : "Off";
}

/** The webhook check's answer, shared by the route and the page. */
export type WebhookState = "ready" | "no_secret" | "not_registered" | "secret_mismatch" | "unconfirmed";

export type Blocker = { id: "setup" | "calendar" | "meet" | "webhook"; reason: string; fix: string };

/**
 * Why the booking switch is off, and the fix beside each reason. Turning
 * bookings OFF is never blocked, so a published page whose webhook later
 * vanished can still be unpublished. `webhookAck` is the owner's tick that
 * they confirmed the secret in Cal.com themselves; it clears only the
 * "unconfirmed" state, never a missing or mismatched one.
 */
export function bookingBlockers(input: {
  hasEventType: boolean; calendar: boolean; meet: boolean; webhook: WebhookState; webhookAck: boolean;
}): Blocker[] {
  const out: Blocker[] = [];
  if (!input.hasEventType) out.push({ id: "setup", reason: "The WDC meeting type has not been created.", fix: "Set up now" });
  if (!input.calendar) out.push({ id: "calendar", reason: "No calendar with a destination is connected in Cal.com.", fix: "Connect a calendar" });
  if (!input.meet) out.push({ id: "meet", reason: "Google Meet is not connected in Cal.com.", fix: "Connect Google Meet" });
  const hook = input.webhook;
  if (hook === "no_secret") out.push({ id: "webhook", reason: "The server has no CAL_WEBHOOK_SECRET, so it would reject every booking notice.", fix: "Add CAL_WEBHOOK_SECRET to the hosting environment and redeploy" });
  else if (hook === "not_registered") out.push({ id: "webhook", reason: "Cal.com has no active webhook pointing at /api/meetings/webhook with the five booking triggers.", fix: "Register the webhook in Cal.com" });
  else if (hook === "secret_mismatch") out.push({ id: "webhook", reason: "The webhook's secret in Cal.com is different from the server's CAL_WEBHOOK_SECRET.", fix: "Paste the server's secret into the Cal.com webhook" });
  else if (hook === "unconfirmed" && !input.webhookAck) out.push({ id: "webhook", reason: "We could not confirm the webhook secret: Cal.com did not show it to us.", fix: "Re-check" });
  return out;
}
