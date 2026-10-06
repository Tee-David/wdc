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
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  return <details ref={ref} className={className}>{children}</details>;
}
