"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import TextType from "@/components/ui/text-type";
import { Stage, useCountUp, useNearViewport, useStageMotion } from "./stage-shell";
import { SEO_METRICS } from "@/lib/showcase";

/**
 * 02 · SEO — "The Climb".
 *
 * A results list that re-ranks itself: the tracked row travels from 47 to 3
 * while the page around it shuffles. Rows are absolutely positioned by slot and
 * moved with `transform`, so a re-rank is one transition rather than a layout
 * pass.
 *
 * The list is a WINDOW onto the results around your position, not the top ten:
 * when you sit at 31 the neighbours are 28-34, and they renumber as you climb.
 * Numbering them 1-8 with a "31" wedged in the middle is the obvious version
 * and it is incoherent — the row would claim a rank its neighbours contradict.
 *
 * The competitor names are generic on purpose. Inventing real competitor brands,
 * or a real client's ranking history, would be a claim we cannot support.
 */
const NEIGHBOURS = [
  "consultancy directory listing",
  "industry association index",
  "regional business guide",
  "comparison and review site",
  "trade publication feature",
  "local chamber listing",
  "aggregator profile page",
];

const CLIMB = [47, 31, 18, 9, 5, 3];
const ROW_H = 44;
const SLOTS = NEIGHBOURS.length + 1;
const TOP = CLIMB[CLIMB.length - 1];
const START = CLIMB[0];

/** One metric tile. Split out so each can own its own count-up. */
function Metric({ m, run }: { m: (typeof SEO_METRICS)[number]; run: boolean }) {
  const n = useCountUp(m.to, run);
  // whole numbers stay whole; a "3.2" average position keeps its decimal
  const shown = Number.isInteger(m.to) ? Math.round(n) : n.toFixed(1);
  return (
    <div className="seo-m">
      <span className="seo-m__n">{shown}{m.suffix}</span>
      <span className="seo-m__l">{m.label}</span>
      <span className="seo-m__h">{m.hint}</span>
    </div>
  );
}

/**
 * One run of the climb, from buried to page one.
 *
 * Split out so the parent can REMOUNT it with a `key` on each cycle. The step
 * has to go back to zero for a re-run, and resetting it from inside an effect
 * would mean setting state on every dependency change; a remount gets the same
 * reset from React's own lifecycle for free.
 */
