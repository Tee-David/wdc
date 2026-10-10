import {currencyOf,money} from "@/lib/money/currency";
import {moneySummary} from "@/lib/money/summary";
import Link from "next/link";
import {
  getCreditsFor, getInvoice, getInvoicesFor,
} from "@/lib/admin/store";
import { invoiceTotals } from "@/lib/admin/types";
import { Empty, Panel, when } from "@/components/admin/bits";
import { ApplyCredit } from "./credit-forms";

/**
 * What the studio owes this client, which is the other direction from
 * everything else on their record.
 *
 * IT ARRIVES TWO WAYS and leaves one. An invoice that took more than it was
 * for, or a refund the client asked us to hold rather than send back; and it
 * goes out by being applied to an invoice, which creates an ordinary payment
 * on that invoice with a receipt number like any other. There is no third
 * path, because a balance that can be adjusted by hand is a balance nobody can
 * reconcile.
 *
 * EVERY ROW SAYS WHERE IT CAME FROM. A balance you cannot explain line by line
 * is one a client will argue with and the studio cannot defend.
 *
 * RENDERS NOTHING WHEN THERE IS NOTHING, because most clients never have a
 * balance and a permanent empty panel on every record is a row of pixels
 * people learn to scroll past.
 */
export default function CreditPanel({ clientId }: { clientId: string }) {
  const credits = getCreditsFor(clientId);
  if (!credits.length) return null;

  const unspent=credits.filter(c=>!c.applied);
  const balance=unspent.length>0;
  /* Only invoices a credit could actually come off. */
  const open = getInvoicesFor(clientId)
    .filter((i) => i.status !== "Draft" && !i.voided && invoiceTotals(i).due > 0)
    .map((i) => ({ id: i.id, number: i.number, due: invoiceTotals(i).due,currency:currencyOf(i) }));

  return (
    <Panel title="Their balance with us" dataTour="client-credit">
      <div style={{ padding: ".9rem 1rem", borderBottom: "1px solid var(--ad-line)" }}>
        <p style={{ margin: 0 }}>
          {balance ? (
            <>
              <b className="ad__num" style={{ fontSize: "1.3rem" }}>{moneySummary(unspent,c=>c.amount)}</b>{" "}
              is held for this client. It comes off their next invoice.
            </>
          ) : (
            <span className="ad__dim">
              Nothing is held for this client at the moment. Everything below
              has been applied.
            </span>
          )}
        </p>
      </div>

      {credits.length ? (
        <div className="ad__scroll">
          <table className="ad__t">
            <thead>
              <tr>
                <th>When</th><th>Where it came from</th><th className="num">Amount</th>
                <th>State</th><th className="ad__rmH"><span className="ad__sr">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {credits.map((c) => (
                <tr key={c.id}>
                  <td className="ad__dim ad__num">{when(c.at)}</td>
                  <td>
                    {c.reason}
                    <p className="ad__dim" style={{ margin: ".15rem 0 0", fontSize: ".78rem" }}>
                      Put on account by {c.by}
                    </p>
                  </td>
                  <td className="num">{money(c.amount,currencyOf(c))}</td>
                  <td>
                    {c.applied ? (
                      <>
                        <span className="ad__pill ad__pill--flat">Applied</span>
                        <p className="ad__dim" style={{ margin: ".25rem 0 0", fontSize: ".78rem" }}>
                          to{" "}
                          <Link href={`/admin/money/${c.applied.invoiceId}`}>
                            {getInvoice(c.applied.invoiceId)?.number ?? "an invoice"}
                          </Link>{" "}
                          on {when(c.applied.at)}
                          {c.applied.amount !== undefined && c.applied.amount < c.amount
                            ? ` · ${money(c.applied.amount,currencyOf(c))} used, the rest carried forward`
                            : ""}
                        </p>
                      </>
                    ) : (
                      <span className="ad__pill ad__pill--good">Available</span>
                    )}
                  </td>
                  <td className="ad__rmC">
                    {!c.applied && open.some(i=>i.currency===currencyOf(c)) ? <ApplyCredit credit={c} invoices={open.filter(i=>i.currency===currencyOf(c))} /> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="Nothing on account" />
      )}

      {balance && !open.length ? (
        <p className="ad__dim" style={{ padding: "0 1rem 1rem", margin: 0 }}>
          There is no open invoice to put this against yet. Raise one and it can
          come off there.
        </p>
      ) : null}
    </Panel>
  );
}
