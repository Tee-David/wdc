import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FileCheck2, ScrollText } from "lucide-react";
import { getPortalRequest } from "@/lib/portal/session";
import { getDeliverablesFor, getProject, getUpdatesFor } from "@/lib/admin/data";
import { STAGES } from "@/lib/admin/types";
import { SERVICES } from "@/lib/services";
import { ApprovalPill, Empty, HealthPill, Panel, StagePill, when } from "@/components/admin/bits";
import { DeliverableActions } from "@/components/client/deliverable-actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { client } = await getPortalRequest();
  const p = client ? await getProject(id) : null;
  if (!p || !client || p.clientId !== client.id) notFound();
  return { title: p.title };
}

export default async function PortalProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { client } = await getPortalRequest();
  const p = client ? await getProject(id) : null;
  /* SAME OWNERSHIP CHECK AS THE METADATA ABOVE, deliberately re-run here
     rather than trusted from it: `generateMetadata` and the page body are
     two separate invocations, and a project that belongs to another client
     must 404 from either one on its own. */
  if (!p || !client || p.clientId !== client.id) notFound();

  const at = STAGES.indexOf(p.stage);
  const service = SERVICES.find((s) => s.slug === p.service);
  const updates = (await getUpdatesFor(p.id)).filter((u) => u.clientVisible).sort((a, b) => b.at.localeCompare(a.at));
  const deliverables = await getDeliverablesFor(p.id);

  return (
    <div className="adDash">
      <header className="adDash__head">
        <div>
          <span className="adDash__eyebrow">{service?.short ?? p.service}</span>
          <h1>{p.title}</h1>
          <p>{p.due ? `Due ${when(p.due)}` : "No due date agreed yet"} · <HealthPill health={p.health} /></p>
        </div>
      </header>

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
      </section>

      <div className="adDash__layout">
        <main className="adDash__work">
          <Panel title="Deliverables">
            {deliverables.length ? (
              <div className="adDash__compactList" style={{ display: "grid", gap: ".7rem" }}>
                {deliverables.map((d) => {
                  const latest = d.versions[d.versions.length - 1];
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
