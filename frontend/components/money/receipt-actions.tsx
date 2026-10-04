"use client";

import { Check, Copy, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";

/**
 * Replay and Copy, under the printing receipt. The only JavaScript the printer
 * has: the printing itself is CSS (see receipt-printer.tsx).
 *
 * REPLAY RESTARTS THE CSS, it does not re-render anything: taking `rp--run`
 * off the printer and putting it back, with a reflow between, starts every
 * keyframe from zero. Hidden under reduced motion, where there is no feed to
 * replay.
 */
export default function ReceiptActions({ receiptNo }: { receiptNo: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const replay = () => {
    const rp = ref.current?.closest<HTMLElement>(".rp");
    if (!rp) return;
    rp.classList.remove("rp--run");
    void rp.offsetWidth;
    rp.classList.add("rp--run");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(receiptNo);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* No clipboard (an insecure context, or permission refused): the
         number is printed on the slip and in the email either way. */
    }
  };

  return (
    <div ref={ref} className="rp__actions">
      <button type="button" className="btn-secondary rp__act rp__act--replay" onClick={replay}>
        <RotateCcw aria-hidden="true" />
        Replay
      </button>
      <button type="button" className="btn-secondary rp__act" onClick={copy}>
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        <span aria-live="polite">{copied ? "Copied" : "Copy receipt number"}</span>
      </button>
    </div>
  );
}
