import Link from "next/link";
import { notFound } from "next/navigation";
import { SERVICES } from "@/lib/services";
import {
  getClient, getInvoicesFor, getProjects, getProjectsFor, getSubmissions,
} from "@/lib/admin/store";
import { invoiceStatus, invoiceTotals, naira } from "@/lib/admin/types";
import { Empty, InvoicePill, Panel, StagePill, Tile, when } from "@/components/admin/bits";
import { InvoiceMenu, ProjectMenu } from "@/components/admin/row-actions";
import { EditClient } from "@/components/admin/client-form";
import { AddProject } from "@/components/admin/project-forms";
import { InvoiceBuilder } from "@/components/admin/money-forms";
import CommsLog from "@/components/admin/comms-log";
import CreditPanel from "@/components/admin/credit-panel";
import { ArchiveClient } from "@/components/admin/client-archive";

/* NO generateStaticParams. The client list is written to now, and a route
   prerendered from the list as it stood at build time would 404 on the client
   added a minute ago. The admin layout is force-dynamic for the same reason. */

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = getClient(id);
  if (!c) notFound();

  const projects = getProjectsFor(c.id);
  const invoices = getInvoicesFor(c.id);
  const forms = getSubmissions().filter((s) => s.clientId === c.id);
  const billed = invoices.filter((i) => i.status !== "Draft");
  const owed = billed.reduce((n, i) => n + invoiceTotals(i).due, 0);
  const paid = billed.reduce((n, i) => n + i.paid, 0);

  return (
    <>
      <div className="ad__head">
        <div>
          <p className="ad__dim"><Link href="/admin/clients">Clients</Link></p>
          <h1>{c.company}</h1>
          <p>
            {c.name} · <a href={`mailto:${c.email}`}>{c.email}</a> ·{" "}
            <a href={`tel:${c.phone.replace(/\s/g, "")}`}>{c.phone}</a>
          </p>
        </div>
        <div className="ad__row">
          <ArchiveClient client={c} />
          <EditClient client={c} />
          <AddProject clients={[c]} clientId={c.id} />
          <InvoiceBuilder
            clients={[c]}
            projects={getProjects().filter((p) => p.clientId === c.id)}
            clientId={c.id}
          />
        </div>
      </div>

      <dl className="ad__tiles">
        <Tile label="Paid to date" value={naira(paid)} tone="good" />
        <Tile label="Outstanding" value={naira(owed)} tone={owed ? "bad" : undefined} />
        <Tile label="Projects" value={String(projects.length)}
              note={`${projects.filter((p) => p.stage !== "Delivered").length} live`} />
        <Tile label="Client since" value={when(c.since)} note={c.sector} />
      </dl>

      <div className="ad__grid2">
        <div className="ad__stack">
          <Panel title="Projects">
            {projects.length ? (
              <div className="ad__scroll">
                <table className="ad__t">
                  <thead><tr><th>Project</th><th>Service</th><th>Stage</th><th>Due</th><th className="ad__rmH"><span className="ad__sr">Actions</span></th></tr></thead>
                  <tbody>
                    {projects.map((p) => (
                      <tr key={p.id}>
                        <td><Link href={`/admin/projects/${p.id}`}><b>{p.title}</b></Link></td>
                        <td>{SERVICES.find((x) => x.slug === p.service)?.short}</td>
                        <td><StagePill stage={p.stage} /></td>
                        <td className="num">{when(p.due)}</td>
                        <td className="ad__rmC">
                          <ProjectMenu project={p} clientName={c.company} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <Empty title="No projects yet" />}
          </Panel>

          <Panel title="Invoices">
            {invoices.length ? (
              <div className="ad__scroll">
                <table className="ad__t">
                  <thead><tr><th>Number</th><th>Status</th><th>Due</th><th className="num">Total</th><th className="num">Owed</th><th className="ad__rmH"><span className="ad__sr">Actions</span></th></tr></thead>
                  <tbody>
                    {invoices.map((i) => {
                      const t = invoiceTotals(i);
                      return (
                        <tr key={i.id}>
                          <td><Link href={`/admin/money/${i.id}`}><b>{i.number}</b></Link></td>
                          <td><InvoicePill status={invoiceStatus(i)} /></td>
                          <td className="num">{when(i.due)}</td>
                          <td className="num">{naira(t.total)}</td>
                          <td className="num">{t.due ? naira(t.due) : <span className="ad__dim">Nil</span>}</td>
                          <td className="ad__rmC"><InvoiceMenu invoice={i} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : <Empty title="Nothing invoiced yet" />}
          </Panel>
        </div>

        <div className="ad__stack">
          <Panel title="Buys">
            <div style={{ padding: ".8rem 1rem" }} className="ad__row">
              {c.services.map((s) => (
                <span key={s} className="ad__pill ad__pill--flat">
                  {SERVICES.find((x) => x.slug === s)?.short}
                </span>
              ))}
            </div>
          </Panel>

          <Panel title="Onboarding">
            {forms.length ? (
              <div style={{ padding: ".5rem 1rem .8rem" }}>
                {forms.map((f) => (
                  <div key={f.id} style={{ padding: ".4rem 0" }}>
                    <Link href={`/admin/forms/${f.id}`}>
                      <b>{SERVICES.find((x) => x.slug === f.service)?.short}</b>
                    </Link>
                    <small className="ad__dim">
                      {f.status === "Submitted" ? `Sent ${when(f.submittedAt)}` : "Still filling it in"}
                    </small>
                  </div>
                ))}
              </div>
            ) : <Empty title="No form yet" />}
          </Panel>

          {c.notes ? (
            <Panel title="Notes">
              <p style={{ padding: ".8rem 1rem", margin: 0 }}>{c.notes}</p>
            </Panel>
          ) : null}
        </div>
      </div>

      {/* WHAT WE OWE THEM, which is the other direction from everything above.
          Renders nothing at all for a client who has never had a balance,
          which is almost all of them. */}
      <div style={{ marginTop: ".9rem" }}>
        <CreditPanel clientId={c.id} />
      </div>

      {/* WHAT HAS BEEN SAID TO THEM, in one place and across every channel.
          The question "did anybody actually chase this" is asked about a
          client rather than about an invoice, and until now the only answer
          was somebody's memory. */}
      <div style={{ marginTop: ".9rem" }}>
        <CommsLog clientId={c.id} title="What we have sent them" />
      </div>
    </>
  );
}
