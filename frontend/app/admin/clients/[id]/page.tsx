import CurrencyBalances from "@/components/money/currency-balances";
import {moneySummary} from "@/lib/money/summary";
import {currencyOf,money as formatMoney} from "@/lib/money/currency";
import type { Metadata } from "next";
import { hydrateSettings } from "@/lib/settings/store";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SERVICES } from "@/lib/services";
import {
  creditBalance, financeDefaults, findDuplicateClient, getClient, getClients, getCreditsFor, getDeliverablesFor, getInvoicesFor, getPaymentsFor, getProjects, getProjectsFor, getSubmissions,
} from "@/lib/admin/store";
import { noticeBlock, reconcileClient } from "@/lib/admin/money-rules";
import ClientReconciliation from "@/components/admin/reconciliation";
import { invoiceStatus, invoiceTotals, paymentNet, paymentState } from "@/lib/admin/types";
import { ApprovalPill, Empty, InvoicePill, Panel, StagePill, when } from "@/components/admin/bits";
import { InvoiceMenu, ProjectMenu } from "@/components/admin/row-actions";
import { EditClient, MergeClient } from "@/components/admin/client-form";
import { AddProject } from "@/components/admin/project-forms";
import { InvoiceBuilder, RecordAnyPayment } from "@/components/admin/money-forms";
import CommsLog from "@/components/admin/comms-log";
import CreditPanel from "@/components/admin/credit-panel";
import TicketPanel from "@/components/admin/ticket-panel";
import { listDepartments } from "@/lib/departments";
import { ClientDepartments } from "@/components/admin/departments";
import { ArchiveClient } from "@/components/admin/client-archive";
import AuditLog from "@/components/admin/audit-log";
import PortalAccess from "@/components/admin/portal-access";
import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import PageTourButton from "@/components/admin/tour/page-tour-button";
import { ProfileCard } from "@/components/admin/profile-card";
import { CopyText } from "@/components/admin/copy-text";
import { SITE_URL } from "@/lib/site";
import { Mail, Phone, Tag, User } from "lucide-react";
import { persistSoon, syncStore } from "@/lib/admin/persist";

/* NO generateStaticParams. The client list is written to now, and a route
   prerendered from the list as it stood at build time would 404 on the client
   added a minute ago. The admin layout is force-dynamic for the same reason. */

