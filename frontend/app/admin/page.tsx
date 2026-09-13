import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SERVICES } from "@/lib/services";
import {
  getBoard, getClient, getClients, getInvoices, getProjects, getSubmissions,
  getSummary,
} from "@/lib/admin/store";
import { invoiceStatus, invoiceTotals, naira, nairaShort, STAGES } from "@/lib/admin/types";
import { DemoNote, Empty, InvoicePill, Panel, StagePill, Tile, when } from "@/components/admin/bits";
import { AddClient } from "@/components/admin/client-form";
import { AddProject } from "@/components/admin/project-forms";
import { InvoiceBuilder } from "@/components/admin/money-forms";
import { AdminPageSkeleton } from "@/components/admin/page-skeleton";

export const metadata = { title: "Dashboard" };

/**
 * The morning screen.
 *
 * IT LEADS WITH COLLECTED, NOT INVOICED. Invoiced revenue is a number that
 * feels good and cannot pay anybody; what a studio needs before anything else
 * is what has landed, what is owed, and what is late. Then what is waiting on
 * us, because that is the only project count worth acting on.
 *
 * Every figure is summed from the same rows the money and project screens
 * show, so a tile and a table can never tell different stories.
 */
export default function AdminHome() {
  const s = getSummary();
  const board = getBoard();
  const invoices = getInvoices();
  const late = invoices
    .filter((i) => invoiceStatus(i) === "Overdue")
    .sort((a, b) => a.due.localeCompare(b.due));
  const attention = getProjects().filter(
    (p) => p.stage === "Onboarding" || p.stage === "Revisions",
  );
  const openForms = getSubmissions().filter((x) => x.status === "In progress");

  return (
    <AdminPageSkeleton>
      <div className="ad__head">
        <div>
          <h1>Today</h1>
          <p>What has landed, what is owed, and what is waiting on you.</p>
        </div>
        <div className="ad__row">
          <AddClient />
          <AddProject clients={getClients()} />
          <InvoiceBuilder clients={getClients()} projects={getProjects()} />
        </div>
      </div>

      <DemoNote>
        The figures below are seed data, not real trading, and the writes go to
        an in-memory store, so a change holds until the server restarts.
        Everything is summed from <code>lib/admin/store.ts</code>; swapping
        that one module for the CockroachDB queries in{" "}
        <code>lib/db/schema.ts</code> makes every screen live and durable
        without a change to any of them.
      </DemoNote>

      <dl className="ad__tiles">
        <Tile label="Collected" value={nairaShort(s.collected)} tone="good"
              note={`of ${nairaShort(s.invoiced)} invoiced`} />
        <Tile label="Outstanding" value={nairaShort(s.outstanding)}
              note={s.overdue ? `${nairaShort(s.overdue)} of it overdue` : "Nothing late"}
              tone={s.overdue ? "bad" : undefined} />
        <Tile label="Spend" value={nairaShort(s.spend)} note="This period" />
        <Tile label="Cash in hand" value={nairaShort(s.profit)}
              tone={s.profit >= 0 ? "good" : "bad"} note="Collected less spend" />
        <Tile label="Live projects" value={String(s.liveProjects)}
              note={`${s.needsUs} waiting on us`} tone={s.needsUs ? "accent" : undefined} />
        <Tile label="Clients" value={String(s.clients)} note={`${s.openForms} forms still open`} />
      </dl>

      <div className="ad__grid2">
        <div className="ad__stack">
          <Panel
            title="Needs you"
            action={<Link href="/admin/projects">All projects <ArrowRight size={13} style={{ display: "inline", verticalAlign: "-2px" }} /></Link>}
          >
            {attention.length ? (
              <div className="ad__scroll">
                <table className="ad__t">
                  <thead>
                    <tr><th>Project</th><th>Client</th><th>Stage</th><th>Due</th></tr>
                  </thead>
                  <tbody>
                    {attention.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <Link href={`/admin/projects/${p.id}`}><b>{p.title}</b></Link>
                          <small>{SERVICES.find((x) => x.slug === p.service)?.short}</small>
                        </td>
                        <td>{getClient(p.clientId)?.company ?? "Unknown"}</td>
                        <td><StagePill stage={p.stage} /></td>
                        <td className="num">{when(p.due)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty title="Nothing is blocked">
                Every live project is with the client or in progress.
              </Empty>
            )}
          </Panel>

          <Panel
            title="Late invoices"
            action={<Link href="/admin/money">All money <ArrowRight size={13} style={{ display: "inline", verticalAlign: "-2px" }} /></Link>}
          >
            {late.length ? (
              <div className="ad__scroll">
                <table className="ad__t">
                  <thead>
                    <tr><th>Invoice</th><th>Client</th><th>Was due</th><th className="num">Owed</th></tr>
                  </thead>
                  <tbody>
                    {late.map((i) => (
                      <tr key={i.id}>
                        <td>
                          <Link href={`/admin/money/${i.id}`}><b>{i.number}</b></Link>
                          <small><InvoicePill status={invoiceStatus(i)} /></small>
                        </td>
                        <td>{getClient(i.clientId)?.company ?? "Unknown"}</td>
                        <td className="num">{when(i.due)}</td>
                        <td className="num">{naira(invoiceTotals(i).due)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty title="Nothing is late">Every sent invoice is inside its terms.</Empty>
            )}
          </Panel>
        </div>

        <div className="ad__stack">
          <Panel title="Where the work is">
            <div style={{ padding: ".8rem 1rem" }}>
              {/* A COUNT PER STAGE, not a chart. Six numbers are read faster
                  than six bars, and the question here is "how many", which a
                  bar answers less precisely than a number does. */}
              {STAGES.map((st) => {
                const n = board.get(st)?.length ?? 0;
                return (
                  <div key={st} className="ad__row" style={{ justifyContent: "space-between", padding: ".3rem 0" }}>
                    <StagePill stage={st} />
                    <b className="ad__num">{n}</b>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel
            title="Onboarding still open"
            action={<Link href="/admin/forms">All forms <ArrowRight size={13} style={{ display: "inline", verticalAlign: "-2px" }} /></Link>}
          >
            {openForms.length ? (
              <div style={{ padding: ".4rem 1rem .8rem" }}>
                {openForms.map((f) => (
                  <div key={f.id} className="ad__row" style={{ justifyContent: "space-between", padding: ".45rem 0" }}>
                    <Link href={`/admin/forms/${f.id}`}>
                      <b>{String(f.answers.company ?? f.answers.first_name ?? "Unnamed")}</b>
                      <small className="ad__dim">
                        {SERVICES.find((x) => x.slug === f.service)?.short} · started {when(f.startedAt)}
                      </small>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <Empty title="All in">Nobody has a half-finished form.</Empty>
            )}
          </Panel>
        </div>
      </div>
    </AdminPageSkeleton>
  );
}
