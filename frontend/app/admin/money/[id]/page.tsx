import {currencyOf,money} from "@/lib/money/currency";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getClient, getInvoice, getPaymentsFor, getProject, getProjectsFor,
} from "@/lib/admin/store";
import { invoiceMailVerdict, noticeBlock, reconcileInvoice } from "@/lib/admin/money-rules";
import { invoiceStatus, invoiceTotals, lineTotal, paymentState, refundedTotal } from "@/lib/admin/types";

/** The exact figure under a short one, only when the short one rounded it. */

import { Empty, InvoicePill, when } from "@/components/admin/bits";
import { CalendarClock, CheckCircle2, Eye, FileText, Landmark, Wallet } from "lucide-react";
import { PageHead } from "@/components/admin/page-head";
import { RailCard, StatTiles, Workbench } from "@/components/admin/workbench";
import { CopyText } from "@/components/admin/copy-text";
import { nowMs, dateWords, daysFrom } from "@/lib/admin/when";
import QrCode from "@/components/ui/qr-code";
import { invoiceUrl } from "@/components/money/document";
import { PaymentMenu } from "@/components/admin/row-actions";
import {
  DeleteDraft, InvoiceBuilder, IssueInvoice, RecordPayment, } from "@/components/admin/money-forms";
import { CreditExcess, EmailInvoice, EmailReminder, SendReceipt } from "@/components/admin/reconcile-forms";
import { InvoiceReconciliation } from "@/components/admin/reconciliation";
import CommsLog from "@/components/admin/comms-log";
import InvoiceReminders from "@/components/admin/invoice-reminders";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import "@/components/admin/dashboard.css";
import "@/components/admin/invoice-page.css";

/* NO generateStaticParams: invoices are raised at runtime, and a prerendered
   list would 404 on the one just created. */

/* See the note beside the same function in clients/[id]/page.tsx. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  await syncStore();
  const { id } = await params;
  const inv = getInvoice(id);
  if (!inv) notFound();
  return { title: `${inv.number} · Invoice` };
}

/**
 * One invoice, as the client will see it and as the studio needs it.
 *
 * EVERY FIGURE IS RECOMPUTED FROM THE LINES. Nothing here reads a stored
 * total, because a stored total is a second source of truth that can disagree
 * with the first one, and the day it does is the day somebody is billed wrong.
 * See `invoiceTotals` in lib/admin/types.ts.
 */
