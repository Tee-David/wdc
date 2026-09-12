"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const SmoothScroll = dynamic(
  () => import("./smooth-scroll").then((module) => module.SmoothScroll),
  { ssr: false },
);

/**
 * Lenis and GSAP are a desktop enhancement. Keeping the dynamic import behind
 * the same capability test as the implementation means touch devices do not
 * download, parse or compile either library just to return early in an effect.
 */
export default function SmoothScrollLoader() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const touch = window.matchMedia("(hover: none) and (pointer: coarse)");
    const update = () => setEnabled(!reduced.matches && !touch.matches);

    update();
    reduced.addEventListener("change", update);
    touch.addEventListener("change", update);
    return () => {
      reduced.removeEventListener("change", update);
      touch.removeEventListener("change", update);
    };
  }, []);

  return enabled ? <SmoothScroll /> : null;
}
