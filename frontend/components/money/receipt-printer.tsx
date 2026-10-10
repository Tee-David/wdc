import {money} from "@/lib/money/currency";
import ReceiptActions from "./receipt-actions";
import "./receipt-printer.css";

/**
 * The payment receipt that prints itself, after money has actually arrived.
 *
 * THE DESIGN IS EASYUI'S PAYMENT RECEIPT PRINTER (MIT, Suraj Maurya,
 * github.com/Surajmaurya1/easyui), chosen by the owner on 2026-10-04: a status
 * card, a printer that shivers while it feeds, and a thermal slip with the
 * order, the lines, the totals and a barcode, under Replay and Copy. What is
 * ours: the colours (navy chassis, orange light, cream paper, the brand's
 * solid orange-fill chip), every figure on the slip, and the engine.
 *
 * THE ENGINE IS CSS, NOT FRAMER MOTION. The original animates with motion's
 * React components. This page is reached on a phone, on mobile data, a moment
 * after somebody has parted with money, so the feed, the shiver and the status
 * lights are keyframes on server-rendered markup: no animation library in the
 * bundle and nothing waiting on hydration. The only JavaScript is the two
 * buttons under it (receipt-actions.tsx).
 *
 * WHEN IT RUNS IS THE IMPORTANT PART. This renders only on the `paid` branch of
 * /pay/done, which is reached only after `verifyTransaction` has asked
 * Paystack what happened and the payment has been banked. Nothing on the slip
 * comes from the query string.
 *
 * NOTHING INVENTED. The original prints an "AUTH #" line and a merchant tag;
 * those are gone. The barcode is decoration (it is not a scannable code, and
 * says so to assistive technology by being hidden from it); the number under
 * it is the real receipt number.
 *
 * BOTTOM FIRST, and tests/receipt-feed.spec.ts holds it to that: the slip
 * starts above the slot and slides down, so its foot clears the slot first.
 */
export type ReceiptLine = { description: string; qty: number; amount: number };

