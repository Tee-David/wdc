"use client";

import { useEffect, useRef } from "react";

/** Brings the current step of the sideways stage row into view on a narrow screen. Renders nothing; it acts on the list just before it. */
export function StageScroll() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const list = ref.current?.previousElementSibling as HTMLElement | null;
    const now = list?.querySelector<HTMLElement>(".is-now");
    if (!list || !now || list.scrollWidth <= list.clientWidth) return;
    list.scrollTo({ left: now.offsetLeft - (list.clientWidth - now.offsetWidth) / 2, behavior: "auto" });
  }, []);
  return <span ref={ref} hidden />;
}
