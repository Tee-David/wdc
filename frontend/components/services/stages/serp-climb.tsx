"use client";

import { useEffect, useRef, useState } from "react";
import TextType from "@/components/ui/text-type";
import { Stage, useNearViewport, useStageMotion } from "./stage-shell";

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

export default function SerpClimb() {
  const mode = useStageMotion();
  const { ref, near } = useNearViewport<HTMLDivElement>("120px");
  const [step, setStep] = useState(0);
  const timer = useRef<number>(0);

  /* Runs once, on entry. Looping it would turn a proof into a screensaver, and
     the end state is the point being made. */
  useEffect(() => {
    if (mode !== "full" || !near) return;
    timer.current = window.setInterval(() => {
      setStep((s) => {
        if (s >= CLIMB.length - 1) { window.clearInterval(timer.current); return s; }
        return s + 1;
      });
    }, 700);
    return () => window.clearInterval(timer.current);
  }, [mode, near]);

  const still = mode === "still";
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
    <Stage caption="Search position over an optimisation cycle. Illustrative, not a client's data.">
      <div className="serp" ref={ref}>
        <div className="serp__bar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
               strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
          </svg>
          {mode === "full" ? (
            <TextType
              text={["modelling consultancy near me", "data analytics partner", "brand and web agency"]}
              typingSpeed={55}
              pauseDuration={2600}
              className="serp__q"
              cursorClassName="serp__cursor"
              startOnVisible
            />
          ) : (
            <span className="serp__q">brand and web agency</span>
          )}
        </div>

        <div className="serp__listwrap">
          <div className="serp__list" style={{ height: SLOTS * ROW_H }}>
            {slots.map((slot) => {
              if (slot === trackedSlot) {
                return (
                  <div
                    className="serp__row serp__row--you"
                    key="you"
                    style={{ transform: `translateY(${slot * ROW_H}px)` }}
                    aria-live="polite"
                  >
                    <span className="serp__n">{rank}</span>
                    <span className="serp__line" />
                    <span className="serp__txt">Your page</span>
                    <span className="serp__badge">{done ? "page 1" : "climbing"}</span>
                  </div>
                );
              }
              const label = NEIGHBOURS[n++];
              return (
                <div
                  className="serp__row"
                  key={label}
                  style={{ transform: `translateY(${slot * ROW_H}px)` }}
                >
                  <span className="serp__n">{rankAt(slot)}</span>
                  <span className="serp__line" />
                  <span className="serp__txt">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Stage>
  );
}
