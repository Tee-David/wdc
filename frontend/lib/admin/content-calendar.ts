import type { ServiceRecord } from "@/lib/workspace/service-model";
import type { CalCalendar, CalEvent } from "@/components/admin/calendar/types";
import { studioStamp } from "@/components/admin/calendar/studio-time";

/**
 * A SOCIAL PROJECT'S CONTENT CALENDAR, read from its "Content calendar post" records (lib/workspace/service-model.ts,
 * kind "post"): the planned time is the date, the platform is the calendar, the state is the tag. A post with no
 * readable planned time is counted, not drawn. Nothing is invented: no post, no event.
 */
const MARKS: Record<string, { text: string; bg: string }> = {
  instagram: { text: "IG", bg: "#b8267a" }, facebook: { text: "FB", bg: "#1565c0" }, tiktok: { text: "TT", bg: "#111111" },
  linkedin: { text: "IN", bg: "#0a66c2" }, youtube: { text: "YT", bg: "#c62828" }, x: { text: "X", bg: "#111111" }, twitter: { text: "X", bg: "#111111" },
};
const COLOURS = ["var(--cal-1)", "var(--cal-2)", "var(--cal-3)", "var(--cal-4)", "var(--cal-5)", "var(--cal-6)", "var(--cal-7)"];
const STATE: Record<string, { text: string; tone: "good" | "warn" | "bad" | "flat" | "brand" }> = {
  draft: { text: "Draft", tone: "flat" }, internal_review: { text: "In review", tone: "flat" }, client_review: { text: "With client", tone: "warn" },
  approved: { text: "Approved", tone: "good" }, scheduled: { text: "Scheduled", tone: "brand" }, published: { text: "Published", tone: "good" }, failed: { text: "Failed", tone: "bad" },
};

/** "2026-10-13T12:30" (typed in studio time) or any instant with a zone, as a studio date and clock time. */
function planned(value: string): { date: string; time?: string } | null {
  const v = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return { date: v };
  const local = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(v);
  if (local) return { date: local[1], time: local[2] };
  const t = Date.parse(v);
  if (!Number.isFinite(t)) return null;
  const s = studioStamp(t);
  return { date: s.date, time: s.time };
}

export function postCalendar(records: ServiceRecord[], projectId: string) {
  const posts = records.filter((r) => r.kind === "post");
  const platforms = [...new Set(posts.map((r) => (r.data.platform || "Other").trim() || "Other"))];
  const cals: CalCalendar[] = platforms.map((p, i) => ({ id: p.toLowerCase(), label: p, color: COLOURS[i % COLOURS.length] }));
  let unplanned = 0;
  const events: CalEvent[] = [];
  for (const r of posts) {
    const when = planned(r.data.plannedAt || "");
    if (!when) { unplanned += 1; continue; }
    const platform = (r.data.platform || "Other").trim() || "Other";
    const key = platform.toLowerCase();
    const end = when.time ? studioStamp(Date.parse(`${when.date}T${when.time}:00.000Z`) + 90 * 60_000) : null;
    events.push({
      id: r.id, date: when.date, start: when.time, end: end && end.date === when.date ? end.time : undefined,
      title: r.title, sub: (r.data.caption || "").slice(0, 120), cal: key, href: `/admin/projects/${projectId}?tab=work`,
      mark: MARKS[key] ?? { text: platform.slice(0, 2).toUpperCase(), bg: "#5c5c7a" }, tag: STATE[r.state],
    });
  }
  return { cals, events, unplanned, total: posts.length };
}
