import Link from "next/link";
import { Download, Palette } from "lucide-react";
import AreaGate from "@/components/admin/owner-only";
import { Panel } from "@/components/admin/bits";
import { EMAIL_KINDS } from "@/lib/email-registry";
import { getSaved } from "@/lib/email-design-store";
import { allTags, listContacts, type Filters } from "@/lib/contacts";
import { Empty } from "@/components/admin/bits";
import { PickAll, RowPick } from "@/components/admin/bulk";
import { Pager, readPer } from "@/components/admin/pager";
import { FilterPick } from "@/components/admin/pick";
import { ImportContacts, SyncButton, TagBar } from "@/components/admin/email/contacts-ui";
import { NewCampaign } from "@/components/admin/email/campaign-ui";
import { listCampaigns } from "@/lib/campaigns";
import { when } from "@/components/admin/bits";
import "@/components/admin/email/design-editor.css";

export const metadata = { title: "Email" };

const TABS = [["contacts", "Contacts"], ["campaigns", "Campaigns"], ["templates", "Templates"]] as const;

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
      {current === "campaigns" ? <CampaignsTab /> : null}
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

const TYPE = { client: "Client", lead: "Lead", subscriber: "Subscriber" } as const;
const STATUS = { subscribed: "Subscribed", unsubscribed: "Unsubscribed", bounced: "Bounced", complained: "Complained" } as const;

async function ContactsTab({ sp }: { sp: SP }) {
  const per = readPer(sp.per);
  const f: Filters = { q: (sp.q ?? "").trim().slice(0, 120), tag: sp.tag ?? "", type: sp.type ?? "", status: sp.status ?? "", marketing: sp.marketing ?? "", page: Math.max(1, Number(sp.page) || 1), per };
  const [res, tags] = await Promise.all([listContacts(f), allTags()]);
  const href = (patch: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ tab: "contacts", q: f.q, tag: f.tag, type: f.type, status: f.status, marketing: f.marketing, per, ...patch })) if (v !== undefined && v !== "") u.set(k, String(v));
    return `/admin/email?${u}`;
  };
  if (!res) {
    return <Empty title="Contacts are not set up yet" icon={Download}>Apply migration 0045 in Settings › System, then reload.</Empty>;
  }
  const filtered = Boolean(f.q || f.tag || f.type || f.status || f.marketing);
  return (
    <>
      <Panel title={`${res.total} ${res.total === 1 ? "person" : "people"}`} dataTour="email-contacts"
        action={<span className="ad__row"><SyncButton /><ImportContacts /><a className="ad__btn" href={`/admin/email/contacts/export?${new URLSearchParams({ q: f.q, tag: f.tag, type: f.type, status: f.status, marketing: f.marketing })}`}><Download aria-hidden="true" /> CSV</a></span>}>
        <form method="get" action="/admin/email" className="ad__filters" style={{ padding: ".9rem 1rem" }}>
          <input type="hidden" name="tab" value="contacts" />
          <label className="ad__filterSearch">Search<input type="search" name="q" defaultValue={f.q} placeholder="A name, email or phone" /></label>
          <FilterPick label="Type" name="type" defaultValue={f.type} placeholder="Anyone" options={Object.entries(TYPE).map(([value, label]) => ({ value, label }))} />
          <FilterPick label="Status" name="status" defaultValue={f.status} placeholder="Any" options={Object.entries(STATUS).map(([value, label]) => ({ value, label }))} />
          <FilterPick label="Tag" name="tag" defaultValue={f.tag} placeholder="Any" search options={tags.map((t) => ({ value: t.tag, label: `${t.tag} (${t.n})` }))} />
          <FilterPick label="Campaigns" name="marketing" defaultValue={f.marketing} placeholder="Either" options={[{ value: "yes", label: "Asked to hear from us" }, { value: "no", label: "Not asked" }]} />
          <span className="ad__row"><button type="submit" className="ad__btn">Apply</button>{filtered ? <Link className="ad__btn ad__btn--plain" href="/admin/email?tab=contacts">Clear</Link> : null}</span>
        </form>
        <div style={{ padding: "0 1rem" }}><TagBar target="em-contacts" tags={tags.map((t) => t.tag)} /></div>
        {res.rows.length ? (
          <div id="em-contacts" className="ad__scroll" data-lenis-prevent>
            <table className="ad__t">
              <thead><tr><th><span className="adUsers__check"><PickAll label="Select everyone on this page" /> Person</span></th><th>Type</th><th>Status</th><th>Tags</th><th>Campaigns</th><th>Added</th></tr></thead>
              <tbody>
                {res.rows.map((c) => (
                  <tr key={c.id}>
                    <td><span className="ad__row" style={{ flexWrap: "nowrap" }}><RowPick id={c.id} label={c.email} /><span><Link href={`/admin/email/contacts/${c.id}`}><b>{c.name || c.email}</b></Link>{c.name ? <small style={{ display: "block", color: "var(--ad-dim)" }}>{c.email}</small> : null}</span></span></td>
                    <td>{TYPE[c.type]}</td>
                    <td><span className={`ad__pill ${c.status === "subscribed" ? "ad__pill--good" : "ad__pill--flat"}`}>{STATUS[c.status]}</span></td>
                    <td>{c.tags.length ? c.tags.slice(0, 4).join(", ") + (c.tags.length > 4 ? ` +${c.tags.length - 4}` : "") : <span className="ad__dim">–</span>}</td>
                    <td>{c.marketing && c.status === "subscribed" ? "Yes" : <span className="ad__dim">No</span>}</td>
                    <td className="ad__dim">{when(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title={filtered ? "No one matches" : "No contacts yet"}>{filtered ? "Clear a filter to see more." : "Press Update to bring in your clients, enquiries and newsletter, or import a list."}</Empty>
        )}
        <Pager label="Contacts" total={res.total} page={f.page} per={per} noun="people" href={(p) => href({ page: p.page && p.page > 1 ? p.page : undefined, per: p.per ?? per })} />
      </Panel>
    </>
  );
}

const CSTATE: Record<string, string> = { draft: "Draft", scheduled: "Scheduled", sending: "Sending", paused: "Paused", sent: "Sent", cancelled: "Cancelled" };

async function CampaignsTab() {
  const list = await listCampaigns();
  if (!list) return <Empty title="Campaigns are not set up yet" icon={Download}>Apply migration 0046 in Settings › System, then reload.</Empty>;
  return (
    <Panel title="Campaigns" dataTour="email-campaigns" action={<NewCampaign />}>
      {list.length ? (
        <div className="ad__scroll" data-lenis-prevent>
          <table className="ad__t">
            <thead><tr><th>Campaign</th><th>State</th><th className="num">People</th><th>Started</th></tr></thead>
            <tbody>{list.map((c) => (
              <tr key={c.id}>
                <td><Link href={`/admin/email/campaigns/${c.id}`}><b>{c.title}</b></Link></td>
                <td><span className={`ad__pill ${c.status === "sent" ? "ad__pill--good" : "ad__pill--flat"}`}>{CSTATE[c.status] ?? c.status}</span></td>
                <td className="num">{c.recipients || "–"}</td>
                <td className="ad__dim">{c.startedAt ? when(c.startedAt) : c.scheduledAt ? `Goes out ${when(c.scheduledAt)}` : "Not sent"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <Empty title="No campaigns yet" icon={Download} action={<NewCampaign />}>Write an issue, choose who gets it, and send it. Only people who asked to hear from you are emailed.</Empty>}
    </Panel>
  );
}
