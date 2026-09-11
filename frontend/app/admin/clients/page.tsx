import Link from "next/link";
import { SERVICES } from "@/lib/services";
import { getClients, getClientsByService, getInvoicesFor, getProjectsFor } from "@/lib/admin/store";
import { invoiceTotals, naira } from "@/lib/admin/types";
import { DemoNote, Empty, Panel, when } from "@/components/admin/bits";
import { AddClient } from "@/components/admin/client-form";

export const metadata = { title: "Clients" };

/**
 * Clients, GROUPED BY SERVICE, which is how you asked to see them.
 *
 * A client appears under every service they buy, because that is the truth: a
 * client on branding and web is a branding client on the day you are looking
 * at branding work. The flat list underneath is the same people once each,
 * with what they are worth and what is open.
 */
export default function ClientsPage() {
  const clients = getClients();
  const grouped = getClientsByService();

  return (
    <>
      <div className="ad__head">
        <div>
          <h1>Clients</h1>
          <p>{clients.length} on the books, grouped by what they buy.</p>
        </div>
        <AddClient />
      </div>

      <DemoNote>
        Adding, editing and archiving are live and go through{" "}
        <code>lib/admin/actions.ts</code>. What they write to is still the
        in-memory store, so a change holds until the server restarts and is
        then gone. Wiring CockroachDB underneath it changes one file.
      </DemoNote>

      <div className="ad__stack">
        <Panel title="By service">
          <div style={{ padding: ".8rem 1rem" }}>
            {SERVICES.map((sv) => {
              const list = grouped.get(sv.slug) ?? [];
              return (
                <div key={sv.slug} style={{ padding: ".5rem 0", borderBottom: "1px solid var(--ad-line)" }}>
                  <div className="ad__row" style={{ justifyContent: "space-between" }}>
                    <b>{sv.short}</b>
                    <span className="ad__dim ad__num">{list.length}</span>
                  </div>
                  <div className="ad__row" style={{ marginTop: ".35rem" }}>
                    {list.length
                      ? list.map((c) => (
                          <Link key={c.id} href={`/admin/clients/${c.id}`} className="ad__pill ad__pill--flat">
                            {c.company}
                          </Link>
                        ))
                      : <span className="ad__dim">Nobody yet.</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Everyone">
          <div className="ad__scroll">
            <table className="ad__t">
              <thead>
                <tr>
                  <th>Client</th><th>Sector</th><th>Buys</th>
                  <th className="num">Projects</th><th className="num">Owed</th><th>Since</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => {
                  const owed = getInvoicesFor(c.id)
                    .filter((i) => i.status !== "Draft")
                    .reduce((n, i) => n + invoiceTotals(i).due, 0);
                  const live = getProjectsFor(c.id).filter((p) => p.stage !== "Delivered").length;
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/admin/clients/${c.id}`}><b>{c.company}</b></Link>
                        <small>{c.name}</small>
                      </td>
                      <td>{c.sector || <span className="ad__dim">Not set</span>}</td>
                      <td>
                        <span className="ad__row">
                          {c.services.map((s) => (
                            <span key={s} className="ad__pill ad__pill--flat">
                              {SERVICES.find((x) => x.slug === s)?.short}
                            </span>
                          ))}
                        </span>
                      </td>
                      <td className="num">{live}</td>
                      <td className="num">{owed ? naira(owed) : <span className="ad__dim">Nil</span>}</td>
                      <td className="num">{when(c.since)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!clients.length && <Empty title="No clients yet" />}
        </Panel>
      </div>
    </>
  );
}
