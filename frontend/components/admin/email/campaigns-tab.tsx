import Link from "next/link";
import { Ban, Eye, LayoutTemplate, MailX, Mail, MousePointerClick, Send } from "lucide-react";
import { Empty, Tile, when } from "../bits";
import { FilterPick } from "../pick";
import { Pager, readPer } from "../pager";
import { NewCampaign } from "./campaign-ui";
import { listCampaigns, ratesFor, type Campaign, type Rates } from "@/lib/campaigns";
import "./campaigns.css";

/**
 * THE CAMPAIGNS TAB (the approved "Campaigns" design): a header, four figures counted from the sends, and a table
 * whose rows open the campaign. Every number is read from the sends table; where there is nothing to divide by, or
 * the campaign was not tracked per person, the cell says "–" instead of a rate that was never measured.
 */
export const CAMPAIGN_STATE: Record<string, { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "flat" }, scheduled: { label: "Scheduled", tone: "live" }, sending: { label: "Sending", tone: "brand" },
  paused: { label: "Paused", tone: "warn" }, sent: { label: "Sent", tone: "good" }, cancelled: { label: "Cancelled", tone: "" },
};
const FILTERS = ["draft", "scheduled", "sending", "paused", "sent", "cancelled"] as const;

type SP = { q?: string; status?: string; page?: string; per?: string };

function Rate({ n, of, label }: { n: number; of: number; label: string }) {
  if (!of) return <span className="ad__dim" aria-label={`${label}: not measured`}>–</span>;
  const pct = Math.round((n / of) * 100);
  return (
    <span className="adCp__rate">
      <i role="img" aria-label={`${label} ${pct}%`}><b style={{ width: `${pct}%` }} /></i>
      <span aria-hidden="true">{pct}%</span>
    </span>
  );
}

/** Opens can be counted for "full" and "anonymous"; clicks per person only for "full". */
const opensOf = (c: Campaign, r?: Rates) => (r && c.track !== "off" ? r.sent : 0);
const clicksOf = (c: Campaign, r?: Rates) => (r && c.track === "full" ? r.sent : 0);

export async function CampaignsTab({ sp }: { sp: SP }) {
  const list = await listCampaigns();
  if (!list) return <Empty title="Campaigns are not set up yet" icon={Mail}>Apply migration 0046 in Settings › System, then reload.</Empty>;
  return <CampaignsView list={list} rates={await ratesFor(list)} sp={sp} />;
}

