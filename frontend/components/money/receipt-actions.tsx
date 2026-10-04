"use client";

import { Check, Copy, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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

  /* THE "MORE BELOW" FADE. A long slip scrolls inside its window, and the
     fade along the window's foot is what tells a reader it does. It shows
     only while there is more to read underneath: not on a slip that fits,
     and not once the reader has reached the end. */
  useEffect(() => {
    const rp = ref.current?.closest<HTMLElement>(".rp");
    const out = rp?.querySelector<HTMLElement>(".rp__out");
    if (!rp || !out) return;
    let frame = 0;
    const check = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        rp.classList.toggle("rp--more", out.scrollTop + out.clientHeight < out.scrollHeight - 4);
      });
    };
    check();
    out.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(out);
    const slip = out.firstElementChild;
    if (slip) ro.observe(slip);
    return () => {
      cancelAnimationFrame(frame);
      out.removeEventListener("scroll", check);
      ro.disconnect();
    };
  }, []);

  const replay = () => {
    const rp = ref.current?.closest<HTMLElement>(".rp");
    if (!rp) return;
    rp.classList.remove("rp--run");
    void rp.offsetWidth;
    rp.classList.add("rp--run");
    /* Print from the top of the slip again, as it first came out. */
    rp.querySelector(".rp__out")?.scrollTo({ top: 0 });
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
        <span aria-live="polite">
          {copied ? "Copied" : (
            <>
              <span className="rp__act-long">Copy receipt number</span>
              {/* Narrow phones: the short label keeps both buttons on one row. */}
              <span className="rp__act-short">Copy number</span>
            </>
          )}
        </span>
      </button>
    </div>
  );
}
