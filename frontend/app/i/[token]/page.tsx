import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getClient, getInvoiceByToken, getPaymentsFor } from "@/lib/admin/store";
import { invoiceStatus, invoiceTotals, lineTotal, naira } from "@/lib/admin/types";
import { DocumentShell, Headline, invoiceUrl } from "@/components/money/document";
import { CONTACT_EMAIL } from "@/lib/site";

/**
 * One invoice, for the person who has to pay it.
 *
 * ADDRESSED BY A RANDOM TOKEN, NEVER BY ITS NUMBER. Invoice numbers are
 * sequential by design -- that is what makes them auditable -- so a page at
 * /i/INV-2026-004 would hand anyone holding one invoice every other invoice
 * the studio has ever raised, by subtracting one. The token is 128 bits from
 * `crypto.randomUUID`, it is the entire authorisation, and a wrong one gets a
 * plain 404 rather than a message confirming the format was right.
 *
 * NOINDEX, AND NOT ONLY BY META TAG. The robots file disallows /i/ and /r/ as
 * well, and neither is in the sitemap. A crawler that finds a token in a
 * forwarded email should not be the reason an invoice ends up in a search
 * index.
 *
 * WHAT IT DELIBERATELY DOES NOT SHOW: the client's own record, other invoices,
 * project internals, or anything about the studio's books. A person with this
 * link is being shown one document and nothing else.
 */
export const metadata: Metadata = {
  title: "Invoice",
  robots: { index: false, follow: false, nocache: true },
  /* Explicitly cleared. The root layout sets a canonical to the site root and
     metadata is INHERITED, so without this every invoice would be telling
     crawlers it is a duplicate of the homepage. */
  alternates: { canonical: undefined },
};

/* WHY A CHECKOUT DID NOT START, IN THE PAYER'S WORDS.

   The route bounces back here with one of these rather than rendering its own
   error page, because the thing the payer wants next is the invoice itself,
   not a dead end with a Back button. Each case is a different sentence: "we
   are not sure it worked" and "we have no address for you" need different
   actions from them.

   NONE OF THEM SENDS SOMEBODY OFF TO MAKE A TRANSFER. They used to. That is
   how an invoice ends up paid by an untracked transfer nobody can match, and
   it is the studio, not the client, who then spends the afternoon on it. When
   the checkout will not open the honest instruction is to try again or write
   to us, because we can send a fresh link. */
const PAY_PROBLEMS: Record<string, string> = {
  busy: "That has been tried a few times in the last few minutes. Give it a moment and try again.",
  settled: "This invoice has already been paid in full, so there is nothing to charge.",
  voided: "This invoice has been cancelled, so there is nothing to pay on it.",
  "no-email": "We do not have an email address on file for you, and the checkout needs one to send your receipt to. Write to us and we will sort it out.",
  unavailable: "The checkout would not open just now, and nothing has been charged. Try again in a minute, or write to us and we will send you a fresh link.",
};

