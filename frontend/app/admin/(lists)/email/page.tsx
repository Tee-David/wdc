import { AutomationsTab } from "@/components/admin/email/automations-tab";
import { CampaignsView, campaignPulse, opensOf } from "@/components/admin/email/campaigns-tab";
import { CalendarTab } from "@/components/admin/email/calendar-tab";
import { NewCampaign } from "@/components/admin/email/campaign-ui";
import Link from "next/link";
import { AlertTriangle, Ban, BarChart3, Eye, MailCheck, Palette, Play, Users } from "lucide-react";
import AreaGate from "@/components/admin/owner-only";
import { Panel, when } from "@/components/admin/bits";
import { PageHead } from "@/components/admin/page-head";
import { ChoresMenu } from "@/components/admin/chores-menu";
import { Deck, type DeckItem } from "@/components/admin/deck";
import { Tabs } from "@/components/admin/tabs";
import { RailCard, RailHead, StatTiles, Workbench } from "@/components/admin/workbench";
import { RailRows } from "@/components/admin/rail-list";
import { listAutomations } from "@/lib/automations";
import { countSteps } from "@/lib/automations-flow";
import { EMAIL_KINDS } from "@/lib/email-registry";
import { getSaved } from "@/lib/email-design-store";
import { contactStats, listContacts, openRate, opensFor, type Filters } from "@/lib/contacts";
import { Empty, Tile } from "@/components/admin/bits";
import { AdminState } from "@/components/admin/admin-state";
import { Pager, readPer } from "@/components/admin/pager";
import { ContactsView } from "@/components/admin/email/contacts-view";
import type { ContactRow } from "@/components/admin/email/contacts-sheets";
import { listCampaigns, ratesFor, reportFor } from "@/lib/campaigns";
import { db } from "@/lib/db/pool";
import "@/components/admin/email/design-editor.css";
import "@/components/admin/dashboard.css";

export const metadata = { title: "Marketing" };

const TABS = [["campaigns", "Campaigns"], ["calendar", "Calendar"], ["automations", "Automations"], ["templates", "Templates"], ["contacts", "Contacts"], ["reports", "Reports"]] as const;

/**
 * MARKETING: what email needs this week (the deck), then the work in six
 * tabs (campaigns, calendar, automations, templates, contacts, reports), with
 * the pulse of the list and what is running in the rail. Everything is read
 * from the campaigns, contacts and automations tables; where a table is not
 * set up yet the tab says so and the rest still draws. Owner only.
 */
type SP = { tab?: string; q?: string; tag?: string; type?: string; status?: string; marketing?: string; page?: string; per?: string; kind?: string };

