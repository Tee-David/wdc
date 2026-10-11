import PaymentAccount from "@/components/money/payment-account";
import {currencyOf,money} from "@/lib/money/currency";
import ReceiptControls from "@/components/money/receipt-controls";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getClient, getEstimateByToken, getInvoice, getProject } from "@/lib/admin/store";
import { estimateState, estimateTotals, lineTotal } from "@/lib/admin/types";
import { DocumentShell, DocNote, DocTotals, docDay, estimateUrl, invoiceUrl, type DocTag } from "@/components/money/document";
import { CONTACT_EMAIL } from "@/lib/site";
import { persistSoon, syncStore } from "@/lib/admin/persist";

/**
 * An estimate, for the person deciding whether to say yes.
 *
 * IT IS A DIFFERENT DOCUMENT FROM AN INVOICE and it reads like one. An invoice
 * answers "how much do I owe and how do I pay it". This answers "what am I
 * getting, for how much, and until when" -- so the terms and what is included
 * are on the page rather than in the covering email, and there is no pay
 * button anywhere on it. Nobody should be able to pay a quote.
 *
 * ADDRESSED BY A RANDOM TOKEN, like the invoice and the receipt, and for the
 * same reason: EST-2026-003 is one subtraction away from EST-2026-002.
 *
 * A DRAFT HAS NO PUBLIC PAGE. It is a document the studio has not finished
 * writing, and a 404 is the truthful answer to a token for one.
 */
export const metadata: Metadata = {
  title: "Estimate",
  robots: { index: false, follow: false, nocache: true },
  alternates: { canonical: undefined },
};

