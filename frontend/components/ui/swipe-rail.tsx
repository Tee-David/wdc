"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import "./swipe-rail.css";

/**
 * A phone-only native swipe rail around a list, with dots under it.
 *
 * WHAT IT REPLACED. On phones these lists were pinned: the page held still
 * while a thousand or two pixels of downward scrolling moved the cards
 * sideways, and for all that distance the page seemed stuck. Here scrolling
 * down always moves the page down; the cards move when you swipe them, snap
 * one at a time, and the next one peeks in from the edge so it is obvious
 * there is more.
 *
 * Above 768px it is nothing: the wrapper is `display: contents` and the list
 * keeps the grid its own stylesheet gives it. The dots follow the card in
 * view through an IntersectionObserver on the cards, so nothing runs per
 * scroll frame and state changes only when the card does.
 */
const PHONE = "(max-width: 768px)";
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(PHONE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const onPhone = () => window.matchMedia(PHONE).matches;

export default function SwipeRail({ children, label, count, className = "" }: {
  children: ReactNode;
  /** Names the scroll region for a keyboard or screen-reader user. */
  label: string;
  /** How many cards, for the dots. */
  count: number;
  className?: string;
}) {
  const phone = useSyncExternalStore(subscribe, onPhone, () => false);
  const track = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);

  useEffect(() => {
    const t = track.current;
    if (!phone || !t) return;
    const items = [...t.querySelectorAll<HTMLElement>(":scope > * > *")];
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) setAt(items.indexOf(e.target as HTMLElement));
      }
    }, { root: t, threshold: 0.6 });
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [phone]);

  return (
    <div className={`srail ${className}`}>
      <div className="srail__track" ref={track}
        {...(phone ? { tabIndex: 0, role: "region", "aria-label": label } : {})}>
        {children}
      </div>
      <div className="srail__dots" aria-hidden="true">
        {Array.from({ length: count }, (_, n) => <i key={n} className={n === at ? "is-on" : undefined} />)}
      </div>
    </div>
  );
}