export default async function PublicInvoice({
  params, searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const inv = getInvoiceByToken(token);
  /* A draft has not been sent to anybody, so there is nothing here to show
     even with the right token: 404 is the truthful answer. */
  if (!inv || inv.status === "Draft") notFound();

  const client = getClient(inv.clientId);
  const t = invoiceTotals(inv);
  const status = invoiceStatus(inv);
  const payments = getPaymentsFor(inv.id);
  const settled = t.due <= 0;

  const q = await searchParams;
  const flag = Array.isArray(q.pay) ? q.pay[0] : q.pay;
  const problem = flag ? PAY_PROBLEMS[flag] : undefined;

  /* THE BUTTON IS ONLY OFFERED WHEN IT CAN ACTUALLY WORK. Paystack needs an
     email address for the payer, and a checkout that opens and then refuses is
     worse than a page that never offered one. Where there is no address the
     panel below says to write to us instead, and we send a link -- which is a
     real answer rather than a dead end, and keeps the money on the one route
     the books can follow. */
  const canCheckout = !settled && !inv.voided && Boolean(client?.email?.trim());

  return (
    <DocumentShell
      kind="Invoice"
      number={inv.number}
      url={invoiceUrl(inv.token)}
      qrLabel={`Reopen invoice ${inv.number}`}
      /* NO STAMP ON AN INVOICE THAT IS SIMPLY WAITING. Settled, part paid and
         overdue are all facts worth pressing into the corner; "sent, not yet
         due" is the default state of every invoice and stamping it would make
         the mark mean nothing. The empty corner is the right answer there. */
      stamp={
        inv.voided ? "void"
          : settled ? "paid"
            : status === "Overdue" ? "overdue"
              : status === "Part paid" ? "part"
                : undefined
      }
    >
      {/* A STRUCK INVOICE STILL OPENS, AND SAYS SO ON ITS FACE.

          The alternative was a 404, and a 404 on a document somebody is
          holding reads as the studio having made it disappear. The number
          stays taken, the page stays live, and it says plainly that nothing is
          owed -- which is the one thing the person holding it needs to know.
          The reason is shown too, because "why does this say void" is the
          question they will ask next. */}
      {inv.voided ? (
        <p className="doc__void" role="status">
          <b>This invoice has been cancelled.</b> Nothing is owed on it and no
          payment should be made against it
          {inv.voided.reason ? `: ${inv.voided.reason}` : "."} If you were
          expecting a bill for this work, one will follow under a new number.
        </p>
      ) : null}

      <Headline
        label={inv.voided ? "Cancelled, nothing owed" : settled ? "Paid in full" : "Amount due"}
        amount={inv.voided ? 0 : settled ? t.total : t.due}
        clear={settled && !inv.voided}
        pill={
          inv.voided
            ? { text: "Cancelled", tone: "bad" }
            : settled
            ? { text: "Settled", tone: "good" }
            /* ORANGE, NOT RED. Red is where something has gone wrong -- a
               reversed payment, a failed charge. An invoice past its date is
               not a failure, it is a nudge, and the studio has to send these
               to people it wants to keep working with. */
            : status === "Overdue"
              ? { text: "Past its due date", tone: "due" }
              : status === "Part paid"
                ? { text: `${naira(inv.paid)} received so far`, tone: "warn" }
                : undefined
        }
      />

      <dl className="doc__meta">
        <div>
          <dt>Billed to</dt>
          <dd>{client?.company ?? "—"}</dd>
        </div>
        <div>
          <dt>Issued</dt>
          <dd>{new Date(inv.issued).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</dd>
        </div>
        <div>
          <dt>Due</dt>
          <dd>{new Date(inv.due).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</dd>
        </div>
      </dl>

      <div className="doc__scroll">
        <table className="doc__lines">
          <thead>
            {/* A RUNNING HEAD, PRINT ONLY.

                `table-header-group` reprints a thead after every page break,
                so anything in here comes back on each sheet. Sheet two of a
                long invoice was otherwise anonymous: columns of money with no
                number and no client on it, which is a real problem the moment
                a stapled copy comes apart on somebody's desk. */}
            <tr className="doc__run">
              <th colSpan={4}>
                {inv.number}{client ? ` · ${client.company}` : ""}
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
            {inv.lines.map((l, n) => (
              <tr key={n}>
                <td>{l.description}</td>
                <td className="n">{l.qty}</td>
                <td className="n">{naira(l.unit)}</td>
                <td className="n">{naira(lineTotal(l))}</td>
              </tr>
            ))}
          </tbody>
          {/* EVERY FIGURE RECOMPUTED FROM THE LINES, never read from a stored
              total. A stored total is a second source of truth, and the day it
              disagrees with the first is the day somebody is billed wrong. */}
          <tfoot>
            <tr>
              <td colSpan={3} className="n">Subtotal</td>
              <td className="n">{naira(t.subtotal)}</td>
            </tr>
            <tr>
              <td colSpan={3} className="n">VAT at {inv.vatRate}%</td>
              <td className="n">{naira(t.vat)}</td>
            </tr>
            {inv.paid > 0 ? (
              <tr>
                <td colSpan={3} className="n">Received</td>
                <td className="n">−{naira(inv.paid)}</td>
              </tr>
            ) : null}
            <tr>
              <td colSpan={3} className="n">{settled ? "Total" : "Due"}</td>
              <td className="n">{naira(settled ? t.total : t.due)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {payments.length ? (
        <>
          <h2 className="doc__sub">
            Payments received
          </h2>
          <div className="doc__scroll">
            <table className="doc__lines">
              <thead>
                <tr><th>Receipt</th><th>When</th><th>How</th><th className="n">Amount</th></tr>
              </thead>
              <tbody>
                {/* REVERSED ROWS STAY, STRUCK THROUGH. A client comparing this
                    against their own bank statement needs to see that the
                    payment was received and then went back; a list it silently
                    disappears from is a list they cannot reconcile, and the
                    first thing they will do is email to ask. */}
                {payments.map((p) => (
                  <tr key={p.id} className={p.reversed ? "is-void" : undefined}>
                    <td><a href={`/r/${p.token}`}>{p.receiptNo}</a></td>
                    <td>{new Date(p.at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td>
                      {p.method}
                      {p.reversed ? <><br /><small>Reversed, not counted</small></> : null}
                    </td>
                    <td className="n">{naira(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {/* NOTHING ABOUT PAYING A CANCELLED INVOICE. A "how to pay" panel under a
          document that says nothing is owed is an invitation to send money
          that will then have to be sent back. */}
      {!settled && !inv.voided ? (
        <section className="doc__pay">
          <h2>How to pay</h2>

          {/* SAID BEFORE THE BUTTON, NOT AFTER IT. Something went wrong on the
              last attempt and the payer is standing here wondering whether
              they have been charged. Each of these is a different answer and
              none of them is "an error occurred". */}
          {problem ? <p className="doc__warn">{problem}</p> : null}

          {/* A REAL FORM, A REAL POST. Not a fetch and not a link: a link that
              spends money can be followed by a prefetcher or a mail scanner,
              and a fetch would put this behind JavaScript for no gain. The
              route reads nothing from the body -- the amount and the invoice
              come off the token in the URL, because a form field is a number
              the payer can edit. */}
          {canCheckout ? (
            <form method="post" action={`/api/pay/${inv.token}`} className="doc__actions">
              {/* THE AMOUNT AND THE VERB, AND NOTHING ELSE IN THE LABEL. It
                  used to carry "by card or transfer" as well, which is a
                  sentence about method inside a control whose job is the
                  figure. The method moved to the line under it, where it
                  reassures without competing.

                  A CARD ON THE LEFT AND AN ARROW ON THE RIGHT, and the two do
                  different jobs. The card says what kind of thing this is
                  before the label is read, which is most of what an icon on a
                  button is for. The arrow says the press LEAVES the page,
                  which on a payment button is worth saying: the payer lands on
                  Paystack's domain, and a person who was not expecting that is
                  a person who abandons a checkout.

                  Drawn inline rather than pulled from lucide, because these
                  are two paths on a document that otherwise ships no icon set,
                  and an icon package for eight lines of SVG is a dependency
                  for a small effect. Both are `aria-hidden`: the label already
                  says "Pay ₦377,250.00", and a screen reader announcing "credit
                  card, arrow right" around it adds nothing. */}
              <button className="doc__btn doc__btn--pay" type="submit">
                <svg className="doc__btn__ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2" y="5" width="20" height="14" rx="2.5" />
                  <path d="M2 10h20" />
                  <path d="M6 15h3" />
                </svg>
                Pay {naira(t.due)}
                <svg className="doc__btn__go" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
              <small>
                Card or bank transfer, on Paystack&rsquo;s own secure page.
              </small>
            </form>
          ) : null}

          {/* ONE WAY TO PAY, AND IT IS THE ONE THAT WORKS.

              This used to offer bank transfer as an alternative under the
              button, which read as a second, equal option. It is not one. The
              studio collects through Paystack, and Paystack's own page already
              offers a transfer to a one-time account alongside the card, so
              "prefer a bank transfer?" was sending people out to email for
              something the button in front of them does better and records
              automatically.

              The other methods in the books -- transfer, cash, POS -- are the
              studio's, for entering money that arrived some other way or
              sorting out a payment that went wrong. They are not a menu a
              client picks from, and a document that showed them as one is what
              produces the untracked transfer somebody then has to reconcile by
              hand. */}
          {canCheckout ? (
            /* The method is already said under the button. This is the other
               half: what to do when the button does not work, which is the
               only thing left for this panel to answer. */
            <p>
              Anything that goes wrong, write to{" "}
              <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(inv.number)}`}>{CONTACT_EMAIL}</a>{" "}
              quoting <b>{inv.number}</b> and we will sort it out.
            </p>
          ) : (
            /* No checkout, so this is the only route left and it has to carry
               the whole answer rather than read as a fallback. */
            <p>
              Write to{" "}
              <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(inv.number)}`}>{CONTACT_EMAIL}</a>{" "}
              quoting <b>{inv.number}</b> and we will send you a payment link
              for this invoice.
            </p>
          )}
        </section>
      ) : null}
    </DocumentShell>
  );
}
