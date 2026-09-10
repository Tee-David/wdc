"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Assembles a word out of particles that fly in and settle into its shape.
 *
 * How it works: the text is drawn once to an offscreen canvas, the bitmap is
 * sampled on a grid, and every opaque sample becomes a particle with that point
 * as its target. Particles start scattered and ease in with a per-particle
 * delay, so the word resolves rather than snapping.
 *
 * The things that make or break this one:
 *  - It is a decoration. The real text is always in the DOM behind it for
 *    screen readers and search; the canvas is aria-hidden.
 *  - Sampling is capped. A dense grid on a wide heading is tens of thousands of
 *    particles and will drop frames on the mid-range Android this site is
 *    actually read on, so the step scales with width.
 *  - It only ever runs while ON SCREEN. A one-shot stops for good once the
 *    word settles; a looping one freezes its own clock the moment it scrolls
 *    out of view and picks up where it left off, so a heading three sections
 *    down is not burning a phone battery assembling a word nobody is looking
 *    at.
 *  - Reduced motion and a missing 2D context both fall back to plain text.
 */
export default function ParticleText({
  text,
  className = "",
  /** px between samples; larger is cheaper and coarser. */
  density = 3,
  color,
  /** Keep cycling: settle, hold, scatter, settle again. */
  loop = false,
  /** How long the assembled word holds before it scatters again. */
  holdMs = 1700,
}: {
  text: string;
  className?: string;
  density?: number;
  color?: string;
  loop?: boolean;
  holdMs?: number;
}) {
  const wrap = useRef<HTMLDivElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [active, setActive] = useState(false);
  /* Read by the frame loop rather than by React: a scroll must not re-render
     the heading sixty times a second just to pause a canvas. */
  const onScreen = useRef(false);

  useEffect(() => {
    const host = wrap.current;
    if (!host) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const io = new IntersectionObserver(
      (entries) => {
        const seen = entries.some((e) => e.isIntersecting);
        onScreen.current = seen;
        /* `active` latches: once it has started, the canvas stays mounted and
           the frame loop handles going quiet. Only the FIRST sighting matters
           here, which is why this never sets it back to false. */
        if (seen) setActive(true);
      },
      { threshold: .18 },
    );
    io.observe(host);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!active) return;
    const host = wrap.current;
    const cv = canvas.current;
    if (!host || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;                      // no 2D context: the DOM text stands

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = host.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    cv.width = w * dpr;
    cv.height = h * dpr;
    cv.style.width = `${w}px`;
    cv.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    const cs = getComputedStyle(host);
    const ink = color || cs.color;
    const fontPx = parseFloat(cs.fontSize) || 48;
    const font = `${cs.fontWeight} ${fontPx}px ${cs.fontFamily}`;

    // 1. draw the word once so we can read its shape back
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.fillText(text, w / 2, h / 2);
    const bmp = ctx.getImageData(0, 0, w * dpr, h * dpr).data;
    ctx.clearRect(0, 0, w, h);

    // 2. sample it into targets. The step widens on bigger boxes so a large
    //    heading does not turn into a hundred thousand particles.
    const step = Math.max(density, Math.round((w * h) / 90000) + density - 1);
    type P = { x: number; y: number; tx: number; ty: number; d: number };
    const parts: P[] = [];
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const idx = ((Math.floor(y * dpr) * Math.floor(w * dpr)) + Math.floor(x * dpr)) * 4;
        if (bmp[idx + 3] > 128) {
          const ang = Math.random() * Math.PI * 2;
          const dist = 90 + Math.random() * 190;
          parts.push({
            x: x + Math.cos(ang) * dist,
            y: y + Math.sin(ang) * dist,
            tx: x, ty: y,
            d: Math.random() * 380,
          });
        }
      }
    }
    if (!parts.length) return;

    // 3. ease each particle to its target
    /* Particles nearly touch: a gap much under the step keeps the letterforms
       legible, where a small dot at a wide step turns a word into a rash. The
       count is set by `step`, so closing the gap costs nothing. */
    const size = Math.max(1, step - 0.6);
    const DUR = 900;      // a particle's flight in
    const OUT = 700;      // and back out again
    let raf = 0;
    let t0 = 0;
    let last = 0;
    /* Three phases, so the loop never SNAPS. Scattering back out and flying in
       from where it landed is one continuous motion; re-randomising the start
       points and jumping there would read as a glitch every cycle. */
    let phase: "in" | "hold" | "out" = "in";

    /* New start points every cycle. Same word, different arrival, so a heading
       someone sits with for a minute is not the same four seconds on repeat. */
    const scatter = () => {
      for (const p of parts) {
        const ang = Math.random() * Math.PI * 2;
        const dist = 90 + Math.random() * 190;
        p.x = p.tx + Math.cos(ang) * dist;
        p.y = p.ty + Math.sin(ang) * dist;
        p.d = Math.random() * 380;
      }
    };

    const frame = (now: number) => {
      const dt = last ? now - last : 0;
      last = now;

      /* Off screen: push the clock forward by exactly the time that passed and
         draw nothing. The word is then in the same place when it comes back,
         rather than having silently cycled while nobody watched. */
      if (!onScreen.current) {
        if (t0) t0 += dt;
        raf = requestAnimationFrame(frame);
        return;
      }

      if (!t0) t0 = now;
      const el = now - t0;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = ink;

      if (phase === "hold") {
        for (const p of parts) ctx.fillRect(p.tx, p.ty, size, size);
        if (el >= holdMs) { scatter(); phase = "out"; t0 = now; }
        raf = requestAnimationFrame(frame);
        return;
      }

      const out = phase === "out";
      let done = true;
      for (const p of parts) {
        const local = Math.min(1, Math.max(0, (el - p.d * (out ? .4 : 1)) / (out ? OUT : DUR)));
        // in: ease-out, landing softly. out: ease-in, leaving as if flicked.
        const e = out ? local * local * local : 1 - Math.pow(1 - local, 3);
        if (local < 1) done = false;
        ctx.globalAlpha = out ? 1 - e : e;
        const a = out ? p.tx : p.x;
        const b = out ? p.x : p.tx;
        const ay = out ? p.ty : p.y;
        const by = out ? p.y : p.ty;
        ctx.fillRect(a + (b - a) * e, ay + (by - ay) * e, size, size);
      }
      ctx.globalAlpha = 1;

      if (done) {
        if (!loop) { host.classList.add("is-settled"); return; }
        phase = out ? "in" : "hold";
        t0 = now;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [active, text, density, color, loop, holdMs]);

  return (
    <div ref={wrap} className={`pt${active ? " is-on" : ""} ${className}`}>
      {/* the real text: always present, hidden only once particles take over */}
      <span className="pt__text">{text}</span>
      <canvas ref={canvas} className="pt__cv" aria-hidden="true" />
    </div>
  );
}
