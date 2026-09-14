import { naira } from "@/lib/admin/types";
import "./receipt-printer.css";

/**
 * The slip that prints itself, after money has actually arrived.
 *
 * WHEN IT RUNS IS THE IMPORTANT PART. This renders only on the `paid` branch
 * of /pay/done, which is reached only after `verifyTransaction` has asked
 * Paystack what happened and `applyPayment` has banked it. A celebration on a
 * page that has not confirmed the money is a lie told in animation, and it is
 * the easiest kind to ship by accident -- the reference this was asked for
 * fires on arrival at a success URL, which is a query string.
 *
 * NO JAVASCRIPT. Not "a small amount": none. The whole thing is one CSS
 * animation on a server-rendered element, so it costs no bundle, no hydration
 * and no main-thread work beyond compositing two transforms. That matters more
 * here than anywhere else on the site, because this page is reached on a phone
 * on Nigerian mobile data, immediately after somebody has parted with money.
 *
 * IT FEEDS IN STEPS, WHICH IS THE WHOLE TRICK. A thermal printer advances the
 * paper one line at a time, and a slip that slides out smoothly reads as a
 * card sliding rather than a receipt printing. `steps(24)` over 1.4s is about
 * 58ms a line, which is close to a real till roll and is the single thing that
 * makes this feel like the object it is imitating.
 *
 * NO LOGO ON THE SLIP. The document at /r/<token> is the receipt and carries
 * the mark; this is the moment, not the record. Branding it twice would make
 * the animation look like the thing to keep, and it is not -- the link under
 * it is.
 */
export default function ReceiptPrinter({
  amount, receiptNo, number, method, at, outstanding,
}: {
  amount: number;
  receiptNo: string;
  /** The invoice it went against. */
  number: string;
  method: string;
  /** ISO. */
  at: string;
  outstanding: number;
}) {
  const day = new Date(at).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <div className="rp">
      {/* The machine. Two rounded slabs and a slot, drawn rather than
          pictured: an image here would be a network request on the one page
          where somebody is already waiting. */}
      <div className="rp__box" aria-hidden="true">
        <span className="rp__led" />
        <span className="rp__slot" />
      </div>

      {/* The clip. The slip is its own height, starts translated fully above
          it, and ends at rest -- so the paper appears out of the slot without
          anything animating a height, which would be layout on every frame. */}
      <div className="rp__out">
        <div className="rp__slip">
          <p className="rp__k">Payment received</p>
          <p className="rp__big">{naira(amount)}</p>

          <dl className="rp__rows">
            <div><dt>Receipt</dt><dd>{receiptNo}</dd></div>
            <div><dt>Paid</dt><dd>{day}</dd></div>
            <div><dt>Method</dt><dd>{method}</dd></div>
            <div><dt>Against</dt><dd>{number}</dd></div>
          </dl>

          <p className={`rp__state${outstanding > 0 ? " rp__state--part" : ""}`}>
            {outstanding > 0
              ? <>{naira(outstanding)} still outstanding</>
              : <>{number} settled in full</>}
          </p>

          <p className="rp__ta">Thank you</p>
        </div>
      </div>
    </div>
  );
}
