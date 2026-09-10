"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Stage, TabRow, useStageMotion } from "./stage-shell";
import { BRAND_KINDS } from "@/lib/showcase";

/**
 * 01 · Branding & Design — a drag-to-spin wall of brand work.
 *
 * The work for this service is flyers, logos, brand guides and motion, so the
 * dome shows ARTWORK filtered by kind — not website screenshots, which belong
 * to a different service. Switching kind reshapes the tiles too (square for
 * marks, portrait for print, landscape for guides and motion), because a poster
 * in a landscape crop stops reading as a poster.
 *
 * The tiles are REAL WDC artwork, exported from the studio Drive and resized
 * for the web. Geometry follows the artwork's own shape, which is why the
 * flyers are square: they are designed square for social.
 *
 * Density is the whole trick: tiles sit 360/PER_ROW apart, so the arc between
 * centres is RADIUS x angle — at 12 per row that is ~225px against a ~210px
 * tile, which reads as a surface. Sparser and it reads as debris in a void.
 */
const RADIUS = 430;

/* Spacing has to follow the tile SHAPE, not a fixed count: the arc between two
   centres is RADIUS x angle, so 12 columns (225px apart) reads as a surface for
   a 210px-wide landscape tile and as a picket fence for a 150px portrait one.
   Each shape gets the column count and latitudes that close its own gaps. */
const GEO = {
  portrait:  { rows: [-27, 0, 27],     perRow: 18 },
  square:    { rows: [-24, 0, 24],     perRow: 16 },
  landscape: { rows: [-26, -9, 9, 26], perRow: 12 },
} as const;

export default function DomeGallery() {
  const mode = useStageMotion();
  /* opens on the largest set: a dome of 48 tiles drawn from four logos repeats
     each one a dozen times, where ten flyers read as a wall of work */
  const [kind, setKind] = useState(BRAND_KINDS[0].id);
  const cage = useRef<HTMLDivElement | null>(null);
  const drag = useRef({ on: false, x: 0, y: 0, lastX: 0, vx: 0 });
  const rot = useRef({ x: -6, y: 0 });
  const frame = useRef(0);
  const [ready, setReady] = useState(false);

  const active = BRAND_KINDS.find((k) => k.id === kind) ?? BRAND_KINDS[0];

  /* PER_ROW is a multiple of the item count, so indexing by `i` alone would put
     the same panel in every row of a column and stripe the dome. The row offset
     breaks that alignment. */
  const geo = GEO[active.shape];
  const tiles = useMemo(
    () => Array.from({ length: geo.rows.length * geo.perRow }, (_, i) => {
      const row = Math.floor(i / geo.perRow);
      const item = active.items[(i + row) % active.items.length];
      return { key: `${active.id}-${i}`, ...item };
    }),
    [active, geo],
  );

  const paint = useCallback(() => {
    const el = cage.current;
    if (el) {
      el.style.transform =
        `translateZ(-${RADIUS}px) rotateX(${rot.current.x}deg) rotateY(${rot.current.y}deg)`;
    }
  }, []);

  /* Idle drift plus inertia after a throw, in one loop. It never starts outside
     "full", so a compact or still render costs no frames at all. */
  useEffect(() => {
    if (mode !== "full") return;
    let last = performance.now();
    let first = true;
    const tick = (now: number) => {
      if (first) { first = false; setReady(true); }
      const dt = Math.min(64, now - last); last = now;
      if (drag.current.on) {
        // the pointer handler paints while dragging
      } else if (Math.abs(drag.current.vx) > 0.02) {
        rot.current.y += drag.current.vx * dt * 0.06;
        drag.current.vx *= 0.94;                  // friction
        paint();
      } else {
        rot.current.y += dt * 0.0035;             // slow idle drift
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
    // clamped so the wall never tips past its poles
    rot.current.x = Math.max(-34, Math.min(22, rot.current.x - (e.clientY - d.y) * 0.12));
    d.vx = e.clientX - d.lastX;
    d.lastX = e.clientX;
    d.x = e.clientX; d.y = e.clientY;
    paint();
  };
  const onUp = () => { drag.current.on = false; };

  const controls = (
    <>
      <TabRow items={BRAND_KINDS} value={kind} onChange={setKind} label="Kind of work" />
      <p className="sv-stage__note">{active.note}</p>
    </>
  );

  const caption = "Selected WDC brand work.";

  /* Compact and still share one readable fallback: a plain grid in the same
     shape. A 3D cage on a 390px screen is unreadable, and spinning it is worse. */
  if (mode !== "full") {
    return (
      <Stage caption={caption} controls={controls}>
        <div className={`dome-grid dome-grid--${active.shape}`}>
          {active.items.slice(0, 6).map((it) => (
            <figure className="bw" key={it.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.src} alt={it.title} loading="lazy" />
              <figcaption className="bw__cap">{it.title}</figcaption>
            </figure>
          ))}
        </div>
      </Stage>
    );
  }

  return (
    <Stage caption={caption} controls={controls}>
      <div
        className={`dome dome--${active.shape}${ready ? " is-ready" : ""}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        role="group"
        aria-label={`Rotatable wall of ${active.label.toLowerCase()}`}
      >
        <div className="dome__cage" ref={cage}>
          {tiles.map((t, i) => {
            const lat = geo.rows[Math.floor(i / geo.perRow)] ?? 0;
            const lon = (360 / geo.perRow) * (i % geo.perRow);
            return (
              <div
                className="dome__tile"
                key={t.key}
                style={{ transform: `rotateY(${lon}deg) rotateX(${lat}deg) translateZ(${RADIUS}px)` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.src} alt="" loading="lazy" draggable={false} />
                <span className="bw__cap">{t.title}</span>
              </div>
            );
          })}
        </div>
        <span className="dome__hint">drag</span>
      </div>
    </Stage>
  );
}
