"use client";

import { useEffect, useRef, type ReactNode } from "react";
import ScrollCue from "./scroll-cue";
import "./pinned-row.css";

/**
 * Phone-only pinned horizontal scroll — the move the homepage services run
 * already uses, extracted so other sections can share it.
 *
 * The wrapper is given the stage's height PLUS the track's horizontal overflow,
 * so the sticky stage has exactly that much vertical scroll to translate the
 * track across. Progress is measured against the window in which the stage is
 * actually stuck (from `stick` down to `stick - span`), not against a raw
 * rect.top: measuring from the rect finishes the run `stick` pixels late and
 * slides the row up under the fixed header before it releases.
 *
 * If the track already fits, or motion is reduced, nothing is pinned — the row
 * stays an ordinary scroll-snap strip rather than a pinned section with nothing
 * to reveal.
 */
export default function PinnedRow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const wrap = useRef<HTMLDivElement | null>(null);
  const track = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const w = wrap.current;
    const trk = track.current;
    const stage = w?.querySelector<HTMLElement>(".pin__stage");
    if (!w || !trk || !stage) return;

    const mq = window.matchMedia("(max-width: 768px)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let on = false;
    let extra = 0;
    let frame = 0;
    let stick = 0;

    const release = () => {
      on = false;
      w.classList.remove("is-pinned");
      w.style.removeProperty("--pin-h");
      w.style.removeProperty("--pin-p");
      trk.style.transform = "";
    };
    const update = () => {
      if (!on) return;
      const span = w.offsetHeight - stage.clientHeight;
      const p = span > 0
        ? Math.min(1, Math.max(0, (stick - w.getBoundingClientRect().top) / span))
        : 0;
      trk.style.transform = `translate3d(${-p * extra}px,0,0)`;
      /* Published for the cue underneath, which is the only thing that can
         tell a reader this section has not ended. Written on the wrapper so
         one custom property reaches both the track and the cue. */
      w.style.setProperty("--pin-p", p.toFixed(4));
    };
    const measure = () => {
      release();
      if (!mq.matches || reduce) return;
      w.classList.add("is-pinned");
      stick = parseFloat(getComputedStyle(stage).top) || 0;
      extra = trk.scrollWidth - stage.clientWidth;
      if (extra <= 0) { release(); return; }   // nothing to reveal
      w.style.setProperty("--pin-h", `${stage.clientHeight + extra}px`);
      on = true;
      update();
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    mq.addEventListener("change", measure);
    // let images and the reveal transition settle before measuring
    const t = window.setTimeout(measure, 350);

    return () => {
      window.clearTimeout(t);
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      mq.removeEventListener("change", measure);
      release();
    };
  }, []);

  return (
    <div className={`pin ${className}`} ref={wrap}>
      {/* The cue lives INSIDE the sticky stage so it travels with the cards
          rather than sitting somewhere in the wrapper's tall scroll area,
          where it would be off screen for most of the run. It is display:none
          until `is-pinned`, which also keeps it out of the horizontal scroller
          the stage is when nothing is pinned. */}
      <div className="pin__stage">
        <div className="pin__track" ref={track}>{children}</div>
        <ScrollCue />
      </div>
    </div>
  );
}
