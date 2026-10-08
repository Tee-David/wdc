/**
 * A booking webhook, read into the few words a studio notice needs.
 *
 * Pure (no server-only), so it can be tested without a database or the booking
 * service. The body is signed (the route checks the signature first) but it is
 * still text from outside: every field is read defensively and cut short, and
 * the notice template escapes what is left.
 */
export type MeetingNotice = { kind: "booked" | "cancelled" | "rescheduled"; uid: string; title: string; who: string; email: string; when: string };

const KINDS: Record<string, MeetingNotice["kind"]> = {
  BOOKING_CREATED: "booked",
  BOOKING_CANCELLED: "cancelled",
  BOOKING_RESCHEDULED: "rescheduled",
};

const text = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** "Tue, 14 Oct 2026, 10:00 (WAT)": one reading, in the studio's zone, whatever the server's clock says. */
export function meetingTime(iso: unknown): string {
  const d = typeof iso === "string" ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return "A time was not given";
  const day = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" }).format(d);
  const hour = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Africa/Lagos" }).format(d);
  return `${day}, ${hour} (WAT)`;
}

export function parseMeetingNotice(body: unknown): MeetingNotice | null {
  const b = body as { triggerEvent?: unknown; payload?: Record<string, unknown> } | null;
  const kind = typeof b?.triggerEvent === "string" ? KINDS[b.triggerEvent] : undefined;
  const payload = b?.payload;
  const uid = text(payload?.uid, 100);
  if (!kind || !payload || !uid) return null;
  const guest = Array.isArray(payload.attendees) ? (payload.attendees[0] as { name?: unknown; email?: unknown } | undefined) : undefined;
  const email = text(guest?.email, 160);
  return {
    kind, uid,
    title: text(payload.title, 160) || text(payload.eventTitle, 160) || "A meeting",
    who: text(guest?.name, 120) || email || "Someone",
    email,
    when: meetingTime(payload.startTime),
  };
}
