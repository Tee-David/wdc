"use client";

import { useEffect, useRef, useState } from "react";
import { Stage, TabRow, useNearViewport, useStageMotion } from "./stage-shell";
import { AI_USES } from "@/lib/showcase";

/**
 * 05 · Software & AI — "The Pipeline".
 *
 * The request path drawn as a graph with a pulse running the edges, beside a
 * terminal that types the trace out. This is the differentiator claim, so the
 * stage shows an architecture rather than a generic "AI" shimmer.
 *
 * The tabs drive the WHOLE stage, not a caption. Each use has a different shape
 * in real life (extraction is parse-and-validate; an assistant is retrieve-then-
 * generate), so switching tab rebuilds the chain and retypes a matching trace.
 * A control that only swaps a sentence while the diagram underneath stays put
 * is the thing that makes a page feel templated.
 *
 * Two details that matter:
 *  - The wires are positioned elements, not SVG strokes. The graph is fluid, so
 *    a stretched viewBox distorts any dash pattern laid along it.
 *  - The terminal ACCUMULATES. A cycling one-line typer leaves a tall box
 *    holding a single sentence, which reads as an empty panel; a transcript
 *    that builds and then resets reads as a request being served.
 */
/* Nodes are spread evenly across the width for whatever chain the selected use
   carries, so a four-step path and a five-step path both fill the graph. */
const spread = (labels: readonly string[]) =>
  labels.map((label, i) => ({
    id: `${label}-${i}`,
    label,
    x: labels.length === 1 ? 50 : 8 + (i * 84) / (labels.length - 1),
  }));

/**
 * The terminal, split out so it can be REMOUNTED on a tab change.
 *
 * The accumulated lines belong to whichever trace produced them, so switching
 * architecture has to clear them. Resetting inside the effect would mean
 * setting state during an effect on every dependency change; keying this
 * component by the selected use gets the same reset from React's own
 * mount/unmount, with no extra render.
 */
function useTranscript(active: boolean, LINES: readonly string[]) {
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
  }, [active, LINES]);

  return { done, partial };
}

function Terminal({ animate, lines }: { animate: boolean; lines: readonly string[] }) {
  const { done, partial } = useTranscript(animate, lines);
  return (
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
          <>{lines.map((l) => <span className="pl__line" key={l}>{l}</span>)}</>
        )}
      </div>
    </div>
  );
}

export default function Pipeline() {
  const mode = useStageMotion();
  const { ref, near } = useNearViewport<HTMLDivElement>("120px");
  const animate = mode === "full" && near;
  const [use, setUse] = useState<string>(AI_USES[0].id);
  const activeUse = AI_USES.find((u) => u.id === use) ?? AI_USES[0];
  /* The whole stage keys off the tab: the chain, the trace and the reset. The
     `key` on the graph below restarts the node/spark animations on a switch,
     otherwise the new chain inherits the old one's mid-flight timing. */
  const NODES = spread(activeUse.nodes);

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
        <div className="pl__graph" key={`graph-${activeUse.id}`}>
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

        {/* Distinct key prefixes: these are SIBLINGS, and giving both the bare
            use id made React see two children with the same key, which
            duplicated the graph on every tab switch instead of replacing it. */}
        <Terminal key={`term-${activeUse.id}`} animate={animate} lines={activeUse.trace} />
      </div>
    </Stage>
  );
}
