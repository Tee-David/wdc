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
 *  - It only ever runs while ON SCREEN, and off screen it stops asking for
 *    frames at all rather than waking up sixty times a second to decide not to
 *    draw.
 *  - Reduced motion and a missing 2D context both fall back to plain text.
 *
 * ---------------------------------------------------------------------------
 * WHY THE WORD IS MEASURED RATHER THAN CENTRED, which is what broke the L.
 *
 * `ctx.font` takes a font shorthand, and letter-spacing is not part of a font
 * shorthand. This site's headings are set at `letter-spacing: -.03em`, so the
 * DOM lays "Let's talk." out tighter than the canvas draws it -- and the canvas
 * is sized to the DOM box. Drawn centred with `textAlign: "center"` at `w / 2`,
 * the word then hung over both ends of its own canvas and was clipped by the
 * edges.
 *
 * Measured: canvas 458px, text 498.5px, so 40px of overflow on desktop and
 * 20px on mobile, half of it off each side. Twenty pixels off the left is the
 * stem of a capital L, which is why the heading read "_et's talk." -- the foot
 * of the L survived and the upright did not. The full stop at the other end has
 * enough side bearing that losing the same 20px cost it nothing visible, which
 * is why only one end looked wrong.
 *
 * So now: `ctx.letterSpacing` is set where the browser has it, the ink box is
 * measured with `actualBoundingBox*` rather than assumed, the type is scaled
 * down if it still would not fit, and it is positioned from that measurement.
 * A glyph cannot fall outside the canvas regardless of the face, the weight or
 * the tracking.
 */
export default function ParticleText({
  text,
  className = "",
  /** px between samples; larger is cheaper and coarser. */
  density = 3,
  color,
  /**
   * Keep cycling: settle, hold, scatter, settle again.
   *
   * COSTS A FRAME BUDGET FOR AS LONG AS IT IS ON SCREEN, so think before
   * switching it on. Each cycle is one `fillRect` and one `globalAlpha` change
   * per particle per frame, and a wide heading is over a thousand particles.
   * Measured on /services at 4x CPU throttling: the frame time with this on
   * was 20.0ms against 16.9ms with the canvas removed.
   */
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

  useEffect(() => {
    const host = wrap.current;
    if (!host) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const io = new IntersectionObserver(
      (entries) => {
        /* `active` latches: once it has started, the canvas stays mounted and
           the frame loop below handles going quiet. Only the FIRST sighting
           matters here, which is why this never sets it back to false. */
        if (entries.some((e) => e.isIntersecting)) setActive(true);
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
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    cv.style.width = `${w}px`;
    cv.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    const cs = getComputedStyle(host);
    const ink = color || cs.color;
    const basePx = parseFloat(cs.fontSize) || 48;

    /* The font, INCLUDING its tracking. `letterSpacing` is a separate canvas
       property because it is not part of the font shorthand; where a browser
       does not have it the fit below still keeps the word inside the box, just
       a little smaller than the DOM text behind it. */
    const setFont = (px: number) => {
      ctx.font = `${cs.fontWeight} ${px}px ${cs.fontFamily}`;
      if ("letterSpacing" in ctx) {
        ctx.letterSpacing = cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing;
      }
    };

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    /* The INK box, not the advance box: what is actually painted, overhangs
       and side bearings included. A capital L's upright and a comma's tail
       both live outside the advance width on some faces. */
    const inkBox = () => {
      const m = ctx.measureText(text);
      const left = m.actualBoundingBoxLeft ?? 0;
      const right = m.actualBoundingBoxRight ?? m.width;
      const up = m.actualBoundingBoxAscent ?? basePx * .8;
      const down = m.actualBoundingBoxDescent ?? basePx * .2;
      return { left, up, iw: Math.max(1, left + right), ih: Math.max(1, up + down) };
    };

    setFont(basePx);
    let box = inkBox();
    /* If it still does not fit -- a face with no letter-spacing support, a very
       long word, a narrow column -- shrink to fit rather than clip. A slightly
       smaller word is a design compromise; a clipped one is a bug. */
    const fit = Math.min(1, (w - 2) / box.iw, (h - 2) / box.ih);
    if (fit < .999) { setFont(basePx * fit); box = inkBox(); }

    // 1. draw the word once, positioned by that measurement, so we can read
    //    its shape back
    ctx.fillStyle = "#fff";
    ctx.fillText(text, (w - box.iw) / 2 + box.left, (h - box.ih) / 2 + box.up);
    /* Device pixels, and unaffected by the transform above -- which is why the
       source rectangle is the canvas's own width and height rather than the CSS
       ones. `img.width` is then the row stride; deriving it from `w * dpr`
       instead was a latent shear on any device whose ratio is not a whole
       number, which is most mid-range Android. */
    const img = ctx.getImageData(0, 0, cv.width, cv.height);
    const bmp = img.data;
    const stride = img.width;
    ctx.clearRect(0, 0, w, h);

    // 2. sample it into targets. The step widens on bigger boxes so a large
    //    heading does not turn into a hundred thousand particles.
    const step = Math.max(density, Math.round((w * h) / 90000) + density - 1);
    type P = { x: number; y: number; tx: number; ty: number; d: number };
    const parts: P[] = [];
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const idx = (Math.round(y * dpr) * stride + Math.round(x * dpr)) * 4;
        if (idx + 3 >= bmp.length) continue;
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
    /* Three phases, so the loop never SNAPS. Scattering back out and flying in
       from where it landed is one continuous motion; re-randomising the start
       points and jumping there would read as a glitch every cycle. */
    let phase: "in" | "hold" | "out" = "in";

    let raf = 0;
    let running = false;
    let t0 = 0;
    /* Milliseconds already spent in the current phase, banked whenever the
       loop is stopped. The word is then in exactly the same place when it
       comes back rather than having jumped, and without the old approach of
       holding a frame callback open forever just to advance a clock. */
    let carried = 0;

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

    const nextPhase = (to: typeof phase) => { phase = to; carried = 0; t0 = 0; };

    const frame = (now: number) => {
      if (!t0) t0 = now;
      const el = carried + (now - t0);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = ink;

      if (phase === "hold") {
        for (const p of parts) ctx.fillRect(p.tx, p.ty, size, size);
        if (el >= holdMs) { scatter(); nextPhase("out"); }
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
        if (!loop) {
          /* Settled for good: the canvas holds the finished word and this
             stops asking for frames entirely. */
          host.classList.add("is-settled");
          running = false;
          return;
        }
        nextPhase(out ? "in" : "hold");
      }
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      if (!running) return;
      running = false;
      if (t0) { carried += performance.now() - t0; t0 = 0; }
      cancelAnimationFrame(raf);
      raf = 0;
    };

    /* OFF SCREEN MEANS NO FRAMES AT ALL. The previous version kept a frame
       callback open for the life of the page and returned early from it, which
       is a permanent sixty-times-a-second wake-up to decide to do nothing. */
    const vis =
      "IntersectionObserver" in window
        ? new IntersectionObserver(
            (entries) => { if (entries.some((e) => e.isIntersecting)) start(); else stop(); },
            { rootMargin: "80px 0px" },
          )
        : null;
    if (vis) vis.observe(host);
    start();

    return () => {
      vis?.disconnect();
      stop();
    };
  }, [active, text, density, color, loop, holdMs]);

  return (
    <div ref={wrap} className={`pt${active ? " is-on" : ""} ${className}`}>
      {/* the real text: always present, hidden only once particles take over */}
      <span className="pt__text">{text}</span>
      <canvas ref={canvas} className="pt__cv" aria-hidden="true" />
    </div>
  );
}
