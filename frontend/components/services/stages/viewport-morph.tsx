"use client";

import { useEffect, useState } from "react";
import { Stage, useNearViewport, useStageMotion } from "./stage-shell";
import { PROJECTS } from "@/lib/projects";

/**
 * 03 · Full-Stack Web — "One build, every viewport".
 *
 * A browser frame holding a real screenshot, resizing desktop -> tablet -> phone
 * with the width ticking down beside it. The section argues that we build
 * responsively by being responsive in front of you.
 *
 * The screenshot is a real live project, so this stage needs no placeholder.
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

  useEffect(() => {
    if (mode !== "full" || !near) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % SIZES.length), 2400);
    return () => window.clearInterval(t);
  }, [mode, near]);

  /* Still and compact show the three widths at once: the same claim, made as a
     comparison instead of an animation. */
  if (mode !== "full") {
    return (
      <Stage caption={`${SHOT.name} — one build, three viewports.`}>
        <div className="vp-still">
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
      </Stage>
    );
  }

  const cur = SIZES[i];
  return (
    <Stage caption={`${SHOT.name}, live. The frame is really resizing.`}>
      <div className="vp" ref={ref}>
        <div className="vp__ruler">
          <span className="vp__px">{cur.px}px</span>
          <span className="vp__label">{cur.label}</span>
        </div>
        <div className="vp__stagewrap">
          <div className="vp-chrome vp__frame" style={{ width: `${cur.w}%` }}>
            <div className="vp-chrome__bar" aria-hidden="true">
              <i /><i /><i />
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