/* EVERY DETAIL PAGE ON THIS SITE HAD THE SAME TAB TITLE: the layout's own
   default, "Admin | We Dig Creativity", because none of the four dynamic
   admin routes set their own. Five clients open in five tabs were five
   identical tabs -- the one thing a tab title exists to prevent.
   `notFound()` is called here as well as in the body so a missing client
   gets the not-found title too. It is NOT what makes the status a 404: that
   was the loading boundary above this page, which streamed a 200 first, and
   it moved into `app/admin/(lists)` for exactly that reason. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  await syncStore();
  const { id } = await params;
  const c = getClient(id);
  if (!c) notFound();
  return { title: `${c.company} · Client` };
}

export default async function ClientPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ act?: string }> }) {
  await syncStore();
  persistSoon();
  const { id } = await params;
  /* Activity opens on the five newest; "Show more" asks for ten more, up to 200. */
  const shown = Math.min(200, Math.max(5, Math.floor(Number((await searchParams).act)) || 5));
  const c = getClient(id);
  if (!c) notFound();
  await hydrateSettings();
  const finance = financeDefaults();
  /* Staff see the relationship and the work, not the books, and do not get
     the controls that cannot be undone here (lib/admin/permissions.ts). */
  const role = await adminRole();
  const money = can(role, "money");
  const destructive = can(role, "destructive");
  const departments = await listDepartments();

  const projects = getProjectsFor(c.id);
  const invoices = getInvoicesFor(c.id);
  const forms = getSubmissions().filter((s) => s.clientId === c.id);
  const payments = invoices
    .flatMap((invoice) => getPaymentsFor(invoice.id).map((payment) => ({ invoice, payment })))
    .sort((a, b) => b.payment.at.localeCompare(a.payment.at));
  const deliverables = projects.flatMap((project) => (
    getDeliverablesFor(project.id).map((deliverable) => ({ deliverable, project }))
  ));
  const relatedAuditIds = [
    c.id,
    ...projects.map((project) => project.id),
    ...(money ? invoices.map((invoice) => invoice.id) : []),
    ...(money ? payments.map(({ payment }) => payment.id) : []),
    ...deliverables.map(({ deliverable }) => deliverable.id),
    ...forms.map((form) => form.id),
  ];
  const billed = invoices.filter((i) => i.status !== "Draft");
  const owed = billed.reduce((n, i) => n + invoiceTotals(i).due, 0);
  const overdue = billed.some((i) => invoiceStatus(i) === "Overdue");
  /* Two small facts the money forms need about this one client: what they hold
     on account (to offer "use their credit"), and why they cannot be emailed,
     if they cannot. And the reconciliation, summed from the same rows. */
  const held = creditBalance(c.id);
  const credits = held > 0 ? { [c.id]: held } : undefined;
  const why = noticeBlock(c);
  const noEmail = why ? { [c.id]: why } : undefined;
  const recon = money ? reconcileClient(invoices, payments.map((x) => x.payment), getCreditsFor(c.id)) : null;
  const clientProjects = getProjects().filter((p) => p.clientId === c.id);

  return (
    <>
      <ProfileCard
        crumbs={[{ href: "/admin/clients", label: "Clients" }]}
        initials={initials(c.company)}
        title={c.company}
        pills={<>
          <span className={`ad__pill ad__pill--${c.archived ? "flat" : "good"}`}>{c.mergedInto ? "Merged" : c.archived ? "Archived" : "Active"}</span>
          {overdue && money ? <span className="ad__pill ad__pill--bad">Overdue</span> : null}
        </>}
        lines={<>
          <span><User aria-hidden="true" />{c.name}</span>
          <a href={`mailto:${c.email}`}><Mail aria-hidden="true" />{c.email}</a>
          {c.phone ? <a href={`tel:${c.phone.replace(/\s/g, "")}`}><Phone aria-hidden="true" />{c.phone}</a> : null}
          {c.sector ? <span><Tag aria-hidden="true" />{c.sector}</span> : null}
        </>}
        tags={c.services.length || c.tags?.length ? <>
          {c.services.map((s) => <span key={s} className="ad__pill ad__pill--flat">{SERVICES.find((x) => x.slug === s)?.short ?? s}</span>)}
          {(c.tags ?? []).map((t) => <span key={t} className="ad__pill ad__pill--flat">{t}</span>)}
        </> : undefined}
        actions={<>
          <PageTourButton />
          {destructive ? <ArchiveClient client={c} /> : null}
          {c.mergedInto || !destructive ? null : (
            <MergeClient keepId={c.id} keepName={c.company}
              hasOthers={getClients().some((x) => x.id !== c.id)}
              likely={getClients()
                .filter((x) => x.id !== c.id && findDuplicateClient(x.email, x.phone, x.id)?.id === c.id)
                .map((x) => ({ id: x.id, company: x.company }))} />
          )}
          <EditClient client={c} />
          <AddProject clientId={c.id} />
          {money ? (
            <InvoiceBuilder
              clientId={c.id}
              defaultVatRate={finance.vatRate} defaultDueInDays={finance.dueInDays}
              credits={credits} noEmail={noEmail}
            />
          ) : null}
        </>}
        stats={[
          { label: "Client since", value: when(c.since) },
          { label: "Projects", value: String(projects.length), badge: { label: `${projects.filter((p) => p.stage !== "Delivered").length} live`, tone: "flat" } },
          ...(money ? [
            { label: "Paid to date", value: moneySummary(billed,i=>i.paid) },
            { label: "Outstanding", value: owed ? moneySummary(billed,i=>invoiceTotals(i).due) : "Nil", badge: overdue ? { label: "Overdue", tone: "bad" as const } : undefined },
          ] : []),
        ]}
      />

      {c.mergedInto ? (
        <p className="ad__banner" role="status">
          <Link href={`/admin/clients/${c.mergedInto}`}>
            <b>This record was merged into {getClient(c.mergedInto)?.company ?? "another client"}.</b> Its work moved there; open that record.
          </Link>
        </p>
      ) : null}

      {c.contacts?.length ? (
        <section className="ad__panel" style={{ marginBottom: ".9rem" }}>
          <div className="ad__panelH"><h2>Other contacts</h2></div>
          <ul className="ad__contacts">
            {c.contacts.map((x, i) => (
              <li key={`${x.name}-${i}`}>
                <b>{x.name}</b>{x.role ? <span className="ad__dim"> · {x.role}</span> : null}
                {x.email ? <> · <a href={`mailto:${x.email}`}>{x.email}</a></> : null}
                {x.phone ? <> · <a href={`tel:${x.phone.replace(/\s/g, "")}`}>{x.phone}</a></> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}


      <div className="ad__grid2">
        <div className="ad__stack">
          <Panel title="Projects" dataTour="client-projects">
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
            ) : (
              <Empty title="No projects yet" action={<AddProject clientId={c.id} />}>
                Open a project for {c.company} to track its stage, files and updates.
              </Empty>
            )}
          </Panel>

          {money ? <CurrencyBalances invoices={invoices}/> : null}
          {money ? <Panel title="Invoices" dataTour="client-invoices">
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
                          <td className="num">{formatMoney(t.total,currencyOf(i))}</td>
                          <td className="num">{t.due ? formatMoney(t.due,currencyOf(i)) : <span className="ad__dim">Nil</span>}</td>
                          <td className="ad__rmC">
                            <InvoiceMenu invoice={i} noReceipt={why}
                              edit={{ clientName: c.company, projectTitle: clientProjects.find((p) => p.id === i.projectId)?.title }} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty title="Nothing invoiced yet" action={
                <InvoiceBuilder clientId={c.id}
                  defaultVatRate={finance.vatRate} defaultDueInDays={finance.dueInDays} credits={credits} noEmail={noEmail} />}>
                Raise an invoice for {c.company}. It gets a pay link they can use without signing in.
              </Empty>
            )}
          </Panel> : null}
        </div>

        <div className="ad__stack">

          <PortalAccess clientId={c.id} email={c.email} />

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
            ) : (
              <Empty title="No brief yet" action={<CopyText text={`${SITE_URL}/onboarding`} label="Copy the onboarding link" />}>
                Send them the onboarding form. Their answers link here once they send it.
              </Empty>
            )}
          </Panel>

          {departments?.length ? (
            <Panel title="Departments">
              <div style={{ padding: ".8rem 1rem" }}>
                <ClientDepartments clientId={c.id} all={departments.map((d) => ({ id: d.id, name: d.name }))} current={c.departments ?? []} />
              </div>
            </Panel>
          ) : null}

          {c.notes ? (
            <Panel title="Notes">
              <p style={{ padding: ".8rem 1rem", margin: 0 }}>{c.notes}</p>
            </Panel>
          ) : null}
        </div>
      </div>

      {recon ? (
        <div style={{ marginTop: ".9rem" }}>
          <ClientReconciliation recon={recon} />
        </div>
      ) : null}

      <div className="ad__grid2" style={{ marginTop: ".9rem" }}>
        {money ? <Panel title="Payment history" dataTour="client-payments"
          action={<RecordAnyPayment clientId={c.id} />}>
          {payments.length ? (
            <div className="ad__scroll">
              <table className="ad__t">
                <thead>
                  <tr><th>Receipt</th><th>Invoice</th><th>Method</th><th>Status</th><th>Date</th><th className="num">Received</th><th className="num">Kept</th></tr>
                </thead>
                <tbody>
                  {payments.map(({ invoice, payment }) => {
                    const kept = paymentNet(payment);
                    const state = paymentState(payment);
                    return (
                      <tr key={payment.id}>
                        <td><Link href={`/r/${payment.token}`}><b>{payment.receiptNo}</b></Link></td>
                        <td><Link href={`/admin/money/${invoice.id}`}>{invoice.number}</Link></td>
                        <td>{payment.method}</td>
                        <td><span className={`ad__pill ${state === "Received" ? "ad__pill--good" : "ad__pill--flat"}`}>{state}</span></td>
                        <td className="num">{when(payment.at)}</td>
                        <td className="num">{formatMoney(payment.amount,currencyOf(invoice))}</td>
                        <td className="num">{formatMoney(kept,currencyOf(invoice))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="No payments recorded">
              Payments appear here with their receipt, method, reversals and refunds kept intact.
            </Empty>
          )}
        </Panel> : null}

        <Panel title="Files and deliverables">
          {deliverables.length ? (
            <div className="ad__scroll">
              <table className="ad__t">
                <thead><tr><th>Deliverable</th><th>Project</th><th>Version</th><th>Added</th><th>File</th></tr></thead>
                <tbody>
                  {deliverables.flatMap(({ deliverable, project }) => (
                    deliverable.versions.map((version, index) => (
                      <tr key={`${deliverable.id}-${version.v}`}>
                        <td>
                          <Link href={`/admin/projects/${project.id}`}><b>{deliverable.name}</b></Link>{" "}
                          {index === 0 ? <ApprovalPill approval={deliverable.approval} /> : null}
                        </td>
                        <td>{project.title}</td>
                        <td>v{version.v}</td>
                        <td className="num">{when(version.at)}</td>
                        <td>
                          {version.url ? (
                            /* A link, not an inline embed -- see the note
                               beside `svg` in
                               app/api/onboarding/upload/route.ts. */
                            <a href={version.url} target="_blank" rel="noopener noreferrer">Open file</a>
                          ) : <span className="ad__dim">Not linked</span>}
                        </td>
                      </tr>
                    ))
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="No deliverables yet">
              Versioned project files will appear here without replacing earlier work or approvals.
            </Empty>
          )}
        </Panel>
      </div>

      {/* WHAT WE OWE THEM, which is the other direction from everything above.
          Renders nothing at all for a client who has never had a balance,
          which is almost all of them. */}
      {money ? (
        <div style={{ marginTop: ".9rem" }}>
          <CreditPanel clientId={c.id} />
        </div>
      ) : null}

      {/* THE OTHER DIRECTION AGAIN: what THEY have raised with US, from their
          own portal. Renders nothing for a client with no conversations,
          same convention as the credit panel above. */}
      <div style={{ marginTop: ".9rem" }}>
        <TicketPanel clientId={c.id} />
      </div>

      {/* WHAT HAS BEEN SAID TO THEM, in one place and across every channel.
          The question "did anybody actually chase this" is asked about a
          client rather than about an invoice, and until now the only answer
          was somebody's memory. */}
      <div style={{ marginTop: ".9rem" }}>
        <CommsLog clientId={c.id} title="What we have sent them" />
      </div>

      <div style={{ marginTop: ".9rem" }} id="activity">
        <AuditLog
          subjectIds={relatedAuditIds}
          limit={shown}
          title="Activity"
          more={`/admin/clients/${c.id}?act=${shown + 10}#activity`}
        />
      </div>
    </>
  );
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}
