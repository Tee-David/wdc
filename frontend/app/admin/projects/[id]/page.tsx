import Link from "next/link";
import { notFound } from "next/navigation";
import { SERVICES } from "@/lib/services";
import { getClient, getInvoicesFor, getProject } from "@/lib/admin/store";
import { invoiceStatus, invoiceTotals, naira, STAGES } from "@/lib/admin/types";
import { Empty, InvoicePill, Panel, StagePill, when } from "@/components/admin/bits";
import { InvoiceMenu } from "@/components/admin/row-actions";
import { AddNote, SetDue, StageMover } from "@/components/admin/project-forms";
import { InvoiceBuilder } from "@/components/admin/money-forms";

/* NO generateStaticParams: projects are created at runtime now, and a route
   list frozen at build time would 404 on anything opened since. */

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = getProject(id);
  if (!p) notFound();
  const client = getClient(p.clientId);
  const invoices = client ? getInvoicesFor(client.id).filter((i) => i.projectId === p.id) : [];
  const at = STAGES.indexOf(p.stage);

  return (
    <>
      <div className="ad__head">
        <div>
          <p className="ad__dim"><Link href="/admin/projects">Projects</Link></p>
          <h1>{p.title}</h1>
          <p>
            {client ? <Link href={`/admin/clients/${client.id}`}>{client.company}</Link> : "Unknown client"}
            {" · "}{SERVICES.find((x) => x.slug === p.service)?.short}
            {" · "}due {when(p.due)}
          </p>
        </div>
        {client ? (
          <InvoiceBuilder clients={[client]} projects={[p]} clientId={client.id} />
        ) : null}
      </div>

      {/* THE STAGE TRACK. Six named steps, the current one lit, everything
          behind it filled. A client asking "where are we" is asking this
          question, and this is the answer in one glance. */}
      <section className="ad__panel" style={{ marginBottom: ".9rem" }}>
        <div className="ad__panelH"><h2>Where it is</h2><StagePill stage={p.stage} /></div>
        <ol style={{ display: "grid", gridTemplateColumns: `repeat(${STAGES.length}, 1fr)`, gap: ".35rem", listStyle: "none", margin: 0, padding: ".9rem 1rem" }}>
          {STAGES.map((st, n) => (
            <li key={st}>
              <span style={{
                display: "block", height: "4px", borderRadius: "3px",
                background: n <= at ? "var(--ad-accent)" : "var(--ad-line)",
              }} />
              <small style={{
                display: "block", marginTop: ".35rem", fontSize: ".7rem",
                color: n === at ? "var(--ad-ink)" : "var(--ad-dim)",
                fontWeight: n === at ? 700 : 500,
              }}>{st}</small>
            </li>
          ))}
        </ol>
        <div style={{ padding: "0 1rem 1rem" }}>
          <StageMover project={p} />
        </div>
      </section>

      <div className="ad__grid2">
        <Panel title="History">
          {/* APPEND-ONLY, newest first. A project's history is evidence: it is
              what answers "when did we send that" three months later. */}
          {p.events.length ? (
            <ol style={{ listStyle: "none", margin: 0, padding: ".8rem 1rem" }}>
              {p.events.slice().reverse().map((e, n) => (
                <li key={n} style={{ display: "flex", gap: ".8rem", padding: ".45rem 0" }}>
                  <span className="ad__dim ad__num" style={{ minWidth: "6.5rem" }}>{when(e.at)}</span>
                  <span>{e.text}</span>
                </li>
              ))}
            </ol>
          ) : <Empty title="Nothing recorded yet" />}
          <div style={{ padding: ".2rem 1rem 1rem", borderTop: "1px solid var(--ad-line)" }}>
            <AddNote project={p} />
          </div>
        </Panel>

        <Panel title="Invoices">
          {invoices.length ? (
            <div className="ad__scroll">
              <table className="ad__t">
                <thead><tr><th>Number</th><th>Status</th><th className="num">Owed</th><th className="ad__rmH"><span className="ad__sr">Actions</span></th></tr></thead>
                <tbody>
                  {invoices.map((i) => (
                    <tr key={i.id}>
                      <td><Link href={`/admin/money/${i.id}`}><b>{i.number}</b></Link></td>
                      <td><InvoicePill status={invoiceStatus(i)} /></td>
                      <td className="num">{naira(invoiceTotals(i).due)}</td>
                      <td className="ad__rmC"><InvoiceMenu invoice={i} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty title="Nothing invoiced against this" />}
        </Panel>
      </div>

      <div style={{ marginTop: ".9rem" }}>
        <Panel title="Due date">
          <div style={{ padding: ".9rem 1rem" }}>
            <SetDue project={p} />
          </div>
        </Panel>
      </div>
    </>
  );
}
