"use client";

import { useEffect, useRef } from "react";

/**
 * A figure that counts up to itself when a screen opens: "₦2.1m", "41%", "5".
 *
 * THE REAL VALUE IS WHAT THE SERVER SENDS. The page is rendered with the
 * final text, so without JavaScript, or before hydration, the figure is
 * already right; nothing on a money screen ever reads 0 that is not 0. The
 * count only runs when it can start before anyone has read the number: on a
 * client-side navigation (a fresh mount), or on a full load that hydrated
 * within the first second and a half. Otherwise it stays still.
 *
 * Only the digits move. The prefix, the suffix and the number of decimals are
 * read off the text, so "₦3.0m" counts 0.0 to 3.0 and keeps its m.
 *
 * A screen reader hears the final text once: the moving copy is aria-hidden.
 * Reduced motion shows the value as it is.
 */
const PARSE = /^(\D*?)(-?\d[\d,]*(?:\.\d+)?)([^]*)$/;
const DURATION = 900;

export function CountUp({ value, className }: { value: string; className?: string }) {
  const m = PARSE.exec(value);
  const el = useRef<HTMLSpanElement>(null);

  /* The frames write the text node React rendered, rather than state: sixty
     renders a second for a number is work nobody sees, and React keeps
     owning the node, so a new value from the server still lands on it. */
  useEffect(() => {
    const node = el.current?.firstChild;
    if (!m || !node || node.nodeType !== Node.TEXT_NODE) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    /* A full load that took this long to hydrate has already been read. */
    if (!navigatedHere() && performance.now() > 1500) return;
    const [, pre, num, post] = m;
    const target = Number(num.replace(/,/g, ""));
    if (!Number.isFinite(target) || target === 0) return;
    const decimals = (num.split(".")[1] ?? "").length;
    const commas = num.includes(",");
    const fmt = (n: number) => commas
      ? n.toLocaleString("en-NG", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      : n.toFixed(decimals);
    const final = node.nodeValue;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / DURATION);
      node.nodeValue = p < 1 ? `${pre}${fmt(target * (1 - Math.pow(1 - p, 3)))}${post}` : final;
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    node.nodeValue = `${pre}${fmt(0)}${post}`;
    raf = requestAnimationFrame(tick);
    /* A tab in the background stops the frames; finish rather than resume. */
    const hide = () => { if (document.hidden) { cancelAnimationFrame(raf); node.nodeValue = final; } };
    document.addEventListener("visibilitychange", hide);
    return () => { cancelAnimationFrame(raf); node.nodeValue = final; document.removeEventListener("visibilitychange", hide); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount, on purpose
  }, []);

  if (!m) return <span className={className}>{value}</span>;
  return (
    <span className={`adCount${className ? ` ${className}` : ""}`}>
      <span className="ad__sr">{value}</span>
      <span aria-hidden="true" ref={el}>{value}</span>
    </span>
  );
}

/* A client-side navigation mounts the page after the document finished
   loading, so the whole count is seen. */
function navigatedHere() {
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return nav ? nav.loadEventEnd > 0 && performance.now() - nav.loadEventEnd > 200 : false;
}
