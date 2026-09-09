"use client";

import { useEffect, useRef, useState } from "react";
import { Stage, TabRow, useNearViewport, useStageMotion } from "./stage-shell";
import { AI_USES } from "@/lib/showcase";

/**
 * 05 · Software & AI — "The Pipeline".
 *
 * The request path drawn as a graph with a pulse running the edges, beside a
 * terminal that types the trace out. This is the differentiator claim —
 * engineering built around an outcome — so the stage shows an architecture
 * rather than a generic "AI" shimmer.
 *
 * Two details that matter:
 *  - The wires are positioned elements, not SVG strokes. The graph is fluid, so
 *    a stretched viewBox distorts any dash pattern laid along it.
 *  - The terminal ACCUMULATES. A cycling one-line typer leaves a tall box
 *    holding a single sentence, which reads as an empty panel; a transcript
 *    that builds and then resets reads as a request being served.
 */
const NODES = [
  { id: "req", label: "Request", x: 8 },
  { id: "api", label: "API", x: 29 },
  { id: "svc", label: "Service", x: 50 },
  { id: "db", label: "Data", x: 71 },
  { id: "llm", label: "LLM", x: 92 },
];

const LINES = [
  "POST /v1/enquiry",
  "→ validate · route · enrich",
  "→ model: summarise + classify",
  '← { "intent": "quote", "confidence": 0.94 }',
  "← queued for a human · 120ms",
];

/** Types the trace out line by line, holds it, then starts over. */
function useTranscript(active: boolean) {
  const [done, setDone] = useState<string[]>([]);
  const [partial, setPartial] = useState("");
  const timer = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    let line = 0;
    let char = 0;
    const tick = () => {
      if (line >= LINES.length) {
        // hold the finished trace on screen, then run it again
        timer.current = window.setTimeout(() => {
          setDone([]); setPartial(""); line = 0; char = 0;
          timer.current = window.setTimeout(tick, 400);
        }, 3200);
        return;
      }
      const text = LINES[line];
      char += 1;
      setPartial(text.slice(0, char));
      if (char >= text.length) {
        setDone((d) => [...d, text]);
        setPartial("");
        line += 1; char = 0;
        timer.current = window.setTimeout(tick, 420);
        return;
      }
      timer.current = window.setTimeout(tick, 22);
    };
    timer.current = window.setTimeout(tick, 500);
    return () => window.clearTimeout(timer.current);
  }, [active]);

  return { done, partial };
}

export default function Pipeline() {
  const mode = useStageMotion();
  const { ref, near } = useNearViewport<HTMLDivElement>("120px");
  const animate = mode === "full" && near;
  const { done, partial } = useTranscript(animate);
  const [use, setUse] = useState<string>(AI_USES[0].id);
  const activeUse = AI_USES.find((u) => u.id === use) ?? AI_USES[0];

  const controls = (
    <>
      <TabRow items={AI_USES} value={use} onChange={setUse} label="Where AI lands" />
      <p className="sv-stage__note">{activeUse.note}</p>
    </>
  );

  return (
    <Stage caption="A request path we would actually build. Illustrative."
           controls={controls}>
      <div className={`pl${animate ? " is-live" : ""}`} ref={ref}>
        <div className="pl__graph">
          {/* Plain elements, not SVG. The graph spans a flexible width, so any
              stretched viewBox distorts the dash pattern: non-scaling-stroke
              puts dashes in screen units and pathLength in user units, and the
              two cannot both be satisfied. A positioned wire with a dot
              translating along it has neither problem. */}
          <div className="pl__wires" aria-hidden="true">
            {NODES.slice(0, -1).map((nd, i) => (
              <span className="pl__wire" key={`w-${nd.id}`}
                    style={{ left: `${nd.x}%`, width: `${NODES[i + 1].x - nd.x}%` }}>
                {animate && (
                  <span className="pl__spark" style={{ animationDelay: `${i * 0.4}s` }} />
                )}
              </span>
            ))}
          </div>
          <ol className="pl__nodes">
            {NODES.map((nd, i) => (
              <li className="pl__node" key={nd.id}
                  style={{ left: `${nd.x}%`, animationDelay: `${i * 0.4}s` }}>
                <span className="pl__dot" />
                <span className="pl__label">{nd.label}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="pl__term">
          <div className="pl__termbar" aria-hidden="true"><i /><i /><i /></div>
          <div className="pl__termbody">
            {animate ? (
              <>
                {done.map((l) => <span className="pl__line" key={l}>{l}</span>)}
                {partial && (
                  <span className="pl__line">
                    {partial}<span className="pl__cursor">|</span>
                  </span>
                )}
              </>
            ) : (
              /* still + compact get the whole trace, already written out */
              <>{LINES.map((l) => <span className="pl__line" key={l}>{l}</span>)}</>
            )}
          </div>
        </div>
      </div>
    </Stage>
  );
}
