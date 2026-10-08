import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight, CalendarDays, ChevronRight, Download, Eye, FileCheck2, FileText, Layers, MessageSquare,
  MessageSquareReply, ScrollText, User,
} from "lucide-react";
import { getPortalRequest } from "@/lib/portal/session";
import { getDeliverablesFor, getInvoicesFor, getProject, getUpdatesFor } from "@/lib/admin/store";
import { STAGES, invoiceTotals, naira } from "@/lib/admin/types";
import { SERVICE_BY_SLUG } from "@/lib/services";
import { projectGlyph } from "@/components/client/service-glyph";
import { ApprovalPill, Empty, HealthPill, Panel, StagePill, when } from "@/components/admin/bits";
import { ProfileCard } from "@/components/admin/profile-card";
import { DeliverableActions } from "@/components/client/deliverable-actions";
import "@/components/client/portal.css";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import { deliverableFileLinks } from "@/lib/deliverable-files";
import { ProjectTimeline } from "@/components/client/project-timeline";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  await syncStore();
  const { id } = await params;
  const { client } = await getPortalRequest();
  const p = client ? getProject(id) : null;
  if (!p || !client || p.clientId !== client.id) notFound();
  return { title: p.title };
}

/**
 * ONE PROJECT, AS ITS CLIENT SEES IT: where it
 * is and what happens next, the work waiting for them, what the studio has
 * said, and the facts and money beside it. Only what the records hold: the
 * board's "who is on it" list is the one person answerable, because that is
 * the one name a project carries.
 */
