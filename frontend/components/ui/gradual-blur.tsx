"use client";

import { useEffect, useState, type CSSProperties } from "react";

/*
  Gradual blur along the bottom of the screen (same as Rank Indeed and Harize): five stacked
  layers, each blurring a little more and masked to its own band, so content dissolves into a
  frosted edge instead of being cut off. Fades out near the end of the page so the footer reads
  cleanly, and steps aside for anyone who asks for reduced transparency.
*/
const LAYERS: [number, number, number][] = [
  [0.5, 0, 20],
  [1, 20, 40],
  [2, 40, 60],
  [4, 60, 80],
  [8, 80, 100],
];

export default function GradualBlur() {
  const [off, setOff] = useState(false);
  const [plain, setPlain] = useState(false);

  useEffect(() => {
    setPlain(window.matchMedia("(prefers-reduced-transparency: reduce)").matches);
    let raf = 0;
    const check = () => {
      raf = 0;
      setOff(document.documentElement.scrollHeight - window.innerHeight - window.scrollY < 60);
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, []);

  if (plain) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[35] h-16 transition-opacity duration-500 sm:h-24"
      style={{ opacity: off ? 0 : 1 }}
    >
      {LAYERS.map(([blur, from, to]) => {
        const mask = `linear-gradient(to bottom, transparent ${from}%, #000 ${to}%)`;
        const s: CSSProperties = { position: "absolute", inset: 0, backdropFilter: `blur(${blur}px)`, WebkitBackdropFilter: `blur(${blur}px)`, maskImage: mask, WebkitMaskImage: mask };
        return <i key={blur} style={s} />;
      })}
    </div>
  );
}