/** The tab itself, from data already read: nothing here touches the database. */
export function CampaignsView({ list, rates, sp }: { list: Campaign[]; rates: Map<string, Rates> | null; sp: SP }) {

  const per = readPer(sp.per);
  const q = (sp.q ?? "").trim().toLowerCase().slice(0, 120);
  const status = (FILTERS as readonly string[]).includes(sp.status ?? "") ? (sp.status as string) : "";
  const shown = list.filter((c) => (!status || c.status === status) && (!q || `${c.title} ${c.design.subject}`.toLowerCase().includes(q)));
  const page = Math.min(Math.max(1, Number(sp.page) || 1), Math.max(1, Math.ceil(shown.length / per)));
  const rows = shown.slice((page - 1) * per, page * per);
  const filtered = Boolean(q || status);

  /* The four figures, over every campaign that has gone out. */
  let sent = 0, opened = 0, openOf = 0, clicked = 0, clickOf = 0, bounced = 0, went = 0;
  for (const c of list) {
    const r = rates?.get(c.id);
    if (!r || !r.sent) continue;
    went++; sent += r.sent; bounced += r.bounced;
    if (opensOf(c, r)) { opened += r.opened; openOf += r.sent; }
    if (clicksOf(c, r)) { clicked += r.clickers; clickOf += r.sent; }
  }
  const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : "–");
  const scheduled = list.filter((c) => c.status === "scheduled").length;

  const href = (patch: { page?: number; per?: number }) => {
    const u = new URLSearchParams({ tab: "campaigns" });
    if (q) u.set("q", q);
    if (status) u.set("status", status);
    const p = patch.per ?? per;
    if (p !== 25) u.set("per", String(p));
    if (patch.page && patch.page > 1) u.set("page", String(patch.page));
    return `/admin/email?${u}`;
  };

  return (
    <div className="ad__stack" data-tour="email-campaigns">
      <div className="adCp__head">
        <div>
          <h2>Campaigns</h2>
          <p className="ad__dim">{list.length} {list.length === 1 ? "campaign" : "campaigns"}{scheduled ? ` · ${scheduled} scheduled` : ""}. Only people who asked to hear from you are emailed.</p>
        </div>
        <div className="ad__row">
          <Link className="ad__btn" href="/admin/email?tab=templates"><LayoutTemplate aria-hidden="true" /> Templates</Link>
          <NewCampaign />
        </div>
      </div>

      <dl className="ad__tiles ad__tiles--4">
        <Tile label="Sent" value={sent ? sent.toLocaleString("en-NG") : "–"} icon={Send} iconTone="brand" note={went ? `People emailed, across ${went} ${went === 1 ? "campaign" : "campaigns"}` : "Nothing has gone out yet"} />
        <Tile label="Opened" value={pct(opened, openOf)} icon={Eye} iconTone="live" note="Approximate: mail apps load images early. A click counts as an open." />
        <Tile label="Clicked" value={pct(clicked, clickOf)} icon={MousePointerClick} iconTone="good" note="People who clicked, where clicks are tracked per person" />
        <Tile label="Bounced" value={sent ? bounced.toLocaleString("en-NG") : "–"} icon={MailX} iconTone="bad" tone={bounced ? "bad" : undefined} note="Reported back by the mail provider; never emailed again" />
      </dl>

      {list.length ? (
        <section className="ad__panel" aria-label="All campaigns">
          <form method="get" action="/admin/email" className="ad__filters" style={{ padding: ".9rem 1rem" }}>
            <input type="hidden" name="tab" value="campaigns" />
            <label className="ad__filterSearch">Search<input type="search" name="q" defaultValue={q} placeholder="A title or subject line" /></label>
            <FilterPick label="Status" name="status" defaultValue={status} placeholder="Any" options={FILTERS.map((value) => ({ value, label: CAMPAIGN_STATE[value].label }))} />
            <span className="ad__row"><button type="submit" className="ad__btn">Apply</button>{filtered ? <Link className="ad__btn" href="/admin/email?tab=campaigns">Clear</Link> : null}</span>
          </form>
          {rows.length ? (
            <div className="ad__scroll" data-lenis-prevent>
              <table className="ad__t adCp__t">
                <thead><tr><th>Campaign</th><th>Status</th><th className="num">People</th><th>Date</th><th>Opened</th><th>Clicked</th></tr></thead>
                <tbody>
                  {rows.map((c) => {
                    const r = rates?.get(c.id);
                    const st = CAMPAIGN_STATE[c.status] ?? { label: c.status, tone: "" };
                    return (
                      <tr key={c.id}>
                        <td><Link href={`/admin/email/campaigns/${c.id}`} className="adCp__name"><b>{c.title}</b><small>{c.design.subject}</small></Link></td>
                        <td><span className={`ad__pill${st.tone ? ` ad__pill--${st.tone}` : ""}`}>{st.label}</span></td>
                        <td className="num">{c.recipients ? c.recipients.toLocaleString("en-NG") : "–"}</td>
                        <td className="ad__dim">{c.startedAt ? when(c.startedAt) : c.scheduledAt ? `Goes out ${when(c.scheduledAt)}` : "Not sent"}</td>
                        <td><Rate n={r?.opened ?? 0} of={opensOf(c, r)} label="Opened" /></td>
                        <td><Rate n={r?.clickers ?? 0} of={clicksOf(c, r)} label="Clicked" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <Empty title="No campaigns match" icon={Ban} kind="no-results">Clear the search or the status to see them all.</Empty>}
          <Pager label="Campaigns" total={shown.length} page={page} per={per} noun="campaigns" href={href} />
        </section>
      ) : (
        <section className="ad__panel"><Empty title="No campaigns yet" icon={Send} action={<NewCampaign />}>Write an issue, choose who gets it, and send it. Only people who asked to hear from you are emailed.</Empty></section>
      )}
    </div>
  );
}