export default function ReceiptPrinter({
  amount, receiptNo, number, method, at, outstanding, lines, subtotal, vat, vatRate, total, currency="NGN", refunded=0, reversed=false,
}: {
  /** Kobo, this payment. */
  currency?: string;
  refunded?: number;
  reversed?: boolean;
  amount: number;
  receiptNo: string;
  /** The invoice it went against. */
  number: string;
  method: string;
  /** ISO. */
  at: string;
  /** Kobo still owed on the invoice after this payment. */
  outstanding: number;
  lines: ReceiptLine[];
  subtotal: number;
  vat: number;
  vatRate: number;
  total: number;
}) {
  const naira=(value:number)=>money(value,currency);
  const status=reversed?"Payment reversed":refunded>=amount?"Payment refunded":refunded>0?"Payment partially refunded":"Payment received";
  const when = new Date(at);
  const day = when.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" });
  const time = when.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });

  return (
    <section className="rp rp--run" aria-label="Payment receipt">
      {/* 1. The status card. */}
      <div className="rp__status" role="status">
        {!reversed && !refunded ? <span className="rp__tick" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
        </span> : null}
        <span className="rp__said">
          <b>{status}</b>
          <small>Receipt {receiptNo} issued</small>
        </span>
        <span className="rp__lamp" aria-hidden="true">
          <i className="rp__dot" />
          <span className="rp__lbl"><span className="rp__busy">Printing</span><span className="rp__done">Ready</span></span>
        </span>
      </div>

      {/* 2. The printer. Drawn, not pictured: no image request on the one
          page where somebody is already waiting. */}
      <div className="rp__machine" aria-hidden="true">
        <div className="rp__bar">
          <span className="rp__brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/icon-white-accent.svg" alt="" width={16} height={16} />
            We Dig Creativity
          </span>
          <span className="rp__pill">
            <i className="rp__led" />
            <span className="rp__lbl"><span className="rp__busy">Feed</span><span className="rp__done">Online</span></span>
          </span>
        </div>
        <span className="rp__slot" />
      </div>

      {/* 3. The slip, clipped under the slot. ITS OWN SCROLL WINDOW: a long
          invoice prints a long slip, and on a phone that pushed the buttons
          under it off the screen. The window is capped to what the screen
          has left after the card, the printer and the buttons, so the whole
          printer stays in view and a long slip scrolls inside it. Focusable,
          so a keyboard can scroll it too. */}
      <div className="rp__win">
      <div className="rp__out" tabIndex={0} role="region" aria-label="Receipt details" data-lenis-prevent="">
        <div className="rp__slip">
          {/* Ticket notches either side of the first rule, as on a till roll. */}
          <i className="rp__notch rp__notch--l" aria-hidden="true" />
          <i className="rp__notch rp__notch--r" aria-hidden="true" />

          <header className="rp__head">
            <span className="rp__mark">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/icon-navy.svg" alt="" width={24} height={24} />
            </span>
            <p className="rp__who">We Dig Creativity</p>
            <p className="rp__what">Payment receipt</p>
          </header>

          <dl className="rp__rows rp__meta">
            <div><dt>Receipt no:</dt><dd className="rp__strong">{receiptNo}</dd></div>
            <div><dt>Date:</dt><dd>{day} · {time}</dd></div>
            <div><dt>Payment:</dt><dd>{method}</dd></div>
            <div><dt>Invoice:</dt><dd>{number}</dd></div>
          </dl>

          <div className="rp__items">
            <p className="rp__cols" aria-hidden="true"><span>Item</span><span>Amount</span></p>
            <ul>
              {lines.map((l, i) => (
                <li key={i}>
                  <span className="rp__item">{l.qty !== 1 ? <>{l.qty}× </> : null}{l.description}</span>
                  <span className="rp__n">{naira(l.amount)}</span>
                </li>
              ))}
            </ul>
          </div>

          <dl className="rp__rows rp__sums">
            <div><dt>Subtotal:</dt><dd>{naira(subtotal)}</dd></div>
            {vat > 0 ? <div><dt>VAT ({vatRate}%):</dt><dd>{naira(vat)}</dd></div> : null}
            <div><dt>Invoice total:</dt><dd>{naira(total)}</dd></div>
            <div className="rp__paid"><dt>Amount received:</dt><dd>{naira(amount)}</dd></div>
            {refunded>0 ? <div><dt>Refunded:</dt><dd>{naira(refunded)}</dd></div> : null}
            {refunded>0 || reversed ? <div><dt>Net payment:</dt><dd>{naira(reversed?0:Math.max(0,amount-refunded))}</dd></div> : null}
            <div className="rp__bal">
              <dt>Balance:</dt>
              <dd>{outstanding > 0 ? <>{naira(outstanding)} due</> : "Settled in full"}</dd>
            </div>
          </dl>

          <div className="rp__code">
            <svg aria-hidden="true" viewBox="0 0 160 40" preserveAspectRatio="none" fill="currentColor">
              {BARS.map(([x, w]) => <rect key={x} x={x} y="0" width={w} height="40" />)}
            </svg>
            <p>* {receiptNo} *</p>
          </div>

          <div className="rp__foot">
            <p className="rp__ta">{reversed || refunded>0 ? status : "Thank you for your payment."}</p>
            <p className="rp__fine">{number} · We Dig Creativity</p>
          </div>
        </div>
      </div>
      {/* The paper tab for a long slip: drag it to pull more out, or press
          it to feed the rest out at once. Shown only once the slip has been
          measured as longer than its window (receipt-actions.tsx). */}
      <button type="button" className="rp__pull" aria-label="Show the full receipt">
        <span className="rp__grip" aria-hidden="true"><i /><i /><i /></span>
        Pull for more
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      </div>

      {/* 4. Replay and Copy. */}
      <ReceiptActions receiptNo={receiptNo} />
    </section>
  );
}

/* The thermal barcode's bars, [x, width] in a 160-wide box. Decorative. */
const BARS: Array<[number, number]> = [
  [0, 3], [5, 1.5], [9, 4], [15, 2], [19, 1], [22, 3], [27, 1.5], [31, 5], [38, 2],
  [42, 1], [45, 4], [51, 2], [55, 1.5], [58, 3], [63, 5], [70, 1.5], [73, 3], [78, 2],
  [82, 4], [88, 1.5], [92, 3], [97, 1], [100, 4], [106, 2], [110, 3], [115, 1.5],
  [118, 5], [125, 2], [129, 1], [132, 4], [138, 2], [142, 1.5], [145, 3], [150, 2],
  [154, 4], [159, 1],
];
