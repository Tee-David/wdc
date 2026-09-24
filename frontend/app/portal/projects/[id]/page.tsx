import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileCheck2, MessageSquareReply, ScrollText } from "lucide-react";
import { getPortalRequest } from "@/lib/portal/session";
import { getDeliverablesFor, getProject, getUpdatesFor } from "@/lib/admin/store";
import { STAGES } from "@/lib/admin/types";
import { SERVICES } from "@/lib/services";
import { ApprovalPill, Empty, HealthPill, Panel, StagePill, when } from "@/components/admin/bits";
import { DeliverableActions } from "@/components/client/deliverable-actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { client } = await getPortalRequest();
  const p = client ? getProject(id) : null;
  if (!p || !client || p.clientId !== client.id) notFound();
  return { title: p.title };
}

export default async function PortalProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { client } = await getPortalRequest();
  const p = client ? getProject(id) : null;
  /* SAME OWNERSHIP CHECK AS THE METADATA ABOVE, deliberately re-run here
     rather than trusted from it: `generateMetadata` and the page body are
     two separate invocations, and a project that belongs to another client
     must 404 from either one on its own. */
  if (!p || !client || p.clientId !== client.id) notFound();

  const at = STAGES.indexOf(p.stage);
  const service = SERVICES.find((s) => s.slug === p.service);
  const updates = getUpdatesFor(p.id).filter((u) => u.clientVisible).sort((a, b) => b.at.localeCompare(a.at));
  const deliverables = getDeliverablesFor(p.id);

  return (
    <div className="adDash">
      <header className="adDash__head">
        <div>
          <span className="adDash__eyebrow">{service?.short ?? p.service}</span>
          <h1>{p.title}</h1>
          <p>{p.due ? `Due ${when(p.due)}` : "No due date agreed yet"} · <HealthPill health={p.health} /> · Updates via {p.channel}</p>
        </div>
      </header>

      <section className="ad__panel" style={{ marginBottom: ".9rem" }}>
        <div className="ad__panelH"><h2>Where it is</h2><StagePill stage={p.stage} /></div>
        <ol className="ad__track" style={{ "--steps": STAGES.length } as React.CSSProperties}>
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
      </section>

      <div className="adDash__layout">
        <main className="adDash__work">
          <Panel title="Deliverables">
            {deliverables.length ? (
              <div className="adDash__compactList" style={{ display: "grid", gap: ".7rem" }}>
                {deliverables.map((d) => {
                  const versions = d.versions.slice().reverse();
                  const [latest, ...older] = versions;
                  return (
                    <div key={d.id} className="ad__panel" style={{ padding: "1rem" }}>
                      <div className="ad__row" style={{ justifyContent: "space-between" }}>
                        <b>{d.name}</b>
                        <ApprovalPill approval={d.approval} />
                      </div>
                      <p style={{ margin: ".4rem 0", color: "var(--ad-dim)", fontSize: ".85rem" }}>
                        v{latest.v} · {when(latest.at)}{latest.note ? ` · ${latest.note}` : ""}
                      </p>
                      {latest.url ? <a className="ad__btn" href={latest.url} target="_blank" rel="noopener noreferrer" style={{ marginBottom: ".6rem", display: "inline-flex" }}>View file</a> : null}
                      {older.length ? (
                        /* EVERY VERSION IS KEPT, so "which logo did they approve"
                           stays answerable -- see the type's own comment on why
                           versions are appended, never replaced. */
                        <details style={{ margin: ".2rem 0 .6rem" }}>
                          <summary style={{ cursor: "pointer", fontSize: ".8rem", color: "var(--ad-dim)" }}>
                            {older.length} earlier version{older.length === 1 ? "" : "s"}
                          </summary>
                          <div style={{ display: "grid", gap: ".4rem", marginTop: ".5rem" }}>
                            {older.map((v) => (
                              <p key={v.v} style={{ margin: 0, fontSize: ".8rem", color: "var(--ad-dim)" }}>
                                v{v.v} · {when(v.at)}{v.note ? ` · ${v.note}` : ""}
                                {v.url ? <> · <a href={v.url} target="_blank" rel="noopener noreferrer">View file</a></> : null}
                              </p>
                            ))}
                          </div>
                        </details>
                      ) : null}
                      {d.approval === "Revision requested" && d.approvalNote ? (
                        <p style={{ fontSize: ".85rem", background: "var(--ad-bg)", padding: ".6rem .75rem", borderRadius: "var(--ad-r)" }}>
                          <b>Your note:</b> {d.approvalNote}
                        </p>
                      ) : null}
                      <DeliverableActions deliverable={d} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <Empty title="Nothing delivered yet" icon={FileCheck2}>Files and drafts the studio shares with you will appear here.</Empty>
            )}
          </Panel>

          <Panel title="Updates">
            {updates.length ? (
              <div className="adDash__compactList" style={{ display: "grid", gap: ".6rem" }}>
                {updates.map((u) => (
                  <div key={u.id} className="ad__panel" style={{ padding: "1rem" }}>
                    <div className="ad__row" style={{ justifyContent: "space-between" }}>
                      <HealthPill health={u.health} />
                      <small style={{ color: "var(--ad-dim)" }}>{when(u.at)}</small>
                    </div>
                    <p style={{ margin: ".5rem 0 0", fontSize: ".9rem" }}>{u.progress}</p>
                    {u.next ? <p style={{ margin: ".3rem 0 0", fontSize: ".85rem", color: "var(--ad-dim)" }}><b>Next:</b> {u.next}</p> : null}
                    <Link
                      className="ad__btn"
                      style={{ marginTop: ".6rem", display: "inline-flex" }}
                      href={`/portal/support?new=1&project=${p.id}&subject=${encodeURIComponent(`Re: ${p.title} update, ${when(u.at)}`)}`}
                    >
                      <MessageSquareReply aria-hidden="true" /> Reply
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <Empty title="No updates yet" icon={ScrollText}>Progress notes the studio shares with you will show up here.</Empty>
            )}
          </Panel>
        </main>
      </div>
    </div>
  );
}
