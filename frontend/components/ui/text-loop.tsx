"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Cycles a list of phrases in place, one at a time.
 *
 * The width is held by the LONGEST phrase, rendered once, invisibly, in normal
 * flow — the visible phrase is absolutely positioned over it. Without that the
 * container resizes on every swap and drags the surrounding layout with it,
 * which is the failure that makes most rotating-word components unusable in a
 * line of running text.
 *
 * Reduced motion shows the first phrase and never cycles: a word that changes
 * under you is exactly what that setting is asking us not to do.
 */
export default function TextLoop({
  items,
  interval = 2400,
  className = "",
  itemClassName = "",
}: {
  items: string[];
  /** ms each phrase is held. */
  interval?: number;
  className?: string;
  itemClassName?: string;
}) {
  const [i, setI] = useState(0);
  const [on, setOn] = useState(false);
  const timer = useRef<number>(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (items.length < 2) return;
    // deferred a frame: a synchronous setState here cascades a second render
    // on mount, and the first phrase is already correct without it
    const id = requestAnimationFrame(() => setOn(true));
    timer.current = window.setInterval(
      () => setI((n) => (n + 1) % items.length),
      interval,
    );
    return () => { cancelAnimationFrame(id); window.clearInterval(timer.current); };
  }, [items.length, interval]);

  const longest = items.reduce((a, b) => (b.length > a.length ? b : a), items[0] ?? "");

  return (
    <span className={`tl ${className}`}>
      {/* the sizer: holds the box open so nothing around it moves */}
      <span className="tl__sizer" aria-hidden="true">{longest}</span>
      <span
        key={on ? i : "static"}
        className={`tl__item${on ? " is-anim" : ""} ${itemClassName}`}
      >
        {items[on ? i : 0]}
      </span>
    </span>
  );
}
