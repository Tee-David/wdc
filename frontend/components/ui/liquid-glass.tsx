"use client";

import { Fragment, useEffect, useId, useRef, useState, type CSSProperties } from "react";

/*
  Liquid glass that bends the real page behind it, the way Apple's glass refracts at its edges.

  How: an SVG displacement map, made to the element's exact size, is used as a backdrop filter.
  The map is neutral in the middle and strong at the edges, so the centre stays clear and the
  content bends only near the rim. Red, green and blue are displaced by slightly different
  amounts, which gives the thin prismatic edge of real glass. A soft top highlight and a
  hairline finish the rim. (The technique of React Bits' Glass Surface.)

  Support: Chromium browsers can use an SVG filter as a backdrop filter. Safari and Firefox
  cannot yet, so they get frosted glass. Anyone who asks for reduced transparency gets a solid
  surface, decided by the parent through `tint` and the `solid` class.
*/

type Mode = "lens" | "frost" | "plain";

/** What this browser can draw. "plain" until mounted, so the server and first paint agree. */
export function useGlassMode(): Mode {
  const [mode, setMode] = useState<Mode>("plain");
  useEffect(() => {
    const calm = matchMedia("(prefers-reduced-transparency: reduce)").matches;
    const brands = (navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } }).userAgentData?.brands;
    const chromium = Boolean(brands?.some((b) => /Chromium/i.test(b.brand)));
    // Browser-only facts, read once after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(calm ? "plain" : chromium ? "lens" : "frost");
  }, []);
  return mode;
}

/** The displacement map: red pushes sideways, blue up and down, a soft grey middle stays still. */
function mapFor(w: number, h: number, radius: number, edge: number) {
  const r = Math.min(radius, h / 2, w / 2);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">` +
    `<defs><linearGradient id="x" x1="100%" y1="0%" x2="0%" y2="0%"><stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="red"/></linearGradient>` +
    `<linearGradient id="y" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="blue"/></linearGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="black"/>` +
    `<rect width="${w}" height="${h}" rx="${r}" fill="url(#x)"/>` +
    `<rect width="${w}" height="${h}" rx="${r}" fill="url(#y)" style="mix-blend-mode:difference"/>` +
    `<rect x="${edge}" y="${edge}" width="${Math.max(0, w - edge * 2)}" height="${Math.max(0, h - edge * 2)}" rx="${Math.max(0, r - edge)}" fill="hsl(0 0% 50% / .93)" style="filter:blur(${Math.max(4, edge * 1.6)}px)"/>` +
    `</svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

const CHANNELS: [string, number][] = [
  ["1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0", 0],
  ["0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0", 10],
  ["0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0", 20],
];

/**
 * A glass layer to place behind content: absolutely positioned by the caller's className.
 * `strength` is how far the edge bends (negative bends inward, like a lens). `edge` is how
 * wide the bending rim is in pixels. `tint` is the surface colour over the glass, kept fairly
 * strong so text on it reads at AA contrast. `solid` is used where glass is off. `mask` fades the glass, for a soft edge.
 * `off` switches the glass off entirely (not just faded), so a hidden layer never bends anything.
 */
export function GlassBackdrop({ className = "", radius = 0, strength = -28, edge = 10, tint, frostTint, solid, mask, rim = true, off = false, style }: { className?: string; radius?: number; strength?: number; edge?: number; tint?: string; frostTint?: string; solid?: string; mask?: string; rim?: boolean; off?: boolean; style?: CSSProperties }) {
  const mode = useGlassMode();
  const ref = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const id = "glass-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");

  useEffect(() => {
    const el = ref.current;
    if (!el || mode !== "lens") return;
    const ro = new ResizeObserver(([e]) => {
      const w = Math.round(e.contentRect.width), h = Math.round(e.contentRect.height);
      setSize((s) => (s && s.w === w && s.h === h ? s : { w, h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [mode]);

  const filter = off ? "none" : mode === "lens" && size ? `url(#${id}) saturate(1.7) brightness(1.03)` : mode === "frost" ? "blur(20px) saturate(1.8) brightness(1.04)" : "none";
  const layer: CSSProperties = {
    position: "absolute",
    inset: 0,
    borderRadius: radius,
    backdropFilter: filter,
    WebkitBackdropFilter: mode === "frost" ? filter : undefined,
    background: mode === "frost" ? (frostTint ?? tint) : mode === "plain" ? (solid ?? tint) : tint,
    maskImage: mask,
    WebkitMaskImage: mask,
  };

  return (
    <span ref={ref} aria-hidden="true" className={`pointer-events-none ${className}`} style={{ borderRadius: radius, ...style }}>
      {mode === "lens" && size ? (
        <svg width="0" height="0" className="absolute" focusable="false">
          <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feImage x="0" y="0" width="100%" height="100%" href={mapFor(size.w, size.h, radius, edge)} preserveAspectRatio="none" result="map" />
            {CHANNELS.map(([m, add], i) => (
              <Fragment key={i}>
                <feDisplacementMap in="SourceGraphic" in2="map" scale={strength + (strength < 0 ? -add : add)} xChannelSelector="R" yChannelSelector="B" result={`d${i}`} />
                <feColorMatrix in={`d${i}`} type="matrix" values={m} result={`c${i}`} />
              </Fragment>
            ))}
            <feBlend in="c0" in2="c1" mode="screen" result="rg" />
            <feBlend in="rg" in2="c2" mode="screen" result="rgb" />
            <feGaussianBlur in="rgb" stdDeviation="0.6" />
          </filter>
        </svg>
      ) : null}
      <span style={layer} />
      {rim && mode !== "plain" ? (
        // The rim: a soft highlight on the top edge and a hairline below, like light on a glass edge.
        <span style={{ position: "absolute", inset: 0, borderRadius: radius, boxShadow: "inset 0 1px 0 rgba(255,255,255,.55), inset 0 -1px 0 rgba(0,18,63,.08)", maskImage: mask, WebkitMaskImage: mask }} />
      ) : null}
    </span>
  );
}
