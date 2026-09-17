import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SERVICES } from "@/lib/services";
import {
  getClient, getDeliverablesFor, getExpensesFor, getInvoicesFor, getProject,
  getTasksFor, getUpdatesFor, projectMargin,
} from "@/lib/admin/store";
import {
  invoiceStatus, invoiceTotals, naira, projectAttention, STAGES,
} from "@/lib/admin/types";
import {
  AttentionPills, Empty, HealthPill, InvoicePill, Panel, StagePill, Tile, when,
} from "@/components/admin/bits";
import { InvoiceMenu } from "@/components/admin/row-actions";
import { AddNote, SetDue, StageMover } from "@/components/admin/project-forms";
import {
  Deliverables, ProjectDetails, Tasks, Updates,
} from "@/components/admin/delivery";
import { AddExpense, InvoiceBuilder } from "@/components/admin/money-forms";
import AuditLog from "@/components/admin/audit-log";
import PageTourButton from "@/components/admin/tour/page-tour-button";

/* NO generateStaticParams: projects are created at runtime now, and a route
   list frozen at build time would 404 on anything opened since. */

/* See the note beside the same function in clients/[id]/page.tsx: every
   detail route shared one generic tab title before this, and calling
   `notFound()` from here rather than only from the page body is the
   recommended way to get a missing id decided before anything streams. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = getProject(id);
  if (!p) notFound();
  return { title: `${p.title} · Project` };
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = getProject(id);
  if (!p) notFound();
  const client = getClient(p.clientId);
  const invoices = client ? getInvoicesFor(client.id).filter((i) => i.projectId === p.id) : [];
  const at = STAGES.indexOf(p.stage);
  const tasks = getTasksFor(p.id);
  const updates = getUpdatesFor(p.id);
  const deliverables = getDeliverablesFor(p.id);
  const attention = projectAttention(p, tasks);
  const margin = projectMargin(p.id);
  const costs = getExpensesFor(p.id);

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
            {p.owner ? <>{" · "}{p.owner}</> : null}
          </p>
          {/* WHAT IS WRONG WITH IT, said at the top rather than left for
              somebody to work out from four panels further down. Derived, so
              it cannot be stale -- see projectAttention(). */}
          <p className="ad__row" style={{ marginTop: ".45rem" }}>
            <HealthPill health={p.health} />
            <AttentionPills items={attention} except={p.health} />
          </p>
        </div>
        <div className="ad__row">
          <PageTourButton />
          <ProjectDetails project={p} />
          {client ? (
            <InvoiceBuilder clients={[client]} projects={[p]} clientId={client.id} />
          ) : null}
        </div>
      </div>

      {/* WHAT WAS AGREED, which is the thing an argument gets settled against
          and the thing nobody can ever find. Three facts, above the work. */}
      <section className="ad__panel" style={{ marginBottom: ".9rem" }}>
        <div className="ad__panelH"><h2>What was agreed</h2></div>
        <dl className="ad__facts">
          <div>
            <dt>Scope</dt>
            <dd>{p.scope || <span className="ad__dim">Not written down yet</span>}</dd>
          </div>
          <div>
            <dt>Budget</dt>
            <dd className="ad__num">
              {p.budget === null
                ? <span className="ad__dim">No figure agreed</span>
                : naira(p.budget)}
            </dd>
          </div>
          <div>
            <dt>Updates go through</dt>
            <dd>{p.channel}</dd>
          </div>
        </dl>
      </section>

      {/* THE STAGE TRACK. Six named steps, the current one lit, everything
          behind it filled. A client asking "where are we" is asking this
          question, and this is the answer in one glance. */}
      <section className="ad__panel" style={{ marginBottom: ".9rem" }} data-tour="proj-stage">
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

      <div style={{ display: "grid", gap: ".9rem", marginBottom: ".9rem" }}>
        <Tasks project={p} tasks={tasks} />
        <Updates project={p} updates={updates} />
        <Deliverables project={p} items={deliverables} />
      </div>

      {/* WHAT THIS JOB ACTUALLY MADE.

          Collected rather than invoiced, because an invoice nobody has paid is
          not income -- and a project that looks profitable on billings and is
          not on receipts is precisely the one worth knowing about. Every
          figure is derived from the invoices and the expenses filed against
          this project; nothing is stored, so nothing can go stale. */}
      <section className="ad__panel" style={{ marginBottom: ".9rem" }} data-tour="proj-margin">
        <div className="ad__panelH">
          <h2>What it has made</h2>
          <AddExpense projects={[p]} />
        </div>
        <dl className="ad__tiles" style={{ padding: ".9rem 1rem" }}>
          <Tile label="Invoiced" value={naira(margin.invoiced)} />
          <Tile label="Collected" value={naira(margin.collected)}
                tone={margin.collected ? "good" : undefined} />
          <Tile label="Spent on it" value={naira(margin.spend)}
                note={costs.length ? `${costs.length} expense${costs.length === 1 ? "" : "s"}` : "Nothing allocated"} />
          <Tile label="Net so far" value={naira(margin.net)}
                tone={margin.net >= 0 ? "good" : "bad"}
                note="Collected less what was spent" />
        </dl>
        {costs.length ? (
          <div className="ad__scroll">
            <table className="ad__t">
              <thead><tr><th>When</th><th>What</th><th>Who was paid</th><th className="num">Amount</th></tr></thead>
              <tbody>
                {costs.map((e) => (
                  <tr key={e.id}>
                    <td className="ad__dim ad__num">{when(e.at)}</td>
                    <td>
                      {e.description}
                      {e.rebillable ? (
                        <span className="ad__pill ad__pill--warn" style={{ marginLeft: ".35rem" }}>Rebillable</span>
                      ) : null}
                    </td>
                    <td className="ad__dim">{e.vendor ?? "–"}</td>
                    <td className="num">{naira(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: "0 1rem 1rem" }}>
            <p className="ad__dim" style={{ margin: 0 }}>
              Nothing has been booked against this project, so &ldquo;spent on
              it&rdquo; is zero rather than unknown. Studio overheads are
              deliberately not spread across jobs.
            </p>
          </div>
        )}
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
        {/* THE SYSTEMS RECORD, which the History panel above deliberately is
            not. History is a narrative for whoever opens this next week --
            "moved to Review, three routes sent". This is every write with its
            before and after, which is what gets read when somebody asks why a
            date says what it says. */}
        <AuditLog kind="project" subjectId={p.id} limit={20}
                  title="Changes to this project" />
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
