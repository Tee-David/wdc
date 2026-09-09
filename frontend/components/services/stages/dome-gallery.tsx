"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Stage, useStageMotion } from "./stage-shell";
import { PROJECTS } from "@/lib/projects";

/**
 * 01 · Branding & Design — a drag-to-rotate dome of work.
 *
 * CSS 3D rather than WebGL: tiles are placed on a sphere with
 * `rotateY(lon) rotateX(lat) translateZ(R)` and the whole cage is rotated by
 * pointer drag with inertia. No new dependency, and it degrades cleanly.
 *
 * The tiles are REAL WDC work (the /work covers), repeated to fill the cage,
 * rather than invented brand mockups — a dome of fake case studies is a claim.
 * Swap in brand-specific imagery when it exists; only this array changes.
 */
const RADIUS = 430;                   // px from the cage centre to each tile
const ROWS = [-26, -9, 9, 26];        // latitudes: a shallow band, not a full globe
const PER_ROW = 12;
/* tile size itself lives in stages.css (.dome__tile, 190x118); the numbers in
   the note below are the pair that spacing was tuned against */

/* Density is the whole trick. Tiles are spaced 360/PER_ROW apart, so the arc
   between two centres is RADIUS * angle — at 12 per row that is ~225px against
   a 190px tile, which reads as a surface. Sparser (6 per row at this radius
   leaves ~480px gaps) and it reads as debris floating in a void. Row spacing is
   matched the same way: 16 degrees of latitude is ~120px against a 118px tile. */
const TILES = Array.from({ length: ROWS.length * PER_ROW }, (_, i) => {
  /* PER_ROW is a multiple of PROJECTS.length, so indexing by `i` alone would
     put the SAME project in every row of a column — the dome ends up striped.
     Offsetting by the row number breaks that alignment. */
  const row = Math.floor(i / PER_ROW);
  const p = PROJECTS[(i + row) % PROJECTS.length];
  return { key: `tile-${i}`, src: p.cover, name: p.name };
});

export default function DomeGallery() {
  const mode = useStageMotion();
  const cage = useRef<HTMLDivElement | null>(null);
  const drag = useRef({ on: false, x: 0, y: 0, lastX: 0, vx: 0 });
  const rot = useRef({ x: -6, y: 0 });
  const frame = useRef(0);
  const [ready, setReady] = useState(false);

  const paint = useCallback(() => {
    const el = cage.current;
    if (el) {
      el.style.transform =
        `translateZ(-${RADIUS}px) rotateX(${rot.current.x}deg) rotateY(${rot.current.y}deg)`;
    }
  }, []);

  /* Idle drift plus inertia after a throw, in one loop. Stops itself when the
     stage is not interactive, so a still/compact render costs no frames. */
  useEffect(() => {
    if (mode !== "full") return;
    let last = performance.now();
    let first = true;
    const tick = (now: number) => {
      // fading the tiles in on the first frame, rather than synchronously in
      // the effect, keeps the mount to a single render
      if (first) { first = false; setReady(true); }
      const dt = Math.min(64, now - last); last = now;
      if (drag.current.on) {
        // while dragging, paint() is driven by the pointer handler
      } else if (Math.abs(drag.current.vx) > 0.02) {
        rot.current.y += drag.current.vx * dt * 0.06;
        drag.current.vx *= 0.94;                 // friction
        paint();
      } else {
        rot.current.y += dt * 0.0035;            // slow idle drift
        paint();
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [mode, paint]);

  const onDown = (e: React.PointerEvent) => {
    if (mode !== "full") return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { on: true, x: e.clientX, y: e.clientY, lastX: e.clientX, vx: 0 };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.on) return;
    rot.current.y += (e.clientX - d.x) * 0.22;
    // clamped so the dome never flips past its poles
    rot.current.x = Math.max(-34, Math.min(22, rot.current.x - (e.clientY - d.y) * 0.12));
    d.vx = e.clientX - d.lastX;
    d.lastX = e.clientX;
    d.x = e.clientX; d.y = e.clientY;
    paint();
  };
  const onUp = () => { drag.current.on = false; };

  /* Compact and still share one readable fallback: a plain grid of the same
     work. A 3D cage on a 390px screen is unreadable, and spinning it is worse. */
  if (mode !== "full") {
    return (
      <Stage caption="Selected work. Drag to spin on a larger screen.">
        <div className="dome-grid">
          {TILES.slice(0, 6).map((t) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img key={t.key} src={t.src} alt={t.name} loading="lazy" />
          ))}
        </div>
      </Stage>
    );
  }

  return (
    <Stage caption="Drag to spin the dome.">
      <div
        className={`dome${ready ? " is-ready" : ""}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        role="group"
        aria-label="Rotatable gallery of selected work"
      >
        <div className="dome__cage" ref={cage}>
          {TILES.map((t, i) => {
            const lat = ROWS[Math.floor(i / PER_ROW)] ?? 0;
            const lon = (360 / PER_ROW) * (i % PER_ROW);
            return (
              <div
                className="dome__tile"
                key={t.key}
                style={{
                  transform:
                    `rotateY(${lon}deg) rotateX(${lat}deg) translateZ(${RADIUS}px)`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.src} alt="" loading="lazy" draggable={false} />
              </div>
            );
          })}
        </div>
        <span className="dome__hint">drag</span>
      </div>
    </Stage>
  );
}
