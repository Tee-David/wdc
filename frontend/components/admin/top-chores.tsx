"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * ON A PHONE THE PAGE'S ⋮ SITS IN THE TOP BAR, after the bell, instead of on a
 * row of its own under the lede. The shells render an empty slot
 * (`TopChoresSlot`); the page head wraps its chores in `PhoneChores`, which
 * moves them there once the screen is phone width. Until then they render in
 * the head, inside a wrapper the stylesheet already hides on phones, so the
 * head never shows a row that then disappears.
 */
const SLOT = "ad-topChores";
const PHONE = "(max-width: 640px)";

export function TopChoresSlot() {
  return <span id={SLOT} className="ad__topChores" />;
}

export function PhoneChores({ children }: { children: React.ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const mq = window.matchMedia(PHONE);
    const sync = () => setHost(mq.matches ? document.getElementById(SLOT) : null);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return host ? createPortal(children, host) : <span className="adPh__chores">{children}</span>;
}
