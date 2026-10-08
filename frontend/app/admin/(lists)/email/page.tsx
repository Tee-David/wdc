import { AutomationsTab } from "@/components/admin/email/automations-tab";
import { CampaignsTab } from "@/components/admin/email/campaigns-tab";
import Link from "next/link";
import { Ban, MailCheck, Palette, Users } from "lucide-react";
import AreaGate from "@/components/admin/owner-only";
import { Panel } from "@/components/admin/bits";
import { EMAIL_KINDS } from "@/lib/email-registry";
import { getSaved } from "@/lib/email-design-store";
import { allTags, contactStats, listContacts, openRate, opensFor, type Filters } from "@/lib/contacts";
import { Empty, Tile } from "@/components/admin/bits";
import { AdminState } from "@/components/admin/admin-state";
import { Pager, readPer } from "@/components/admin/pager";
import { ContactsView } from "@/components/admin/email/contacts-view";
import type { ContactRow } from "@/components/admin/email/contacts-sheets";
import { listCampaigns, reportFor } from "@/lib/campaigns";
import { db } from "@/lib/db/pool";
import "@/components/admin/email/design-editor.css";
import "@/components/admin/dashboard.css";

export const metadata = { title: "Email" };

const TABS = [["contacts", "Contacts"], ["campaigns", "Campaigns"], ["automations", "Automations"], ["templates", "Templates"], ["reports", "Reports"]] as const;

/**
 * EMAIL: the studio's mail in one place. Contacts, campaigns, automations and
 * reports join this page as they are built; today it holds the designs of the
 * emails the studio sends. Owner only.
 */
type SP = { tab?: string; q?: string; tag?: string; type?: string; status?: string; marketing?: string; page?: string; per?: string };

export default async function EmailPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const current = TABS.find(([k]) => k === sp.tab)?.[0] ?? "contacts";
  const saved = current === "templates" ? await Promise.all(EMAIL_KINDS.map((k) => getSaved(k.key))) : [];
  return (
    <AreaGate area="settings" what="Email">
      <div className="ad__head">
        <div>
          <h1>Email</h1>
          <p>Design the emails the studio sends, then switch each design on when you are happy with it.</p>
        </div>
      </div>
      <nav className="ad__tabsNav" aria-label="Email sections">
        {TABS.map(([k, label]) => <Link key={k} href={`/admin/email?tab=${k}`} aria-current={k === current ? "page" : undefined}>{label}</Link>)}
      </nav>
      {current === "contacts" ? <ContactsTab sp={sp} /> : null}
      {current === "campaigns" ? <CampaignsTab sp={sp} /> : null}
      {current === "automations" ? <AutomationsTab /> : null}
      {current === "reports" ? <ReportsTab /> : null}
      {current === "templates" ? <>
      <Panel title="Emails you can design" dataTour="email-templates">
        <div className="ad__scroll" data-lenis-prevent>
          <table className="ad__t">
            <thead><tr><th>Email</th><th>Sent to</th><th>Design</th><th className="ad__rmH"><span className="ad__sr">Actions</span></th></tr></thead>
            <tbody>
              {EMAIL_KINDS.map((k, i) => {
                const s = saved[i];
                return (
                  <tr key={k.key}>
                    <td><Link href={`/admin/email/templates/${k.key}`}><b>{k.name}</b></Link><small style={{ display: "block", color: "var(--ad-dim)" }}>{k.line}</small></td>
                    <td>{k.audience === "client" ? "Clients" : k.audience === "subscriber" ? "Subscribers" : "Visitors"}</td>
                    <td>{s ? <span className={`ad__pill ${s.enabled ? "ad__pill--good" : "ad__pill--flat"}`}>{s.enabled ? "Your design is on" : "Saved, switched off"}</span> : <span className="ad__pill ad__pill--flat">Built-in</span>}</td>
                    <td className="ad__rmC"><Link className="ad__btn" href={`/admin/email/templates/${k.key}`}><Palette aria-hidden="true" /> {s ? "Edit" : "Design"}</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      <p className="ad__dim" style={{ marginTop: ".9rem" }}>Invoices, receipts and reminders keep their built-in design for now, because they carry the money lines.</p>
      </> : null}
    </AreaGate>
  );
}

async function ContactsTab({ sp }: { sp: SP }) {
  const per = readPer(sp.per);
  const f: Filters = { q: (sp.q ?? "").trim().slice(0, 120), tag: sp.tag ?? "", type: sp.type ?? "", status: sp.status ?? "", marketing: sp.marketing ?? "", page: Math.max(1, Number(sp.page) || 1), per };
  const [res, tags, stats] = await Promise.all([listContacts(f), allTags(), contactStats()]);
  if (!res) {
    return <AdminState kind="error" title="Contacts are not set up yet" description="Apply migration 0045 in Settings › System, then reload." />;
  }
  const opens = await opensFor(res.rows.map((c) => c.id));
  const rows: ContactRow[] = res.rows.map((c) => ({
    id: c.id, name: c.name, email: c.email, phone: c.phone, type: c.type, status: c.status, marketing: c.marketing,
    source: c.source, tags: c.tags, createdAt: c.createdAt, opens: openRate(opens.get(c.id)),
  }));
  const href = (patch: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ tab: "contacts", q: f.q, tag: f.tag, type: f.type, status: f.status, marketing: f.marketing, per, ...patch })) if (v !== undefined && v !== "") u.set(k, String(v));
    return `/admin/email?${u}`;
  };
  const filtered = Boolean(f.q || f.tag || f.type || f.status || f.marketing);
  const share = stats.total ? Math.round((stats.canEmail / stats.total) * 100) : 0;
  return (
    <ContactsView
      rows={rows} total={res.total} stats={{ total: stats.total }} per={per} tags={tags} filtered={filtered}
      filters={{ q: f.q, type: f.type, status: f.status, tag: f.tag, marketing: f.marketing }}
      kpis={
        <dl className="ad__tiles ctTiles">
          <Tile label="Total contacts" value={String(stats.total)} note={`${stats.fresh} new this month`} icon={Users} />
          <Tile label="Can get marketing" value={String(stats.canEmail)} note={`${share}% of everyone`} icon={MailCheck} iconTone="good" href="/admin/email?tab=contacts&status=can-email" />
          <Tile label="Asked to stop" value={String(stats.stopped)} note="Never emailed again" icon={Ban} iconTone="bad" href="/admin/email?tab=contacts&status=stopped" />
        </dl>
      }
      pager={<Pager label="Contacts" total={res.total} page={f.page} per={per} noun="people" href={(p) => href({ page: p.page && p.page > 1 ? p.page : undefined, per: p.per ?? per })} />}
    />
  );
}

