import type { Metadata } from "next";
import { hydrateSettings } from "@/lib/settings/store";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SERVICES } from "@/lib/services";
import {
  financeDefaults, getClient, getDeliverablesFor, getExpensesFor, getInvoicesFor, getProject,
  getTasksFor, getUpdatesFor, projectMargin,
} from "@/lib/admin/store";
import {
  invoiceStatus, invoiceTotals, naira, projectAttention, STAGES, nairaShort } from "@/lib/admin/types";
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
import { ProfileCard } from "@/components/admin/profile-card";
import { Building2, CalendarDays, Layers, MessageSquare, User } from "lucide-react";
import PageTourButton from "@/components/admin/tour/page-tour-button";
import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { persistSoon, syncStore } from "@/lib/admin/persist";

/* NO generateStaticParams: projects are created at runtime now, and a route
   list frozen at build time would 404 on anything opened since. */

/* See the note beside the same function in clients/[id]/page.tsx: every
   detail route shared one generic tab title before this, and calling
   `notFound()` from here rather than only from the page body is the
   recommended way to get a missing id decided before anything streams. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  await syncStore();
  const { id } = await params;
  const p = getProject(id);
  if (!p) notFound();
  return { title: `${p.title} · Project` };
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  await syncStore();
  persistSoon();
  const { id } = await params;
  const p = getProject(id);
  if (!p) notFound();
  await hydrateSettings();
  const finance = financeDefaults();
  /* Staff run the work and never see the money on it (lib/admin/permissions.ts). */
  const money = can(await adminRole(), "money");
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
      <ProfileCard
        crumbs={[
          { href: "/admin/projects", label: "Projects" },
          ...(client ? [{ href: `/admin/clients/${client.id}`, label: client.company }] : []),
        ]}
        title={p.title}
        pills={<>
          <StagePill stage={p.stage} />
          <HealthPill health={p.health} />
          {/* WHAT IS WRONG WITH IT, said at the top rather than left for
              somebody to work out from four panels further down. Derived, so
              it cannot be stale -- see projectAttention(). */}
          <AttentionPills items={attention} except={p.health} />
        </>}
        lines={<>
          {client ? <Link href={`/admin/clients/${client.id}`}><Building2 aria-hidden="true" />{client.company}</Link> : <span>Unknown client</span>}
          <span><Layers aria-hidden="true" />{SERVICES.find((x) => x.slug === p.service)?.short}</span>
          {p.owner ? <span><User aria-hidden="true" />{p.owner} is answerable</span> : null}
          <span><MessageSquare aria-hidden="true" />Updates go through {p.channel}</span>
          <span><CalendarDays aria-hidden="true" />{p.due ? `Due ${when(p.due)}` : "No due date yet"}</span>
        </>}
        actions={<>
          <PageTourButton />
          <ProjectDetails project={p} />
          {client && money ? (
            <InvoiceBuilder
              clients={[client]} projects={[p]} clientId={client.id}
              defaultVatRate={finance.vatRate} defaultDueInDays={finance.dueInDays}
            />
          ) : null}
        </>}
      >
        {/* THE STAGE TRACK. Six named steps, the current one lit, everything
            behind it filled. A client asking "where are we" is asking this
            question, and this is the answer in one glance. */}
        <div className="ad__stageTrack" data-tour="proj-stage">
          <ol aria-label={`Stage: ${p.stage}, ${at + 1} of ${STAGES.length}`}>
            {STAGES.map((st, n) => (
              <li key={st} className={n < at ? "is-done" : n === at ? "is-now" : undefined} aria-current={n === at ? "step" : undefined}>
                <span aria-hidden="true" />
                <small>{st}</small>
              </li>
            ))}
          </ol>
          <StageMover project={p} />
        </div>
      </ProfileCard>

      {/* WHAT THIS JOB ACTUALLY MADE.

          Collected rather than invoiced, because an invoice nobody has paid is
          not income -- and a project that looks profitable on billings and is
          not on receipts is precisely the one worth knowing about. Every
          figure is derived from the invoices and the expenses filed against
          this project; nothing is stored, so nothing can go stale. */}
      {money ? (
        <dl className="ad__tiles ad__tiles--5" data-tour="proj-margin">
          <Tile label="Agreed budget" value={p.budget === null ? "Not agreed" : nairaShort(p.budget)} />
          <Tile label="Invoiced" value={nairaShort(margin.invoiced)} />
          <Tile label="Collected" value={nairaShort(margin.collected)} tone={margin.collected ? "good" : undefined} />
          <Tile label="Spent on it" value={nairaShort(margin.spend)}
                note={costs.length ? `${costs.length} expense${costs.length === 1 ? "" : "s"}` : "Nothing allocated"} />
          <Tile label="Net so far" value={nairaShort(margin.net)} tone={margin.net >= 0 ? "good" : "bad"} note="Collected less spend" />
        </dl>
      ) : null}

      <div className="ad__split">
        <div className="ad__stack">
          <Updates project={p} updates={updates} />
          <Deliverables project={p} items={deliverables} />
          <Tasks project={p} tasks={tasks} />
          {money ? (
            <Panel title="Spent on it" action={<AddExpense projects={[p]} />}>
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
                <p className="ad__dim ad__panelNote">
                  Nothing has been booked against this project, so &ldquo;spent on
                  it&rdquo; is zero rather than unknown. Studio overheads are
                  deliberately not spread across jobs.
                </p>
              )}
            </Panel>
          ) : null}
        </div>

        <div className="ad__stack">
          {/* WHAT WAS AGREED, which is the thing an argument gets settled
              against and the thing nobody can ever find. */}
          <Panel title="What was agreed">
            <dl className="ad__facts ad__facts--stack">
              <div>
                <dt>Scope</dt>
                <dd>{p.scope || <span className="ad__dim">Not written down yet</span>}</dd>
              </div>
              {money ? <div>
                <dt>Budget</dt>
                <dd className="ad__num">{p.budget === null ? <span className="ad__dim">No figure agreed</span> : naira(p.budget)}</dd>
              </div> : null}
              <div>
                <dt>Updates go through</dt>
                <dd>{p.channel}</dd>
              </div>
            </dl>
          </Panel>
          <Panel title="Due date">
            <div className="ad__panelBody"><SetDue project={p} /></div>
          </Panel>
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

        {money ? <Panel title="Invoices">
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
        </Panel> : null}
        </div>
      </div>

      <div style={{ marginTop: "1.25rem" }}>
        {/* THE SYSTEMS RECORD, which the History panel deliberately is not.
            History is a narrative for whoever opens this next week -- "moved
            to Review, three routes sent". This is every write with its before
            and after, which is what gets read when somebody asks why a date
            says what it says. */}
        <AuditLog kind="project" subjectId={p.id} limit={20}
                  title="Changes to this project" />
      </div>
    </>
  );
}
