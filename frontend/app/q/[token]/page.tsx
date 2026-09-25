import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getClient, getEstimateByToken, getInvoice, getProject } from "@/lib/admin/store";
import { estimateState, estimateTotals, lineTotal, naira } from "@/lib/admin/types";
import { DocumentShell, Headline, estimateUrl, invoiceUrl } from "@/components/money/document";
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

  const client = getClient(est.clientId);
  const project = est.projectId ? getProject(est.projectId) : null;
  const invoice = est.invoiceId ? getInvoice(est.invoiceId) : null;
  const t = estimateTotals(est);
  const state = estimateState(est);

  const day = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <DocumentShell
      kind="Estimate"
      number={est.number}
      url={estimateUrl(est.token)}
      qrLabel={`Reopen estimate ${est.number}`}
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
        <p className="doc__void" role="status">
          <b>This estimate has expired.</b> The price above stood until{" "}
          {day(est.expires)} and is no longer held. We would be glad to quote
          again; nothing here has changed, so it is a short conversation.
        </p>
      ) : null}
      {state === "Expired" ? (
        <div className="doc__actions">
          <a className="doc__btn doc__btn--ghost" href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`A new quote for ${est.number}`)}`}>Ask for a new quote</a>
          <small>Or write to {CONTACT_EMAIL} and mention {est.number}.</small>
        </div>
      ) : null}

      {state === "Declined" && est.answered ? (
        <p className="doc__void" role="status">
          <b>This estimate was declined on {day(est.answered.at)}.</b>{" "}
          {est.answered.note ? `${est.answered.note} ` : ""}
          It is kept here so both sides have the record of what was quoted.
        </p>
      ) : null}

      <Headline
        label={state === "Accepted" ? "Agreed" : "Estimate"}
        amount={t.total}
        clear={state === "Accepted"}
        pill={
          state === "Accepted"
            ? { text: est.answered ? `Accepted by ${est.answered.by}` : "Accepted", tone: "good" }
            : state === "Declined"
              ? { text: "Declined", tone: "bad" }
              : state === "Expired"
                ? { text: `Expired ${day(est.expires)}`, tone: "bad" }
                : { text: `Holds until ${day(est.expires)}`, tone: "due" }
        }
      />

      <dl className="doc__meta">
        <div>
          <dt>For</dt>
          <dd>{client?.company ?? "–"}</dd>
        </div>
        <div>
          <dt>Issued</dt>
          <dd>{day(est.issued)}</dd>
        </div>
        <div>
          <dt>{state === "Expired" ? "Expired" : "Holds until"}</dt>
          <dd>{day(est.expires)}</dd>
        </div>
        {project ? (
          <div>
            <dt>Project</dt>
            <dd>{project.title}</dd>
          </div>
        ) : null}
      </dl>

      <div className="doc__scroll">
        <table className="doc__lines">
          <thead>
            <tr className="doc__run">
              <th colSpan={4}>
                {est.number}{client ? ` · ${client.company}` : ""}
              </th>
            </tr>
            <tr>
              <th>What for</th>
              <th className="n">Qty</th>
              <th className="n">Unit</th>
              <th className="n">Total</th>
            </tr>
          </thead>
          <tbody>
            {est.lines.map((l, n) => (
              <tr key={n}>
                <td>{l.description}</td>
                <td className="n">{l.qty}</td>
                <td className="n">{naira(l.unit)}</td>
                <td className="n">{naira(lineTotal(l))}</td>
              </tr>
            ))}
          </tbody>
          {/* EVERY FIGURE RECOMPUTED FROM THE LINES, and the discount applied
              to the sum rather than per line -- a per-line discount summed
              drifts from the total beside it by a kobo or two, on the same
              page. */}
          <tfoot>
            <tr>
              <td colSpan={3} className="n">Subtotal</td>
              <td className="n">{naira(t.subtotal)}</td>
            </tr>
            {t.discount > 0 ? (
              <tr>
                <td colSpan={3} className="n">Discount at {est.discount}%</td>
                <td className="n">−{naira(t.discount)}</td>
              </tr>
            ) : null}
            <tr>
              <td colSpan={3} className="n">VAT at {est.vatRate}%</td>
              <td className="n">{naira(t.vat)}</td>
            </tr>
            <tr>
              <td colSpan={3} className="n">Total</td>
              <td className="n">{naira(t.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

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
            This estimate was accepted and billed as{" "}
            <a href={invoiceUrl(invoice.token)}><b>{invoice.number}</b></a>, which
            is where the amount owed and the ways to pay it live. This page stays
            as the record of what was agreed.
          </p>
        </section>
      ) : state === "Sent" ? (
        <section className="doc__pay">
          <h2>To accept it</h2>
          {/* NO ACCEPT BUTTON, AND THE REASON IS SAID RATHER THAN HIDDEN. A
              click on a public page addressed by a token is not a signature,
              and treating it as one would let anybody the link was forwarded
              to commit the client to a price. A reply is both a real answer
              and a record of who gave it. */}
          <p>
            Reply to the email this came with, or write to{" "}
            <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(est.number)}`}>{CONTACT_EMAIL}</a>,
            and we will raise the invoice and get started.
          </p>
          <p>
            Quote <b>{est.number}</b> so it reaches the right piece of work.
            Nothing is owed until an invoice follows.
          </p>
        </section>
      ) : null}
    </DocumentShell>
  );
}
