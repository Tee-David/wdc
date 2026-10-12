import { nowMs } from "@/lib/admin/when";
import { Calendar } from "../calendar/calendar";
import { studioStamp } from "../calendar/studio-time";
import type { CalEvent } from "../calendar/types";
import { listCampaigns } from "@/lib/campaigns";
import { postsForAdmin } from "@/lib/blog-db";

/**
 * THE CALENDAR TAB: everything marketing has booked or has just done, on one
 * dated list, soonest first. Sends (from the campaigns table: a scheduled one
 * by its send time, a sent one by when it started) and blog posts (a scheduled
 * one by its publish time). Automations have no dated runs, so they are not
 * here; they run from their own tab. A list, not a month grid: the list is the
 * answer to "what goes out next". Shown on the shared calendar engine: Email and Blog are its two calendars,
 * a send is timed, and a blog post with a publish time sits on its day.
 */
type SP = { kind?: string; page?: string; per?: string };
type Ev = { id: string; kind: "email" | "blog"; name: string; sub: string; at: string; href: string; state: string; tone: string };

export async function calendarEvents(): Promise<Ev[]> {
  const [camps, posts] = await Promise.all([listCampaigns().catch(() => null), postsForAdmin(200).catch(() => [])]);
  const out: Ev[] = [];
  for (const c of camps ?? []) {
    if (c.status === "scheduled" && c.scheduledAt) out.push({ id: `c-${c.id}`, kind: "email", name: c.title, sub: c.design.subject, at: c.scheduledAt, href: `/admin/email/campaigns/${c.id}`, state: "Scheduled", tone: "brand" });
    else if (c.startedAt && ["sent", "sending", "paused"].includes(c.status)) out.push({ id: `c-${c.id}`, kind: "email", name: c.title, sub: `Sent to ${c.recipients.toLocaleString("en-NG")} people`, at: c.startedAt, href: `/admin/email/campaigns/${c.id}`, state: c.status === "sent" ? "Sent" : "Sending", tone: c.status === "sent" ? "good" : "live" });
  }
  for (const p of posts) {
    if (p.scheduled && p.date) out.push({ id: `p-${p.id}`, kind: "blog", name: p.title, sub: `Blog post · ${p.topic}`, at: p.date, href: `/admin/blog/${p.id}`, state: "Scheduled", tone: "brand" });
  }
  return out;
}

export async function CalendarTab({ sp }: { sp: SP }) {
  void sp;
  const all = await calendarEvents();
  const now = studioStamp(nowMs());
  const events: CalEvent[] = all.map((e) => {
    const s = studioStamp(e.at);
    return {
      id: e.id, date: s.date, start: s.time, title: e.name, sub: e.sub, cal: e.kind, href: e.href,
      tag: { text: e.state, tone: e.tone === "good" ? "good" : e.tone === "live" ? "live" : "brand" },
    };
  });
  return (
    <section className="ad__panel" aria-label="Marketing calendar" data-tour="email-calendar" style={{ overflow: "hidden" }}>
      <Calendar
        id="marketing" today={now.date} now={now.time} events={events} dataTour="email-calendar-grid"
        cals={[{ id: "email", label: "Email", color: "var(--cal-1)" }, { id: "blog", label: "Blog", color: "var(--cal-3)" }]}
        add={{ label: "New campaign", href: "/admin/email?tab=campaigns" }} exportName="Marketing calendar"
        emptyNote="Nothing is scheduled in this view. Campaigns and blog posts show here once they have a date."
      />
    </section>
  );
}
