"use client";

import { useEffect, useState } from "react";
import { Stage, TabRow, useNearViewport, useStageMotion } from "./stage-shell";
import { PROJECTS } from "@/lib/projects";
import { WEB_STACKS } from "@/lib/showcase";

/**
 * 03 · Full-Stack Web — "One build, every viewport".
 *
 * Two things a client actually decides between: what it is built ON, and
 * whether it holds up on a phone. So the stage does both — the tabs pick the
 * stack (WordPress, Shopify, custom, web app) and the frame really resizes
 * across three widths with the pixel count ticking down.
 *
 * The screenshot is a real live project, so this is the one stage on the page
 * that needs no placeholder at all.
 */
const SHOT = PROJECTS[1] ?? PROJECTS[0];

const SIZES = [
  { label: "Desktop", px: 1440, w: 100 },
  { label: "Tablet", px: 768, w: 62 },
  { label: "Phone", px: 390, w: 34 },
] as const;

export default function ViewportMorph() {
  const mode = useStageMotion();
  const { ref, near } = useNearViewport<HTMLDivElement>("120px");
  const [i, setI] = useState(0);
  const [stack, setStack] = useState<string>(WEB_STACKS[2].id); // custom build
  const active = WEB_STACKS.find((s) => s.id === stack) ?? WEB_STACKS[0];

  useEffect(() => {
    if (mode !== "full" || !near) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % SIZES.length), 2600);
    return () => window.clearInterval(t);
  }, [mode, near]);

  const controls = (
    <>
      <TabRow items={WEB_STACKS} value={stack} onChange={setStack} label="Build type" />
      <p className="sv-stage__note">{active.note}</p>
    </>
  );

  const chips = (
    <div className="vp__chips">
      {active.chips.map((c, n) => (
        <span className="vp__chip" key={c} style={{ transitionDelay: `${n * 45}ms` }}>{c}</span>
      ))}
    </div>
  );

  /* Still and compact show the three widths at once: the same claim as a
     comparison rather than an animation. */
  if (mode !== "full") {
    return (
      <Stage caption={`${SHOT.name}: one build, three viewports.`} controls={controls}>
        <div className="vp-still">
          <div className="vp-still__row">
            {SIZES.map((s) => (
              <div className="vp-still__item" key={s.label} style={{ width: `${s.w}%` }}>
                <div className="vp-chrome vp-chrome--sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={SHOT.cover} alt={`${SHOT.name} at ${s.label.toLowerCase()} width`} loading="lazy" />
                </div>
                <small>{s.label}</small>
              </div>
            ))}
          </div>
          {chips}
        </div>
      </Stage>
    );
  }

  const cur = SIZES[i];
  return (
    <Stage caption={`${SHOT.name}, live. The frame is really resizing.`} controls={controls}>
      <div className="vp" ref={ref}>
        <div className="vp__ruler">
          <span className="vp__px">{cur.px}px</span>
          <span className="vp__label">{cur.label}</span>
          {chips}
        </div>
        <div className="vp__stagewrap">
          <div className="vp-chrome vp__frame" style={{ width: `${cur.w}%` }}>
            <div className="vp-chrome__bar" aria-hidden="true">
              <i /><i /><i />
              <span className="vp-chrome__url">{active.label.toLowerCase()}</span>
            </div>
            <div className="vp-chrome__view">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SHOT.cover} alt={`${SHOT.name} website`} loading="lazy" />
            </div>
          </div>
        </div>
        <div className="vp__dots" role="tablist" aria-label="Viewport width">
          {SIZES.map((s, n) => (
            <button
              key={s.label}
              type="button"
              role="tab"
              aria-selected={n === i}
              aria-label={s.label}
              className={`vp__dot${n === i ? " is-on" : ""}`}
              onClick={() => setI(n)}
            />
          ))}
        </div>
      </div>
    </Stage>
  );
}
