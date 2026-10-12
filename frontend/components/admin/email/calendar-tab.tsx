import { nowMs } from "@/lib/admin/when";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Empty, when } from "../bits";
import { Chips } from "../chips";
import { Pager, readPer } from "../pager";
import { listCampaigns } from "@/lib/campaigns";
import { postsForAdmin } from "@/lib/blog-db";

/**
 * THE CALENDAR TAB: everything marketing has booked or has just done, on one
 * dated list, soonest first. Sends (from the campaigns table: a scheduled one
 * by its send time, a sent one by when it started) and blog posts (a scheduled
 * one by its publish time). Automations have no dated runs, so they are not
 * here; they run from their own tab. A list, not a month grid: the list is the
 * answer to "what goes out next", and it is a table on every screen.
 */
type SP = { kind?: string; page?: string; per?: string };
type Ev = { id: string; kind: "email" | "blog"; name: string; sub: string; at: string; href: string; state: string; tone: string };

const KINDS = [["", "All"], ["email", "Email"], ["blog", "Blog"]] as const;

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
  const all = await calendarEvents();
  const kind = KINDS.find(([k]) => k && k === sp.kind)?.[0] ?? "";
  const per = readPer(sp.per);
  const now = nowMs();
  /* Upcoming first, soonest at the top; what already happened follows, newest first. */
  const upcoming = all.filter((e) => Date.parse(e.at) >= now).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const past = all.filter((e) => Date.parse(e.at) < now).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const shown = [...upcoming, ...past].filter((e) => !kind || e.kind === kind);
  const page = Math.min(Math.max(1, Number(sp.page) || 1), Math.max(1, Math.ceil(shown.length / per)));
  const rows = shown.slice((page - 1) * per, page * per);
  const href = (patch: { kind?: string; page?: number; per?: number }) => {
    const u = new URLSearchParams({ tab: "calendar" });
    const k = patch.kind ?? kind;
    if (k) u.set("kind", k);
    const p = patch.per ?? per;
    if (p !== 5) u.set("per", String(p));
    if (patch.page && patch.page > 1) u.set("page", String(patch.page));
    return `/admin/email?${u}`;
  };
  return (
    <section className="ad__panel" aria-label="Marketing calendar" data-tour="email-calendar">
      <div style={{ padding: "1rem 1.25rem .25rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.06rem" }}>Calendar</h2>
        <p className="ad__dim" style={{ margin: ".25rem 0 .5rem" }}>{upcoming.length ? `${upcoming.length} ${upcoming.length === 1 ? "item" : "items"} coming up.` : "Nothing is booked."} Scheduled sends and posts, then what went out lately.</p>
        <Chips label="Kind" current={kind} items={KINDS.map(([k, label]) => ({ key: k, label, href: href({ kind: k, page: 1 }), count: all.filter((e) => !k || e.kind === k).length }))} />
      </div>
      {rows.length ? (
        <div className="ad__scroll" data-lenis-prevent>
          <table className="ad__t">
            <thead><tr><th>What</th><th>Kind</th><th>State</th><th>Date</th></tr></thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td><Link href={e.href}><b>{e.name}</b></Link><small style={{ display: "block", color: "var(--ad-dim)" }}>{e.sub}</small></td>
                  <td><span className={`ad__pill ad__pill--${e.kind === "email" ? "brand" : "good"}`}>{e.kind === "email" ? "Email" : "Blog"}</span></td>
                  <td><span className={`ad__pill ad__pill--${e.tone}`}>{e.state}</span></td>
                  <td className="ad__dim">{when(e.at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title={all.length ? "Nothing of that kind" : "Nothing is scheduled"} icon={CalendarDays}>
          {all.length ? "Pick another kind to see the rest." : "Campaigns and blog posts show here once they have a date."}
        </Empty>
      )}
      {shown.length ? <Pager label="Calendar" total={shown.length} page={page} per={per} noun="items" href={(p) => href({ page: p.page, per: p.per })} /> : null}
    </section>
  );
}
