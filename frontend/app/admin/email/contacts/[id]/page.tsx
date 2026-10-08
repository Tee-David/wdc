import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AreaGate from "@/components/admin/owner-only";
import { Panel, when } from "@/components/admin/bits";
import { MarketingForm, NoteForm } from "@/components/admin/email/contacts-ui";
import { eventsFor, getContact } from "@/lib/contacts";
import "@/components/admin/email/design-editor.css";

export const metadata = { title: "Contact" };

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await getContact(id);
  if (!c) notFound();
  const events = await eventsFor(id);
  return (
    <AreaGate area="settings" what="Email">
      <div className="ad__head">
        <div>
          <Link href="/admin/email?tab=contacts" className="ad__btn ad__btn--plain"><ArrowLeft aria-hidden="true" /> Contacts</Link>
          <h1>{c.name || c.email}</h1>
          <p>{c.email}{c.phone ? ` · ${c.phone}` : ""}</p>
        </div>
        {c.clientId ? <Link className="ad__btn" href={`/admin/clients/${c.clientId}`}>Open the client</Link> : null}
      </div>
      <div className="ad__stack">
        <Panel title="About them">
          <dl className="adForms__dl" style={{ padding: "1rem 1.25rem" }}>
            <div><dt>Type</dt><dd>{c.type}</dd></div>
            <div><dt>Status</dt><dd>{c.status}{c.unsubReason ? ` (${c.unsubReason})` : ""}</dd></div>
            <div><dt>Came from</dt><dd>{c.source || "–"}</dd></div>
            <div><dt>Asked to hear from us</dt><dd>{c.marketing && c.status === "subscribed" ? "Yes" : "No"}{c.consentAt ? `, ${when(c.consentAt)} (${c.consentSource ?? "recorded"})` : ""}</dd></div>
            <div><dt>Tags</dt><dd>{c.tags.length ? c.tags.join(", ") : "None"}</dd></div>
          </dl>
          <div style={{ padding: "0 1.25rem 1.25rem" }}><MarketingForm id={c.id} on={c.marketing} disabled={c.status !== "subscribed"} /></div>
        </Panel>
        <Panel title="Timeline">
          <div style={{ padding: "1rem 1.25rem", display: "grid", gap: "1rem" }}>
            <NoteForm id={c.id} />
            {events.length ? (
              <ul className="emTimeline">{events.map((e) => <li key={e.id}><b>{e.title}</b>{e.detail ? <span>{e.detail}</span> : null}<small>{when(e.at.toISOString())}{e.by ? ` · ${e.by}` : ""}</small></li>)}</ul>
            ) : <p className="ad__dim">Notes, and emails sent to them, appear here.</p>}
          </div>
        </Panel>
      </div>
    </AreaGate>
  );
}
