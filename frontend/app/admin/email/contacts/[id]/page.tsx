import { notFound } from "next/navigation";
import Link from "next/link";
import AreaGate from "@/components/admin/owner-only";
import { when } from "@/components/admin/bits";
import { PageHead } from "@/components/admin/page-head";
import { RailCard, Workbench } from "@/components/admin/workbench";
import { initialsOf } from "@/components/admin/focus";
import { MarketingForm, NoteForm } from "@/components/admin/email/contacts-ui";
import { eventsFor, getContact } from "@/lib/contacts";
import "@/components/admin/email/design-editor.css";

export const metadata = { title: "Contact" };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** One marketing contact: what happened with them in the work column, who they are and what they agreed to in the rail. */
export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await getContact(id);
  if (!c) notFound();
  const events = await eventsFor(id);
  const hears = c.marketing && c.status === "subscribed";
  return (
    <AreaGate area="settings" what="Email">
      <PageHead title={c.name || c.email} mark={initialsOf({ name: c.name || c.email }, "client")} markTone="live"
        crumbs={[{ href: "/admin/email?tab=contacts", label: "Marketing" }]}
        lede={<>{c.email}{c.phone ? ` · ${c.phone}` : ""} · <strong>{hears ? "Hears from us" : "Does not get marketing"}</strong></>}
        action={c.clientId ? <Link className="ad__btn" href={`/admin/clients/${c.clientId}`}>Open the client</Link> : undefined} />
      <Workbench railLabel="About them" rail={
        <RailCard title="About them">
          <dl className="adForms__dl emContact__dl">
            <div><dt>Type</dt><dd>{cap(c.type)}</dd></div>
            <div><dt>Status</dt><dd>{cap(c.status)}{c.unsubReason ? ` (${c.unsubReason})` : ""}</dd></div>
            <div><dt>Came from</dt><dd>{c.source || "Not recorded"}</dd></div>
            <div><dt>Asked to hear from us</dt><dd>{hears ? "Yes" : "No"}{c.consentAt ? `, ${when(c.consentAt)} (${c.consentSource ?? "recorded"})` : ""}</dd></div>
            <div><dt>Tags</dt><dd>{c.tags.length ? c.tags.join(", ") : "None"}</dd></div>
          </dl>
          <MarketingForm id={c.id} on={c.marketing} disabled={c.status !== "subscribed"} />
        </RailCard>
      }>
        <section className="adList" aria-label="Timeline">
          <div className="adList__hd"><h2>Timeline</h2><span className="adList__n">{events.length}</span></div>
          <div className="emContact__body">
            <NoteForm id={c.id} />
            {events.length ? (
              <ul className="emTimeline">{events.map((e) => <li key={e.id}><b>{e.title}</b>{e.detail ? <span>{e.detail}</span> : null}<small>{when(e.at.toISOString())}{e.by ? ` · ${e.by}` : ""}</small></li>)}</ul>
            ) : <p className="ad__dim">Notes, and emails sent to them, appear here.</p>}
          </div>
        </section>
      </Workbench>
    </AreaGate>
  );
}