export default async function PublicEstimate({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await syncStore();
  persistSoon();
  const { token } = await params;
  const est = getEstimateByToken(token);
  if (!est || est.state === "Draft") notFound();
  const naira=(amount:number)=>money(amount,currencyOf(est));

  const client = getClient(est.clientId);
  const project = est.projectId ? getProject(est.projectId) : null;
  const invoice = est.invoiceId ? getInvoice(est.invoiceId) : null;
  const t = estimateTotals(est);
  const state = estimateState(est);

  const day = docDay;
  const mail = (subject: string) => `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;
  const tag: DocTag =
    state === "Accepted" ? { text: "Accepted", tone: "good" }
      : state === "Declined" ? { text: "Declined", tone: "flat" }
        : state === "Expired" ? { text: "Expired", tone: "bad" }
          : { text: "Open", tone: "brand" };

  return (
    <DocumentShell
      kind="Quote"
      number={est.number}
      url={estimateUrl(est.token)}
      qrLabel={`Reopen quote ${est.number}`}
      tag={tag}
      /* THE CORNER SAYS WHAT HAPPENED TO IT. A live quote gets no stamp at
         all: "sent, waiting" is the default state of every estimate and
         marking it would make the mark mean nothing. */
      stamp={
        state === "Accepted" ? "paid"
          : state === "Declined" ? "failed"
            : state === "Expired" ? "void"
              : undefined
      }
    >
      {state === "Expired" ? (
        <DocNote tone="bad">
          <b>This quote has expired.</b> The price stood until {day(est.expires)} and is no longer held. Write to us and we will refresh it, usually the same day.
        </DocNote>
      ) : null}

      {state === "Accepted" ? (
        <DocNote>Accepted{est.answered ? ` by ${est.answered.by}` : ""}{est.answered ? ` on ${day(est.answered.at)}` : ""}. {invoice ? "The invoice is linked below." : "The invoice follows, and the team starts when it is paid."}</DocNote>
      ) : null}

      {state === "Declined" && est.answered ? (
        <DocNote tone="warn">
          <b>This quote was declined on {day(est.answered.at)}.</b>{" "}
          {est.answered.note ? `${est.answered.note} ` : ""}
          It is kept here so both sides have the record of what was quoted. If that changes, write to us and we will reopen it.
        </DocNote>
      ) : null}

      <dl className="doc__meta docMetaG">
        <div>
          <dt>Billed to</dt>
          <dd><strong>{client?.company ?? "–"}</strong></dd>
        </div>
        <div>
          <dt>Issued</dt>
          <dd>{day(est.issued)}</dd>
        </div>
        <div>
          <dt>{state === "Expired" ? "Expired" : "Valid until"}</dt>
          <dd><strong className={state === "Expired" ? "doc__late" : undefined}>{day(est.expires)}</strong></dd>
        </div>
        {project ? (
          <div>
            <dt>Project</dt>
            <dd>{project.title}</dd>
          </div>
        ) : null}
      </dl>

      {est.paymentAccount?<PaymentAccount account={est.paymentAccount} reference={est.number}/>:null}
      <div className="doc__scroll" tabIndex={0} aria-label="Lines, scrolls sideways">
        <table className="doc__lines">
          <thead>
            <tr className="doc__run">
              <th colSpan={4}>
                {est.number}{client ? ` · ${client.company}` : ""}
              </th>
            </tr>
            <tr>
              <th scope="col">Description</th>
              <th scope="col" className="n">Qty</th>
              <th scope="col" className="n">Unit</th>
              <th scope="col" className="n">Amount</th>
            </tr>
          </thead>
          <tbody>
            {est.lines.map((l, n) => (
              <tr key={n}>
                <td><strong>{l.description}</strong></td>
                <td className="n">{l.qty}</td>
                <td className="n">{naira(l.unit)}</td>
                <td className="n">{naira(lineTotal(l))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* EVERY FIGURE RECOMPUTED FROM THE LINES, and the discount applied
          to the sum rather than per line -- a per-line discount summed
          drifts from the total beside it by a kobo or two, on the same
          page. */}
      <DocTotals
        rows={[
          { k: "Subtotal", v: naira(t.subtotal) },
          ...(t.discount > 0 ? [{ k: `Discount ${est.discount}%`, v: `−${naira(t.discount)}` }] : []),
          { k: `VAT ${est.vatRate}%`, v: naira(t.vat) },
          { k: "Total", v: naira(t.total), strong: true },
        ]}
      />

      {/* WHAT IS INCLUDED AND ON WHAT TERMS, on the document rather than in
          the covering email. The email is the thing nobody can find in
          December; this is the thing an argument gets settled against. */}
      {est.notes ? (
        <>
          <h2 className="doc__sub">What this covers</h2>
          <p className="doc__note">{est.notes}</p>
        </>
      ) : null}

      {est.terms ? (
        <>
          <h2 className="doc__sub">Terms</h2>
          <p className="doc__note">{est.terms}</p>
        </>
      ) : null}

      {invoice ? (
        <section className="doc__pay">
          <h2>Invoiced</h2>
          <p>
            This quote was accepted and billed as{" "}
            <a href={invoiceUrl(invoice.token)}><b>{invoice.number}</b></a>, which
            is where the amount owed and the ways to pay it live. This page stays
            as the record of what was agreed.
          </p>
        </section>
      ) : state === "Sent" ? (
        <section className="doc__pay">
          <h2>Your answer</h2>
          {/* THE ANSWER IS AN EMAIL, AND THE REASON IS SAID RATHER THAN HIDDEN.
              A click on a public page addressed by a token is not a
              signature, and treating it as one would let anybody the link was
              forwarded to commit the client to a price. A reply is both a real
              answer and a record of who gave it, so each button opens a
              message to the studio with this quote's number on it. */}
          <p>Reply to accept or decline. We raise the invoice and get started once we hear from you, and nothing is owed until an invoice follows.</p>
          <div className="bareRow doc__answer">
            <a className="bareBtn" href={mail(`Accepting quote ${est.number}`)}>Accept this quote</a>
            <a className="bareBtn is-2" href={mail(`Declining quote ${est.number}`)}>Decline</a>
          </div>
          <a className="bareBtn is-2" href={mail(`A question about quote ${est.number}`)}>Ask a question first</a>
          <p className="doc__hint">Each button opens an email to {CONTACT_EMAIL} with <b>{est.number}</b> on it, so your answer reaches the right piece of work.</p>
        </section>
      ) : state === "Expired" ? (
        <section className="doc__pay">
          <h2>Still interested?</h2>
          <a className="bareBtn" href={mail(`A new quote for ${est.number}`)}>Ask for a new quote</a>
          <p className="doc__hint">Or write to {CONTACT_EMAIL} and mention {est.number}.</p>
        </section>
      ) : null}

      <ReceiptControls token={est.token} kind="Estimate" number={est.number} />
      <p className="doc__hint">Quote {est.number}. Questions are welcome before you decide.</p>
    </DocumentShell>
  );
}
