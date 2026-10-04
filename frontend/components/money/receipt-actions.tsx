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

  /* THE LONG SLIP. A slip longer than its window scrolls inside it, shows a
     fade along the foot while there is more below (`rp--more`), and carries a
     paper tab that pulls it further out of the printer:

     - DRAG the tab down and the window grows under the finger, up to the
       whole slip;
     - TAP it (or Enter) and the rest feeds out in one smooth go;
     - while paper moves, the printer is "feeding" (`rp--feeding`): orange
       blinking light, the shiver, "Printing";
     - wholly out (`rp--full`), the cap, the tab and the fade go.

     Only the tab takes the gesture (touch-action: none on it alone), so the
     page keeps scrolling normally everywhere else. Replay tucks the paper
     back in. */
  useEffect(() => {
    const rp = ref.current?.closest<HTMLElement>(".rp");
    const out = rp?.querySelector<HTMLElement>(".rp__out");
    const tab = rp?.querySelector<HTMLButtonElement>(".rp__pull");
    if (!rp || !out || !tab) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let frame = 0;
    const check = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const full = rp.classList.contains("rp--full");
        rp.classList.toggle("rp--more", !full && out.scrollTop + out.clientHeight < out.scrollHeight - 4);
      });
    };

    const finish = () => {
      out.style.transition = "";
      out.style.maxHeight = "";
      rp.classList.remove("rp--feeding");
      rp.classList.add("rp--full");
      check();
    };

    /* Feed the rest out. Height is the one thing here that is not transform
       or opacity: it is the paper actually coming out, so the page below it
       has to move, and it only ever runs because the reader asked. */
    const glide = () => {
      const target = out.scrollHeight;
      if (reduce) return finish();
      rp.classList.add("rp--feeding");
      out.style.maxHeight = `${out.clientHeight}px`;
      void out.offsetHeight;
      out.style.transition = "max-height .7s cubic-bezier(.2, .8, .2, 1)";
      out.style.maxHeight = `${target}px`;
      const done = () => { out.removeEventListener("transitionend", done); finish(); };
      out.addEventListener("transitionend", done);
      window.setTimeout(done, 900);
    };

    let startY = 0, startH = 0, moved = false, dragging = false;
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      dragging = true;
      moved = false;
      startY = e.clientY;
      startH = out.clientHeight;
      tab.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const dy = e.clientY - startY;
      if (!moved && Math.abs(dy) < 4) return;
      if (!moved) { moved = true; rp.classList.add("rp--feeding"); }
      const full = out.scrollHeight;
      const h = Math.min(full, Math.max(startH, startH + dy));
      out.style.maxHeight = `${h}px`;
      check();
    };
    const up = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (tab.hasPointerCapture(e.pointerId)) tab.releasePointerCapture(e.pointerId);
      if (!moved) return; // a tap: the click handler feeds it out
      rp.classList.remove("rp--feeding");
      /* Pulled most of the way: let the rest drop out. */
      if (out.clientHeight >= out.scrollHeight * 0.85) glide();
      else check();
    };
    const click = () => { if (!moved) glide(); moved = false; };

    /* ONCE PRINTED, THE RUN IS RETIRED. Its keyframes hold the finished
       state with `fill: both`, and any later change to the same properties
       (the "feeding" blink during a pull) would restart them from zero when it
       ended -- the light went orange again for two seconds after every pull.
       The finished state is also the resting state, so dropping `rp--run`
       here changes nothing on screen; `rp--printed` cues the tab's nudge. */
    const printed = (e: AnimationEvent) => {
      if (e.animationName !== "rp-feed") return;
      rp.classList.remove("rp--run");
      rp.classList.add("rp--printed");
    };
    rp.addEventListener("animationend", printed);

    check();
    out.addEventListener("scroll", check, { passive: true });
    tab.addEventListener("pointerdown", down);
    tab.addEventListener("pointermove", move);
    tab.addEventListener("pointerup", up);
    tab.addEventListener("pointercancel", up);
    tab.addEventListener("click", click);
    const ro = new ResizeObserver(check);
    ro.observe(out);
    const slip = out.firstElementChild;
    if (slip) ro.observe(slip);
    return () => {
      cancelAnimationFrame(frame);
      out.removeEventListener("scroll", check);
      tab.removeEventListener("pointerdown", down);
      tab.removeEventListener("pointermove", move);
      tab.removeEventListener("pointerup", up);
      tab.removeEventListener("pointercancel", up);
      tab.removeEventListener("click", click);
      rp.removeEventListener("animationend", printed);
      ro.disconnect();
    };
  }, []);

  const replay = () => {
    const rp = ref.current?.closest<HTMLElement>(".rp");
    if (!rp) return;
    const out = rp.querySelector<HTMLElement>(".rp__out");
    /* Tuck the paper back in and print from the top again. */
    rp.classList.remove("rp--run", "rp--printed", "rp--full", "rp--feeding");
    if (out) { out.style.maxHeight = ""; out.style.transition = ""; out.scrollTo({ top: 0 }); }
    void rp.offsetWidth;
    rp.classList.add("rp--run");
    out?.dispatchEvent(new Event("scroll"));
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