export default async function PortalProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  await syncStore();
  persistSoon();
  const { id } = await params;
  const { client } = await getPortalRequest();
  const p = client ? getProject(id) : null;
  /* SAME OWNERSHIP CHECK AS THE METADATA ABOVE, deliberately re-run here
     rather than trusted from it: `generateMetadata` and the page body are
     two separate invocations, and a project that belongs to another client
     must 404 from either one on its own. */
  if (!p || !client || p.clientId !== client.id) notFound();

  const at = STAGES.indexOf(p.stage);
  const service = SERVICE_BY_SLUG.get(p.service);
  const updates = getUpdatesFor(p.id).filter((u) => u.clientVisible).sort((a, b) => b.at.localeCompare(a.at));
  const next = updates.find((u) => u.next)?.next ?? null;
  const deliverables = getDeliverablesFor(p.id);
  const waiting = deliverables.filter((d) => d.approval === "Awaiting client");
  const rest = deliverables.filter((d) => d.approval !== "Awaiting client");
  const started = p.events.map((e) => e.at).sort()[0] ?? null;

  /* Money on this project: its invoices, not a figure typed anywhere. */
  const invoices = getInvoicesFor(client.id).filter((inv) => inv.projectId === p.id && !inv.voided && inv.status !== "Draft");
  const billed = invoices.reduce((n, inv) => n + invoiceTotals(inv).total, 0);
  const paid = invoices.reduce((n, inv) => n + Math.min(inv.paid, invoiceTotals(inv).total), 0);
  const owing = invoices.filter((inv) => invoiceTotals(inv).due > 0).sort((a, b) => a.due.localeCompare(b.due))[0] ?? null;
  const askHref = `/portal/support?new=1&project=${p.id}&subject=${encodeURIComponent(`About ${p.title}`)}`;

  return (
    <>
      <ProfileCard
        crumbs={[{ href: "/portal/projects", label: "Your projects" }]}
        icon={projectGlyph(p)}
        tone="brand"
        title={p.title}
        pills={<StagePill stage={p.stage} />}
        lines={<>
          <span><Layers aria-hidden="true" />{service?.short ?? p.service}</span>
          {p.owner ? <span><User aria-hidden="true" />{p.owner} leads this</span> : null}
          <span><CalendarDays aria-hidden="true" />{p.due ? `Due ${when(p.due)}` : "No due date agreed yet"}</span>
        </>}
        actions={<Link className="ad__btn" href={askHref}><MessageSquare aria-hidden="true" /> Ask about this project</Link>}
      >
        <div className="ad__stageTrack">
          <ol aria-label={`Stage: ${p.stage}, ${at + 1} of ${STAGES.length}`}>
            {STAGES.map((st, n) => (
              <li key={st} className={n < at ? "is-done" : n === at ? "is-now" : undefined} aria-current={n === at ? "step" : undefined}>
                <span aria-hidden="true" />
                <small>{st}{n === at ? " · you are here" : ""}</small>
              </li>
            ))}
          </ol>
          {next ? (
            <p className="cpNext"><span className="cpNext__icon" aria-hidden="true"><ArrowRight /></span><span><b>Next:</b> {next}</span></p>
          ) : null}
        </div>
      </ProfileCard>

      <div className="ad__split">
        <div className="ad__stack">
          <ProjectTimeline project={p} email={client.email} updates={updates} deliverables={deliverables} started={started} />

          <Panel title="Deliverables" id="deliverables">
            {deliverables.length ? (
              <>
                <p className="cpSub">Open each one, then approve it or tell us what to change.</p>
                <div className="cpDeliv">
                  {waiting.map((d) => {
                    const latest = d.versions[d.versions.length - 1];
                    return (
                      <article className="cpDeliv__card" key={d.id}>
                        <span className="cpDeliv__icon cpDeliv__icon--live" aria-hidden="true"><FileText /></span>
                        <div className="cpDeliv__body">
                          <div className="cpDeliv__title"><b>{d.name}</b><span className="ad__pill ad__pill--flat">v{latest.v}</span><span className="ad__pill ad__pill--live">Waiting for you</span></div>
                          <small>Sent {when(latest.at)}</small>
                          {latest.note ? <p>{latest.note}</p> : null}
                          <div className="cpDeliv__acts">
                            {latest.url ? <a className="ad__btn" href={latest.url} target="_blank" rel="noopener noreferrer"><Eye aria-hidden="true" /> Open link</a> : null}
                            <DeliverableFiles files={latest.files} button />
                            <DeliverableActions deliverable={d} />
                          </div>
                        </div>
                      </article>
                    );
                  })}
                  {rest.map((d) => {
                    const versions = d.versions.slice().reverse();
                    const [latest, ...older] = versions;
                    return (
                      <div className="cpDeliv__row" key={d.id}>
                        <span className="cpDeliv__icon" aria-hidden="true"><FileCheck2 /></span>
                        <div className="cpDeliv__body">
                          <div className="cpDeliv__title"><b>{d.name}</b><span className="ad__pill ad__pill--flat">v{latest.v}</span></div>
                          <small>
                            {d.approval === "Revision requested" && d.approvalNote ? <>Your note: “{d.approvalNote}”</> : `${when(latest.at)}${latest.note ? ` · ${latest.note}` : ""}`}
                          </small>
                          <DeliverableFiles files={latest.files} />
                          {older.length ? (
                            /* EVERY VERSION IS KEPT, so "which logo did they approve"
                               stays answerable -- see the type's own comment on why
                               versions are appended, never replaced. */
                            <details className="cpDeliv__older">
                              <summary>{older.length} earlier version{older.length === 1 ? "" : "s"}</summary>
                              {older.map((v) => (
                                <p key={v.v}>
                                  v{v.v} · {when(v.at)}{v.note ? ` · ${v.note}` : ""}
                                  {v.url ? <> · <a href={v.url} target="_blank" rel="noopener noreferrer">Open link</a></> : null}
                                  <DeliverableFiles files={v.files} compact />
                                </p>
                              ))}
                            </details>
                          ) : null}
                        </div>
                        <span className="cpDeliv__end">
                          <ApprovalPill approval={d.approval} />
                          {latest.url ? <a className="cpDeliv__link" href={latest.url} target="_blank" rel="noopener noreferrer">Open link</a> : null}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <Empty title="Nothing delivered yet" icon={FileCheck2}>Files and drafts the studio shares with you will appear here.</Empty>
            )}
          </Panel>

          <Panel title="Updates">
            {updates.length ? (
              <ol className="cpFeed cpFeed--cards">
                {updates.map((u) => (
                  <li key={u.id}>
                    <span className="cpFeed__dot" aria-hidden="true" />
                    <div className="cpFeed__card">
                      <div className="cpFeed__head"><HealthPill health={u.health} /><small>{when(u.at)} · {u.author}</small></div>
                      <p className="cpFeed__lead">{u.progress}</p>
                      {u.next ? <p><b>Next:</b> {u.next}</p> : null}
                      <Link className="ad__btn" href={`/portal/support?new=1&project=${p.id}&subject=${encodeURIComponent(`Re: ${p.title} update, ${when(u.at)}`)}`}>
                        <MessageSquareReply aria-hidden="true" /> Reply
                      </Link>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <Empty title="No updates yet" icon={ScrollText}>Progress notes the studio shares with you will show up here.</Empty>
            )}
          </Panel>
        </div>

        <div className="ad__stack">
          <Panel title="What we are making">
            {p.scope ? <p className="cpScope">{p.scope}</p> : null}
            <dl className="cpFacts">
              {started ? <div><dt>Started</dt><dd>{when(started)}</dd></div> : null}
              <div><dt>Due</dt><dd>{p.due ? when(p.due) : "To be agreed"}</dd></div>
              <div><dt>Updates come by</dt><dd>{p.channel}</dd></div>
              {p.owner ? <div><dt>Leads this</dt><dd>{p.owner}</dd></div> : null}
            </dl>
          </Panel>

          <Panel title="Money on this project" action={<Link href="/portal/billing">Billing <ChevronRight aria-hidden="true" /></Link>}>
            {invoices.length ? (
              <div className="cpMoney">
                <dl className="cpFacts">
                  {p.budget !== null ? <div><dt>Agreed</dt><dd>{naira(p.budget)}</dd></div> : null}
                  <div><dt>Invoiced</dt><dd>{naira(billed)}</dd></div>
                  <div><dt>Paid</dt><dd>{naira(paid)}</dd></div>
                </dl>
                <span className="cpMoney__bar" role="img" aria-label={`${Math.round((paid / billed) * 100)}% of what is invoiced is paid`}>
                  <i style={{ width: `${Math.min(100, (paid / billed) * 100)}%` }} />
                </span>
                {owing ? (
                  <a className="ad__btn ad__btn--primary cpMoney__pay" href={`/i/${owing.token}`} target="_blank" rel="noopener noreferrer">
                    Pay {naira(invoiceTotals(owing).due)}
                  </a>
                ) : <p className="cpScope">Everything invoiced is paid.</p>}
              </div>
            ) : (
              <p className="cpScope">Nothing has been invoiced on this project yet.</p>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

async function DeliverableFiles({ files, button = false, compact = false }: { files: { name: string; key: string }[] | undefined; button?: boolean; compact?: boolean }) {
  const { support } = await getPortalRequest();
  const links = deliverableFileLinks(files);
  if (!links.length) return null;
  return (
    <span className={`cpDeliv__files${compact ? " cpDeliv__files--compact" : ""}`}>
      {links.map((file) => (
        <span key={file.key} className="cpDeliv__file">
          <b>{file.name}</b>
          {file.open && !support ? <a className={button ? "ad__btn" : "cpDeliv__link"} href={file.open} target="_blank" rel="noopener noreferrer"><Eye aria-hidden="true" /> Open</a> : <span className="ad__dim">Unavailable</span>}
          {file.download && !support ? <a className={button ? "ad__btn" : "cpDeliv__link"} href={file.download}><Download aria-hidden="true" /> Download</a> : null}
        </span>
      ))}
    </span>
  );
}
