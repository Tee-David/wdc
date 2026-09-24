import Link from "next/link";
import {
  getInvoices, getProviderEvents, providerAttentionCount,
} from "@/lib/admin/store";
import { listLogged } from "@/lib/message-log";
import { naira, providerNeedsAttention } from "@/lib/admin/types";
import type { ProviderOutcome } from "@/lib/admin/types";
import { Empty, Panel, when } from "@/components/admin/bits";
import { MatchEvent, ResendMessage, ResolveEvent } from "@/components/admin/reconcile-forms";
import PageTourButton from "@/components/admin/tour/page-tour-button";

export const metadata = { title: "Reconciliation" };

/**
 * Where the books and the bank are asked to agree.
 *
 * NOT A NAV ITEM, ON PURPOSE. The admin holds to six primary pages and this is
 * a room inside Money rather than a seventh door: it is opened when the badge
 * on the Money screen says there is something in it, which on a good week is
 * never.
 *
 * WHAT IS IN HERE IS EVERYTHING THAT DID NOT LAND CLEANLY. A charge whose
 * reference matched no invoice. A webhook that arrived twice. One whose
 * signature did not verify. A checkout that would not open. None of these show
 * up anywhere else, because on every other screen they are simply an absence
 * -- an invoice that quietly stayed unpaid.
 *
 * THE DUPLICATES ARE HERE TOO, AND THEY ARE NOT A PROBLEM. Paystack retries a
 * webhook it thinks failed, and the payer's return from checkout races it, so
 * a healthy payment often produces two events and one payment. They are listed
 * so the log is complete and so "why are there two" has an answer on the page
 * rather than in somebody's head.
 */

const TONE: Record<ProviderOutcome, string> = {
  Applied: "ad__pill--good",
  Duplicate: "ad__pill--flat",
  Unmatched: "ad__pill--bad",
  Failed: "ad__pill--bad",
  Ignored: "ad__pill--flat",
  Rejected: "ad__pill--bad",
};

export default async function ReconciliationPage() {
  const attention = getProviderEvents({ attention: true, limit: 100 });
  const everything = getProviderEvents({ limit: 100 });
  const outstanding = providerAttentionCount();
  /* Only invoices somebody could actually bank money against. */
  const invoices = getInvoices()
    .filter((i) => i.status !== "Draft")
    .map((i) => ({ id: i.id, number: i.number }));
  const failedMail = await listLogged({ state: "Failed", limit: 25 });

  return (
    <>
      <div className="ad__head">
        <div>
          <p className="ad__dim"><Link href="/admin/money">Money</Link></p>
          <h1>Reconciliation</h1>
          <p>
            {outstanding
              ? `${outstanding} thing${outstanding === 1 ? "" : "s"} the books and the bank do not agree on.`
              : "Everything Paystack has told us has landed where it should."}
          </p>
        </div>
        <div className="ad__row">
          <PageTourButton />
        </div>
      </div>

      <Panel title="Needs somebody" dataTour="recon-attention">
        {attention.length ? (
          <div className="ad__scroll">
            <table className="ad__t">
              <thead>
                <tr>
                  <th>When</th><th>Reference</th><th>What happened</th>
                  <th className="num">Amount</th><th className="ad__rmH"><span className="ad__sr">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {attention.map((e) => (
                  <tr key={e.id}>
                    <td className="ad__dim ad__num">{when(e.at)}</td>
                    <td><b className="ad__num">{e.reference}</b></td>
                    <td>
                      <span className={`ad__pill ${TONE[e.outcome]}`}>{e.outcome}</span>
                      {e.note ? <p style={{ margin: ".35rem 0 0" }}>{e.note}</p> : null}
                      <p className="ad__dim" style={{ margin: ".2rem 0 0", fontSize: ".78rem" }}>
                        {e.provider} · {e.event}{e.channel ? ` · ${e.channel}` : ""}
                      </p>
                    </td>
                    <td className="num">{e.amount === null ? "–" : naira(e.amount)}</td>
                    <td className="ad__rmC">
                      <span className="ad__row">
                        {e.outcome === "Unmatched" && e.amount !== null && e.amount > 0
                          ? <MatchEvent event={e} invoices={invoices} />
                          : null}
                        <ResolveEvent event={e} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Nothing to reconcile">
            Every charge Paystack has reported has matched an invoice and been
            banked once. Duplicates and ignored events are in the full log
            below; they do not need anybody.
          </Empty>
        )}
      </Panel>

      {failedMail.length ? (
        <div style={{ marginTop: ".9rem" }}>
          <Panel title="Messages that did not go">
            <div className="ad__scroll">
              <table className="ad__t">
                <thead>
                  <tr><th>When</th><th>To</th><th>About</th><th>Why not</th><th className="ad__rmH"><span className="ad__sr">Actions</span></th></tr>
                </thead>
                <tbody>
                  {failedMail.map((m) => (
                    <tr key={m.id}>
                      <td className="ad__dim ad__num">{when(m.at)}</td>
                      <td>{m.to}</td>
                      <td>{m.subject}</td>
                      <td className="ad__dim">{m.error ?? "The mail server refused it."}</td>
                      <td className="ad__rmC"><ResendMessage id={m.id} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      ) : null}

      <div style={{ marginTop: ".9rem" }}>
        <Panel title="Everything Paystack has said" dataTour="recon-log">
          {everything.length ? (
            <div className="ad__scroll">
              <table className="ad__t">
                <thead>
                  <tr><th>When</th><th>Reference</th><th>Event</th><th>Outcome</th><th className="num">Amount</th></tr>
                </thead>
                <tbody>
                  {everything.map((e) => (
                    <tr key={e.id}>
                      <td className="ad__dim ad__num">{when(e.at)}</td>
                      <td className="ad__num">{e.reference}</td>
                      <td>{e.event}</td>
                      <td>
                        <span className={`ad__pill ${TONE[e.outcome]}`}>{e.outcome}</span>
                        {e.resolution ? (
                          <p className="ad__dim" style={{ margin: ".3rem 0 0", fontSize: ".78rem" }}>
                            {e.resolution.by}: {e.resolution.note}
                          </p>
                        ) : providerNeedsAttention(e) ? null : e.note ? (
                          <p className="ad__dim" style={{ margin: ".3rem 0 0", fontSize: ".78rem" }}>{e.note}</p>
                        ) : null}
                      </td>
                      <td className="num">{e.amount === null ? "–" : naira(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="Paystack has not said anything yet">
              This fills up the first time somebody pays an invoice with a card.
              Every event lands here whatever its outcome, including the ones
              that were quietly ignored, so there is one place that knows the
              whole story of a reference.
            </Empty>
          )}
        </Panel>
      </div>
    </>
  );
}