async function ReportsTab() {
  const campaigns = ((await listCampaigns()) ?? []).filter((c) => ["sent", "sending", "paused"].includes(c.status)).slice(0, 10);
  const reports = await Promise.all(campaigns.map((c) => reportFor(c)));
  const growth = await db.query<{ month: string; n: string }>(`SELECT to_char(created_at, 'YYYY-MM') AS month, count(*) AS n FROM contacts WHERE created_at > now() - INTERVAL '6 months' GROUP BY 1 ORDER BY 1`).then((r) => r.rows).catch(() => []);
  const status = await db.query<{ status: string; n: string }>(`SELECT status, count(*) AS n FROM contacts GROUP BY status`).then((r) => r.rows).catch(() => []);
  const asked = await db.query<{ n: string }>(`SELECT count(*) AS n FROM contacts WHERE marketing AND status = 'subscribed'`).then((r) => Number(r.rows[0].n)).catch(() => 0);
  const peak = Math.max(1, ...growth.map((g) => Number(g.n)));
  const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "–");
  return (
    <>
      <dl className="ad__tiles ad__tiles--4">
        <Tile label="Can get campaigns" value={String(asked)} note="Subscribed and asked to hear from us" />
        {["unsubscribed", "bounced", "complained"].map((st) => <Tile key={st} label={st[0].toUpperCase() + st.slice(1)} value={String(status.find((x) => x.status === st)?.n ?? 0)} note="Never emailed again" />)}
      </dl>
      <div className="adRep__grid">
        <Panel title="New contacts, last six months">
          {growth.length ? (
            <ul className="adRep__bars" aria-label="New contacts by month">
              {growth.map((g) => <li key={g.month}><span className="adRep__pair" role="img" aria-label={`${g.month}: ${g.n} new`}><i className="adRep__in" style={{ height: `${Math.max(4, (Number(g.n) / peak) * 100)}%` }} /></span><small>{g.month.slice(5)}</small></li>)}
            </ul>
          ) : <Empty title="No contacts yet">New people per month show here.</Empty>}
        </Panel>
      </div>
      <div style={{ marginTop: "1rem" }}>
        <Panel title="Campaigns">
          {campaigns.length ? (
            <div className="ad__scroll" data-lenis-prevent>
              <table className="ad__t">
                <thead><tr><th>Campaign</th><th className="num">Sent</th><th className="num">Clicked</th><th className="num">Opened (approx.)</th><th className="num">Unsubscribed</th><th className="num">Failed</th></tr></thead>
                <tbody>{campaigns.map((c, i) => { const r = reports[i]; return (
                  <tr key={c.id}><td><Link href={`/admin/email/campaigns/${c.id}`}><b>{c.title}</b></Link></td><td className="num">{r.sent}</td><td className="num">{pct(r.clickers, r.sent)}</td><td className="num">{pct(r.opened, r.sent)}</td><td className="num">{r.unsubscribed}</td><td className="num">{r.failed}</td></tr>
                ); })}</tbody>
              </table>
            </div>
          ) : <Empty title="No campaigns sent yet">Results appear here once one has gone out.</Empty>}
        </Panel>
      </div>
    </>
  );
}
