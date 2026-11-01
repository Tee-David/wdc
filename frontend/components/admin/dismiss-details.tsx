"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Native disclosure and links still work before hydration. */
export function DismissDetails({ children, className }: { children: ReactNode; className: string }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const away = (event: PointerEvent) => {
      const details = ref.current;
      if (details?.open && event.target instanceof Node && !details.contains(event.target)) details.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      const details = ref.current;
      if (event.key === "Escape" && details?.open) {
        details.open = false;
        details.querySelector("summary")?.focus();
      }
    };
    /* A choice made inside closes it: a link navigates client-side, so React
       keeps this same element mounted and it would stay open over the list. */
    const details = ref.current;
    const chosen = (event: Event) => {
      if (event.type === "submit" || (event.target instanceof Element && event.target.closest("a[href]"))) details!.open = false;
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", escape);
    details?.addEventListener("click", chosen);
    details?.addEventListener("submit", chosen);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", escape);
      details?.removeEventListener("click", chosen);
      details?.removeEventListener("submit", chosen);
    };
  }, []);
  return <details ref={ref} className={className}>{children}</details>;
}