export default async function EmailPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const current = TABS.find(([k]) => k === sp.tab)?.[0] ?? "campaigns";
  const [camps, stats, autos, bounced] = await Promise.all([
    listCampaigns().catch(() => null),
    contactStats(),
    listAutomations().catch(() => null),
    listContacts({ q: "", tag: "", type: "", status: "bounced", marketing: "", page: 1, per: 1 }).catch(() => null),
  ]);
  const rates = camps ? await ratesFor(camps).catch(() => null) : null;
  const pulse = campaignPulse(camps ?? [], rates);
  const saved = current === "templates" ? await Promise.all(EMAIL_KINDS.map((k) => getSaved(k.key))) : [];
  const bounces = bounced?.total ?? 0;
  const running = (autos ?? []).filter((a) => a.enabled);
  const notOn = (autos ?? []).filter((a) => !a.enabled);
  const oldestDraft = [...(camps ?? [])].filter((c) => c.status === "draft").sort((x, y) => Date.parse(x.createdAt) - Date.parse(y.createdAt))[0];
  const nextOut = [...(camps ?? [])].filter((c) => c.status === "scheduled" && c.scheduledAt).sort((x, y) => Date.parse(x.scheduledAt!) - Date.parse(y.scheduledAt!))[0];

  /* WHAT NEEDS YOU: a bounce first (it hurts every later send), then the
     oldest draft, then an automation that is not on. */
  const deckItems: DeckItem[] = [];
  if (bounces) deckItems.push({
    id: "bounces", kind: "Clean up", tone: "warn", urgency: `${bounces} ${bounces === 1 ? "bounce" : "bounces"}`, label: "Contacts",
    title: bounces === 1 ? "One address bounced" : `${bounces} addresses bounced`,
    body: "Mail to these addresses did not arrive. They are removed from every send for you; look at who they are and ask for a new address.",
    facts: [{ k: "Effect", v: "Removed from lists" }],
    why: "Bounces above 2% push every email you send towards spam.",
    primary: { label: "Open the contacts", href: "/admin/email?tab=contacts&status=bounced" },
  });
  if (oldestDraft) deckItems.push({
    id: `draft-${oldestDraft.id}`, kind: "Draft", tone: "neutral", urgency: `Started ${when(oldestDraft.createdAt)}`, label: "Campaigns",
    title: `Finish “${oldestDraft.title}”`, body: oldestDraft.design.subject ? `Subject: ${oldestDraft.design.subject}` : "It has no subject line yet.",
    facts: [{ k: "Status", v: "Draft" }],
    why: "A draft sends nothing. Choose who gets it, then send or schedule it.",
    primary: { label: "Open the campaign", href: `/admin/email/campaigns/${oldestDraft.id}` },
  });
  if (notOn[0]) deckItems.push({
    id: `auto-${notOn[0].id}`, kind: "Stopped", tone: "neutral", urgency: notOn[0].enabledAt ? "Switched off" : "Not published", label: "Automations",
    title: `“${notOn[0].name}” is not running`, body: notOn[0].enabledAt ? "It was switched off, so nobody new enters it." : "It is a draft, so it has never run.",
    facts: [{ k: "Starts when", v: notOn[0].triggerKind === "tag_added" ? `Tag “${notOn[0].triggerValue}” is added` : "Someone becomes a contact" }],
    why: "An automation only helps once it is on.",
    primary: { label: "Open the flow", href: `/admin/email/automations/${notOn[0].id}` },
  });

  const best = [...(camps ?? [])].filter((c) => c.status === "sent").map((c) => ({ c, r: rates?.get(c.id) })).filter((x) => x.r && x.r.sent && opensOf(x.c, x.r)).sort((x, y) => y.r!.opened / y.r!.sent - x.r!.opened / x.r!.sent).slice(0, 3);
  const lede = <>
    {camps ? `${pulse.sentCount} sent, ${pulse.scheduled} scheduled, ${pulse.drafts} in draft.` : "Campaigns are not set up yet."}{" "}
    {pulse.openRate !== null ? <strong>Open rate is {pulse.openRate}%.</strong> : nextOut ? <strong>Next goes out {when(nextOut.scheduledAt)}.</strong> : null}
  </>;

  return (
    <AreaGate area="settings" what="Marketing">
      <PageHead
        title="Marketing"
        lede={lede}
        action={<NewCampaign />}
        chores={<ChoresMenu label="marketing, more" items={[
          { label: "Add or import contacts", href: "/admin/email?tab=contacts", icon: "upload" },
          { label: "Email templates", href: "/admin/email?tab=templates", icon: "layers" },
          { label: "Email settings", href: "/admin/settings/email", icon: "settings" },
          { label: "Email log", href: "/admin/settings/email/log", icon: "mail" },
        ]} />}
      />
      <Workbench
        railLabel="Email pulse"
        rail={<>
          <RailHead title="Email pulse" />
          <StatTiles items={[
            { label: "Can get campaigns", value: String(stats.canEmail), note: `${stats.total} ${stats.total === 1 ? "contact" : "contacts"} in all`, icon: Users, tone: "brand", href: "/admin/email?tab=contacts&status=can-email" },
            { label: "Open rate", value: pulse.openRate === null ? "–" : `${pulse.openRate}%`, note: pulse.openRate === null ? "Nothing measured yet" : "Approximate: mail apps load images early", noteTone: undefined, icon: Eye, tone: "good", href: "/admin/email?tab=reports" },
            { label: "Asked to stop", value: String(stats.stopped), note: "Never emailed again", icon: Ban, tone: "neutral", href: "/admin/email?tab=contacts&status=stopped" },
            { label: "Bounced", value: String(bounces), note: bounces ? "Removed from sends" : "Nothing bounced", noteTone: bounces ? "accent" : undefined, icon: AlertTriangle, tone: bounces ? "live" : "good", href: "/admin/email?tab=contacts&status=bounced" },
          ]} />
          <RailCard title="Running now" aside="Automations" link={{ href: "/admin/email?tab=automations", label: "All" }}>
            <RailRows empty={autos ? "No automation is on yet." : "Automations are not set up yet."} rows={running.slice(0, 3).map((a) => ({ key: a.id, title: a.name, sub: `${countSteps(a.steps)} ${countSteps(a.steps) === 1 ? "step" : "steps"} · ${a.triggerKind === "tag_added" ? `tag “${a.triggerValue}”` : "new contact"}`, icon: Play, tone: "good" as const, href: `/admin/email/automations/${a.id}` }))} />
          </RailCard>
          <RailCard title="Best campaigns" aside="By opens" link={{ href: "/admin/email?tab=reports", label: "Reports" }}>
            <RailRows empty="Results show here once a campaign has been sent." rows={best.map(({ c, r }) => ({ key: c.id, title: c.title, sub: `${Math.round((r!.opened / r!.sent) * 100)}% opened · ${r!.sent} sent`, icon: BarChart3, href: `/admin/email/campaigns/${c.id}` }))} />
          </RailCard>
        </>}
      >
        <Deck id="email" title="Email this week" items={deckItems}
          emptyTitle="Email is on track."
          emptyBody="Nothing is waiting on you: no bounces, no stuck drafts, every automation is on."
          emptyNext={nextOut ? { label: `Next goes out ${when(nextOut.scheduledAt)}`, href: `/admin/email/campaigns/${nextOut.id}` } : { label: "New campaign", href: "/admin/email?tab=campaigns" }} />

        <Tabs label="Marketing" current={current} items={[
          { key: "campaigns", label: "Campaigns", href: "/admin/email?tab=campaigns", count: camps?.length ?? 0 },
          { key: "calendar", label: "Calendar", href: "/admin/email?tab=calendar", count: pulse.scheduled },
          { key: "automations", label: "Automations", href: "/admin/email?tab=automations", count: autos?.length ?? 0, tone: notOn.length ? "warn" : undefined },
          { key: "templates", label: "Templates", href: "/admin/email?tab=templates", count: EMAIL_KINDS.length },
          { key: "contacts", label: "Contacts", href: "/admin/email?tab=contacts", count: stats.total, tone: bounces ? "warn" : undefined },
          { key: "reports", label: "Reports", href: "/admin/email?tab=reports" },
        ]} />
        <div className="ad__stack">
      {current === "contacts" ? <ContactsTab sp={sp} /> : null}
      {current === "campaigns" ? <CampaignsView list={camps ?? []} rates={rates} sp={sp} unavailable={!camps} /> : null}
      {current === "calendar" ? <CalendarTab sp={sp} /> : null}
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
        </div>
      </Workbench>
    </AreaGate>
  );
}

async function ContactsTab({ sp }: { sp: SP }) {
  const per = readPer(sp.per);
  const f: Filters = { q: (sp.q ?? "").trim().slice(0, 120), tag: sp.tag ?? "", type: sp.type ?? "", status: sp.status ?? "", marketing: sp.marketing ?? "", page: Math.max(1, Number(sp.page) || 1), per };
  const [res, stats] = await Promise.all([listContacts(f), contactStats()]);
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
      rows={rows} total={res.total} stats={{ total: stats.total }} per={per} filtered={filtered}
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
