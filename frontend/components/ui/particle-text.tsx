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
 *  - It runs once, only while on screen, and stops itself when finished. A
 *    permanent rAF loop for a settled word is pure battery drain.
 *  - Reduced motion and a missing 2D context both fall back to plain text.
 */
export default function ParticleText({
  text,
  className = "",
  /** px between samples; larger is cheaper and coarser. */
  density = 3,
  color,
}: {
  text: string;
  className?: string;
  density?: number;
  color?: string;
}) {
  const wrap = useRef<HTMLDivElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const host = wrap.current;
    if (!host) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) { setActive(true); io.disconnect(); }
      },
      { threshold: 0.4 },
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

    // 3. ease each particle to its target, then stop for good
    /* Particles nearly touch: a gap much under the step keeps the letterforms
       legible, where a small dot at a wide step turns a word into a rash. The
       count is set by `step`, so closing the gap costs nothing. */
    const size = Math.max(1, step - 0.6);
    const DUR = 900;
    let raf = 0;
    let t0 = 0;
    const frame = (now: number) => {
      if (!t0) t0 = now;
      const el = now - t0;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = ink;
      let settled = true;
      for (const p of parts) {
        const local = Math.min(1, Math.max(0, (el - p.d) / DUR));
        const e = 1 - Math.pow(1 - local, 3);
        if (local < 1) settled = false;
        ctx.globalAlpha = e;
        ctx.fillRect(
          p.x + (p.tx - p.x) * e,
          p.y + (p.ty - p.y) * e,
          size, size,
        );
      }
      ctx.globalAlpha = 1;
      if (settled) { host.classList.add("is-settled"); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [active, text, density, color]);

  return (
    <div ref={wrap} className={`pt${active ? " is-on" : ""} ${className}`}>
      {/* the real text: always present, hidden only once particles take over */}
      <span className="pt__text">{text}</span>
      <canvas ref={canvas} className="pt__cv" aria-hidden="true" />
    </div>
  );
}