export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await syncStore();
  persistSoon();
  const { id } = await params;
  const inv = getInvoice(id);
  if (!inv) notFound();
  const naira=(amount:number)=>money(amount,currencyOf(inv));
  const client = getClient(inv.clientId);
  const project = inv.projectId ? getProject(inv.projectId) : null;
  const payments = getPaymentsFor(inv.id);
  const t = invoiceTotals(inv);
  const status = invoiceStatus(inv);
  /* WHAT THIS CLIENT CAN BE EMAILED, said once: the ticks beside the receipt,
     void, refund and credit controls all disable with this reason. */
  const noEmail = noticeBlock(client);
  const mailable = invoiceMailVerdict(inv).ok;
  const settled = !inv.voided && inv.status !== "Draft" && !mailable;
  const recon = reconcileInvoice(inv, payments);
  const now = nowMs();
  const lateDays = Math.max(0, -daysFrom(inv.due, now));
  const link = invoiceUrl(inv.token);

  const rail = (
    <>
      {inv.status !== "Draft" ? (
        <RailCard title="The client's copy" aside="As the client sees it">
          <div className="adInv__copy" data-tour="inv-client-copy">
            <div className="ad__qr"><QrCode url={link} label={`Open invoice ${inv.number}`} animate={false} boxPx={148} /></div>
            <p className="ad__dim">Printed, emailed or sent as a photo, the code always opens the live copy, which knows what has been paid since.</p>
          </div>
        </RailCard>
      ) : (
        <RailCard title="Not sent yet">
          <p className="ad__dim adInv__note">A draft has no client copy and no pay link. Send it from the head of the page when it is ready.</p>
        </RailCard>
      )}
      {inv.status !== "Draft" ? <InvoiceReminders invoice={inv} /> : null}
      {inv.status !== "Draft" && !inv.voided ? (
        <RailCard title="The payment link">
          <p className="ad__dim adInv__note">One tap to pay with Paystack or Flutterwave. A paid invoice cannot be paid twice.</p>
          <div className="adInv__links">
            <CopyText text={link} label="Copy the link" />
            <a className="ad__btn" href={`/i/${inv.token}`} target="_blank" rel="noopener noreferrer"><Eye aria-hidden="true" />See it as the client</a>
            <Link className="ad__btn" href="/admin/money/reconciliation"><Landmark aria-hidden="true" />Match a payment</Link>
          </div>
        </RailCard>
      ) : null}
    </>
  );

  return (
    <>
      <PageHead title={`Invoice ${inv.number}`} crumbs={[{ href: "/admin/money", label: "Money" }]}
        lede={<>
          {client ? <Link href={`/admin/clients/${client.id}`}>{client.company}</Link> : "Unknown client"}
          {project ? <> · <Link href={`/admin/projects/${project.id}`}>{project.title}</Link></> : null}
          {inv.status === "Draft" ? " · not sent yet" : ` · issued ${dateWords(inv.issued, now)}`}
          {" · "}<strong>{inv.voided ? "Nothing owed" : t.due > 0 ? `${naira(t.due)} owed` : "Paid in full"}</strong>
        </>}
        action={<div className="ad__row adInv__acts" data-tour="inv-actions">
          {/* A DRAFT AND AN ISSUED INVOICE OFFER DIFFERENT THINGS, because
              they are different objects: a draft is still being written and
              can be issued or deleted; an issued one is a document somebody
              outside the studio is holding, so it is never deleted, but it
              CAN be corrected while it is unpaid or part paid (the copy they
              hold updates to match, and every edit is in the history). A
              total cannot go below what has been received. */}
          {inv.status === "Draft" ? (
            <>
              {client ? (
                <InvoiceBuilder
                  clientName={client.company}
                  projectTitle={getProjectsFor(inv.clientId).find((p) => p.id === inv.projectId)?.title}
                  invoice={inv}
                  trigger="Edit the draft"
                />
              ) : null}
              {/* Money that arrived before the invoice was issued: issue it and record the payment in one step. */}
              {client && t.total > 0 ? <RecordPayment invoice={inv} owed={t.total} noReceipt={noEmail} issueFirst /> : null}
              <IssueInvoice invoice={inv} />
              <DeleteDraft invoice={inv} />
            </>
          ) : inv.voided ? (
            /* A STRUCK INVOICE OFFERS NOTHING, because there is nothing left
               to do to it. Not emailing it, not chasing it, not taking money
               against it. What is offered is what is true. */
            null
          ) : (
            <>
              {/* SENDING IT IS AN ACTION ON THE INVOICE, not a step buried in
                  a menu. Both are safe to press twice -- the message log's
                  dedupe key means the second press sends nothing and says so
                  -- so neither asks for a confirmation.

                  A SETTLED INVOICE IS NOT ASKED FOR AGAIN. "Email invoice"
                  sends "Amount due", and a paid client does not need telling
                  they owe nothing; what they are owed is a receipt. */}
              {settled ? <SendReceipt invoiceId={inv.id} /> : <EmailInvoice id={inv.id} />}
              {t.due > 0 && status === "Overdue" ? <EmailReminder id={inv.id} /> : null}
              {t.due > 0 ? <RecordPayment invoice={inv} owed={t.due} noReceipt={noEmail} /> : <span className="ad__dim">Settled. Nothing left to record.</span>}
              {client ? (
                <InvoiceBuilder
                  clientName={client.company}
                  projectTitle={getProjectsFor(inv.clientId).find((p) => p.id === inv.projectId)?.title}
                  invoice={inv}
                  trigger="Edit invoice"
                />
              ) : null}
            </>
          )}
        </div>}>
        <p className="adInv__status"><InvoicePill status={status} />{status === "Overdue" ? <span className="ad__pill ad__pill--bad">{lateDays} {lateDays === 1 ? "day" : "days"} late</span> : null}</p>
      </PageHead>

      {inv.voided ? (
        <p className="ad__banner" role="status">
          <b>Struck on {when(inv.voided.at)} by {inv.voided.by}.</b>{" "}
          {inv.voided.reason} The number stays taken and the client&apos;s copy
          still opens, saying nothing is owed. It is out of the outstanding
          total, out of the aging and out of the collection rate.
        </p>
      ) : null}


      <Workbench railLabel="About this invoice" rail={rail}>
        <StatTiles items={[
          { label: "Total", value: naira(t.total), note: inv.vatRate ? `Includes VAT at ${inv.vatRate}%` : "No VAT", icon: FileText, tone: "brand" },
          { label: "Paid", value: naira(inv.paid), note: `${payments.length} ${payments.length === 1 ? "payment" : "payments"}`, icon: CheckCircle2, tone: "good" },
          { label: "Owed", value: naira(t.due), note: inv.voided ? "Struck, nothing owed" : t.due ? (status === "Overdue" ? `${lateDays} ${lateDays === 1 ? "day" : "days"} late` : "Open") : "Settled", noteTone: status === "Overdue" ? "accent" : undefined, icon: Wallet, tone: t.due && status === "Overdue" ? "bad" : "neutral" },
          { label: "Due", value: dateWords(inv.due, now), note: status === "Overdue" ? "Past its terms" : inv.status === "Draft" ? "Set when it is sent" : "On its terms", icon: CalendarClock, tone: status === "Overdue" ? "bad" : "neutral" },
        ]} />
        <section className="adList" aria-label="Lines">
          <div className="adList__hd"><h2>Lines</h2><span className="adList__n">{inv.lines.length}</span></div>
          <div className="ad__scroll">
            <table className="ad__t">
              <thead>
                <tr><th>Description</th><th className="num">Qty</th><th className="num">Unit</th><th className="num">Total</th></tr>
              </thead>
              <tbody>
                {inv.lines.map((l, n) => (
                  <tr key={n}>
                    <td><b>{l.description}</b></td>
                    <td className="num">{l.qty}</td>
                    <td className="num">{naira(l.unit)}</td>
                    <td className="num">{naira(lineTotal(l))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="num ad__dim">Subtotal</td>
                  <td className="num">{naira(t.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="num ad__dim">VAT at {inv.vatRate}%</td>
                  <td className="num">{naira(t.vat)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="num"><b>Total</b></td>
                  <td className="num"><b>{naira(t.total)}</b></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <section className="adList" aria-label="Payments" data-tour="inv-payments">
          <div className="adList__hd"><h2>Payments</h2><span className="adList__n">{payments.length}</span></div>
          {payments.length ? (
            <div className="ad__scroll">
              <table className="ad__t">
                <thead><tr><th>Receipt</th><th>When</th><th>Method</th><th>Reference</th><th>Taken by</th><th className="num">Amount</th><th className="ad__rmH"><span className="ad__sr">Actions</span></th></tr></thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      {/* Opens the client's own copy, which is the document to
                          send when somebody asks for "the receipt". */}
                      <td>
                        <a href={`/r/${p.token}`} target="_blank" rel="noopener noreferrer">
                          <b>{p.receiptNo}</b>
                        </a>
                      </td>
                      <td className="num">{when(p.at)}</td>
                      <td>{p.method}{p.note ? <small className="ad__dim">{p.note}</small> : null}</td>
                      {/* THE IDEMPOTENCY KEY, shown on purpose. When a payment
                          is queried, this is the one field that ties our row to
                          the provider's, and it is unique so the webhook, the
                          callback and a manual entry cannot double-count. */}
                      <td className="ad__dim ad__num">
                        {p.reference}
                        {p.method === "Paystack" ? (
                          /* PAYSTACK'S OWN RECORD OF THE SAME CHARGE, one click
                             away rather than a copy-paste into their search box.
                             The dashboard itself decides test vs. live from
                             whichever the signed-in staff account has open --
                             there is no mode parameter in this URL to get
                             wrong. */
                          <a
                            href={`https://dashboard.paystack.com/#/transactions?search=${encodeURIComponent(p.reference)}`}
                            target="_blank" rel="noopener noreferrer"
                            style={{ display: "block", fontSize: ".75rem" }}
                          >
                            View on Paystack
                          </a>
                        ) : null}
                      </td>
                      <td className="ad__dim">{p.by}</td>
                      {/* What arrived, and under it what has since gone back:
                          the row's state is the refund rows summed. */}
                      <td className="num">{naira(p.amount)}{paymentState(p) !== "Received" ? <small className="ad__dim">{paymentState(p)}{paymentState(p) === "Part refunded" ? `, ${naira(refundedTotal(p))} back` : ""}</small> : null}</td>
                      <td className="ad__rmC">
                        <PaymentMenu payment={p} invoiceNumber={inv.number} noEmail={noEmail} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="Nothing received against this yet">
              {status === "Draft" ? "It has not been sent." : status === "Void" ? "Nothing was paid on this. It was cancelled, so its pay link no longer takes money." : "The pay link has not been used."}
            </Empty>
          )}
        </section>

        {/* Said where it is true rather than at the top of the screen: an
            overpaid invoice is a thing somebody has to decide about, and it is
            invisible from the totals alone. */}
        {inv.paid > t.total ? (
          <div className="ad__msg is-bad" role="status">
            <span>
              This invoice has taken {naira(inv.paid - t.total)} more than it is
              for. Nothing was rejected, because the money did arrive. Reverse
              the payment that is wrong, refund it from the payment&apos;s menu,
              or credit the difference here.
            </span>
            <CreditExcess currency={currencyOf(inv)} invoiceId={inv.id} over={inv.paid - t.total} reason={noEmail} />
          </div>
        ) : null}

        {inv.status !== "Draft" ? <InvoiceReconciliation row={recon} /> : null}

        {inv.status !== "Draft" ? (
          <CommsLog
            aboutIds={[inv.id, ...payments.map((p) => p.id)]}
            title={`What we have sent about ${inv.number}`}
          />
        ) : null}

      </Workbench>
    </>
  );
}
