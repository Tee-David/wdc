"use client";

import { useEffect, useRef, useState } from "react";
import { proofStats, shortCount, type Stat } from "@/lib/proof";

import "./proof.css";

/**
 * The figures under the hero.
 *
 * THE NUMBERS ARE SERVER-RENDERED AT THEIR FINAL VALUE, and the counter only
 * animates over the top of them. That order matters three ways: a reader with
 * no JavaScript sees ten rather than zero, a crawler indexes the real figure,
 * and nothing on the page is briefly a lie. A counter that starts from zero in
 * the markup is a section that says "0 years in business" to anyone whose
 * bundle has not arrived.
 *
 * IT ONLY RUNS ONCE AND ONLY WHEN SEEN. One observer, disconnected on the first
 * intersection, then one `requestAnimationFrame` loop of about a second.
 * Nothing listens to scroll, nothing runs off screen, and under reduced motion
 * the loop never starts -- the figures are simply there, which is what they
 * already were.
 *
 * IT SITS DIRECTLY UNDER A `min-h-svh` HERO, so it is never the Largest
 * Contentful Paint and never competes with it. Worth saying because the
 * temptation with a band like this is to pull it up over the hero's curve; that
 * would put animated text in the LCP window, which is the exact mistake the
 * headline's own comments in `hero.tsx` describe paying for.
 */

/** ~1.1s, which is long enough to read as a count and short enough that a
    reader scrolling past never sees a half-finished number. */
const RUN_MS = 1_100;

function useCountUp(target: number, start: boolean) {
  const [shown, setShown] = useState(target);

  useEffect(() => {
    if (!start) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const began = performance.now();

    /* NO `setShown(0)` HERE. Setting state synchronously inside an effect
       triggers a cascading render, and the first animation frame below already
       computes zero on its own -- `target * 0` -- so the only thing the extra
       call bought was an eslint error. */
    const step = (now: number) => {
      const t = Math.min(1, (now - began) / RUN_MS);
      /* Ease out: fast at the start, settling into the real figure rather than
         stopping dead on it. */
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, start]);

  return shown;
}

function Figure({ stat, start }: { stat: Stat; start: boolean }) {
  const shown = useCountUp(stat.value, start);

  return (
    <div className="pf__stat">
      {/* THE BOX IS RESERVED BY THE FINAL VALUE, not by whatever is in it now.
          A counter running 0 -> 2K is one character wide, then two, then
          three in turn, and without `ch` sizing plus tabular figures the
          label under it jumps on the way. `aria-hidden` because the number a
          screen reader should hear is the one in the label below, said once. */}
      <span
        className="pf__num"
        aria-hidden="true"
        style={{ "--digits": `${shortCount(stat.value).length + (stat.suffix?.length ?? 0)}` } as React.CSSProperties}
      >
        {shortCount(shown)}
        {stat.suffix}
      </span>
      <span className="pf__label">
        {/* The accessible version: the figure and what it counts, as one
            phrase, so it is announced as "17 projects delivered" rather than as
            a loose number followed by a heading. */}
        <span className="sr-only">{`${stat.value}${stat.suffix ?? ""} `}</span>
        {stat.label}
      </span>
      <span className="pf__detail">{stat.detail}</span>
    </div>
  );
}

export default function Proof() {
  const stats = proofStats();
  const card = useRef<HTMLDivElement>(null);
  const [start, setStart] = useState(false);

  useEffect(() => {
    const node = card.current;
    if (!node || !("IntersectionObserver" in window)) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setStart(true);
          io.disconnect();
        }
      },
      /* A third of the card, so the count starts when the band is genuinely
         being looked at rather than when its first pixel clears the fold. */
      { threshold: 0.3 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <section className="pv-sec pv-sec--alt pf" aria-labelledby="pf-title">
      <div className="pv-wrap">
        <div className="pf__card pv-reveal" ref={card}>
          <div className="pf__top">
            <div className="pf__say">
              <span className="pv-eyebrow">Track record</span>
              <h2 className="pv-mix" id="pf-title">
                <b>Ten years in</b>, and the numbers <b>to prove it</b>
              </h2>
              <p className="pv-lede">
                A creative and digital agency spanning brand, web, apps, software,
                SEO and social, delivered by one team.
              </p>
            </div>
          </div>

          <div className="pf__grid">
            {stats.map((stat) => (
              <Figure key={stat.key} stat={stat} start={start} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