function Climb({ run, still, offset }: { run: boolean; still: boolean; offset: number }) {
  const [step, setStep] = useState(0);
  const timer = useRef<number>(0);

  useEffect(() => {
    if (!run) return;
    timer.current = window.setInterval(() => {
      setStep((s) => {
        if (s >= CLIMB.length - 1) { window.clearInterval(timer.current); return s; }
        return s + 1;
      });
    }, 700);
    return () => window.clearInterval(timer.current);
  }, [run]);

  const done = still || step === CLIMB.length - 1;
  const rank = still ? TOP : CLIMB[step];

  /* Where the tracked row sits in the window: near the bottom when it is
     buried, second slot once it reaches the top few. */
  const trackedSlot = Math.max(
    1,
    Math.round(((rank - TOP) / (START - TOP)) * (SLOTS - 2)) + 1,
  );
  /* A neighbour's rank is just its distance from yours, floored at 1 so the
     window never shows a rank zero when you are at the top. */
  const rankAt = (slot: number) => Math.max(1, rank + (slot - trackedSlot));

  const slots = Array.from({ length: SLOTS }, (_, i) => i);
  let n = 0;

  return (
    <div className="serp__listwrap">
      <div className="serp__list" style={{ height: SLOTS * ROW_H }}>
        {slots.map((slot) => {
          if (slot === trackedSlot) {
            return (
              <div
                className="serp__row serp__row--you"
                key="you"
                style={{ "--y": `${slot * ROW_H}px`, "--d": `${slot * 70}ms` } as CSSProperties}
                aria-live="polite"
              >
                <span className="serp__n">{rank}</span>
                <span className="serp__line" />
                <span className="serp__txt">Your page</span>
                <span className="serp__badge">{done ? "page 1" : "climbing"}</span>
              </div>
            );
          }
          /* Neighbours rotate with the cycle, so a second run through is not a
             pixel-for-pixel repeat of the first. */
          const label = NEIGHBOURS[(offset + n++) % NEIGHBOURS.length];
          return (
            <div
              className="serp__row"
              key={label}
              style={{ "--y": `${slot * ROW_H}px`, "--d": `${slot * 70}ms` } as CSSProperties}
            >
              <span className="serp__n">{rankAt(slot)}</span>
              <span className="serp__line" />
              <span className="serp__txt">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SerpClimb() {
  const mode = useStageMotion();
  const { ref, near } = useNearViewport<HTMLDivElement>("120px");
  /* One clock for the whole panel. The typewriter owns it: every time a query
     finishes and clears, that is a new search, so the ranks reset and climb
     again and the metrics re-count against it. Driving the climb on its own
     timer instead would let the two drift apart within a minute, and the panel
     would read as three unrelated animations sharing a box. */
  const [cycle, setCycle] = useState(0);

  const still = mode === "still";
  /* Compact is a NARROWER stage, not a frozen one. Gating the loop on "full"
     meant every phone got the end state and nothing else: the typewriter owns
     the clock, so withholding it below 768px stopped the ranks resetting and
     the metrics re-counting too, and the whole panel read as a screenshot.
     Only reduced motion holds still now. */
  const animate = !still && near;

  return (
    <Stage caption="Search position over an optimisation cycle. Illustrative, not a client's data.">
      <div className="serp" ref={ref}>
        <div className="seo-metrics">
          {SEO_METRICS.map((m) => (
            <Metric key={`${m.id}-${cycle}`} m={m} run={animate} />
          ))}
        </div>
        <div className="serp__bar">
          {/* Google's own four-colour magnifier, drawn rather than fetched: the
              stage is about being found IN Google, and a generic grey glass
              does not say that. Four paths, one per colour, because the mark is
              a single glyph in four segments. */}
          <svg className="serp__g" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M10 2a8 8 0 0 1 8 8h-2.4A5.6 5.6 0 0 0 10 4.4V2z" />
            <path fill="#EA4335" d="M10 2v2.4A5.6 5.6 0 0 0 4.4 10H2a8 8 0 0 1 8-8z" />
            <path fill="#FBBC05" d="M2 10h2.4A5.6 5.6 0 0 0 10 15.6V18a8 8 0 0 1-8-8z" />
            <path fill="#34A853" d="M10 18v-2.4a5.6 5.6 0 0 0 4.03-1.72l1.7 1.7A7.98 7.98 0 0 1 10 18z" />
            <path fill="#4285F4" d="M15.73 15.58l1.42-1.42 4.2 4.2a1 1 0 0 1-1.42 1.42l-4.2-4.2z" />
          </svg>
          {!still ? (
            <TextType
              text={["modelling consultancy near me", "data analytics partner", "brand and web agency"]}
              typingSpeed={55}
              pauseDuration={2600}
              className="serp__q"
              cursorClassName="serp__cursor"
              startOnVisible
              onSentenceComplete={() => setCycle((c) => c + 1)}
            />
          ) : (
            <span className="serp__q">brand and web agency</span>
          )}
          {/* the right-hand furniture a Google box always carries; decorative,
              so it is hidden from assistive tech rather than announced */}
          <span className="serp__tools" aria-hidden="true">
            <svg className="serp__mic" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z" />
              <path fill="#34A853" d="M6 11a6 6 0 0 0 12 0h1.6a7.6 7.6 0 0 1-6.8 7.55V21h-1.6v-2.45A7.6 7.6 0 0 1 4.4 11H6z" />
            </svg>
          </span>
        </div>

        {/* keyed by cycle: a new query means a new run, from 47 again */}
        <Climb key={cycle} run={animate} still={still} offset={cycle} />
      </div>
    </Stage>
  );
}
