"use client";

import { useEffect, useRef } from "react";
import { StageProvider } from "@/components/auth/stage/stage-context";

const PHONE = "(max-width: 767.98px)";
const KEYBOARD_PX = 150;

/**
 * THE FRAME, AND THE ONE THING IT DOES ON A PHONE.
 *
 * When a field has focus AND the visual viewport has shrunk by more than
 * 150px, the keyboard is up. The blue band then folds down to a 76px strip
 * with a small orb and one line of text, so the field and the button stay
 * above the keyboard, and the orb keeps reacting at its small size. A browser
 * without `visualViewport` folds on focus alone when the pointer is coarse.
 *
 * Nothing here writes a scroll position except the one `scrollIntoView` for
 * the focused field once the band has finished folding, and it never runs on
 * a desktop.
 */
export function AuthFrame({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const main = ref.current;
    if (!main) return;
    const phone = window.matchMedia(PHONE);
    const coarse = window.matchMedia("(pointer: coarse)");
    const vv = window.visualViewport;
    let base = vv?.height ?? window.innerHeight;
    let compact = false;
    let scrollTimer = 0;

    /* Where the orb goes when the band folds: a 52px circle, 16px in from the
       left, centred in the 76px strip. Measured from where it rests, which
       is the only moment its box is not already transformed. */
    const measureFold = () => {
      const orb = main.querySelector<HTMLElement>(".orb");
      const band = main.querySelector<HTMLElement>(".au__brand");
      if (!orb || !band) return;
      const o = orb.getBoundingClientRect();
      const b = band.getBoundingClientRect();
      const safeTop = Math.max(0, parseFloat(getComputedStyle(band).paddingTop) - 12);
      main.style.setProperty("--orb-s", (52 / o.width).toFixed(4));
      main.style.setProperty("--orb-dx", `${(b.left + 16 + 26 - (o.left + o.width / 2)).toFixed(1)}px`);
      main.style.setProperty("--orb-dy", `${(b.top + safeTop + 38 - (o.top + o.height / 2)).toFixed(1)}px`);
    };

    const focusedField = () => {
      const active = document.activeElement;
      return active instanceof HTMLInputElement && active.type !== "hidden" && main.contains(active) ? active : null;
    };

    const update = () => {
      const field = focusedField();
      if (!field && vv) base = Math.max(base, vv.height);
      const shrunk = vv ? base - vv.height > KEYBOARD_PX : coarse.matches;
      const next = phone.matches && Boolean(field) && shrunk;
      if (next === compact) return;
      if (next) measureFold();
      compact = next;
      main.dataset.compact = next ? "true" : "false";
      window.clearTimeout(scrollTimer);
      if (next && field) {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        scrollTimer = window.setTimeout(() => field.scrollIntoView({ block: "center", behavior: "auto" }), reduced ? 0 : 420);
      }
    };

    /* Focus moves before the next element has it; read on the next tick. */
    const deferred = () => window.setTimeout(update, 0);
    const onOrientation = () => {
      base = vv?.height ?? window.innerHeight;
      update();
    };

    main.addEventListener("focusin", deferred);
    main.addEventListener("focusout", deferred);
    vv?.addEventListener("resize", update, { passive: true });
    window.addEventListener("orientationchange", onOrientation);
    phone.addEventListener("change", update);
    return () => {
      window.clearTimeout(scrollTimer);
      main.removeEventListener("focusin", deferred);
      main.removeEventListener("focusout", deferred);
      vv?.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", onOrientation);
      phone.removeEventListener("change", update);
    };
  }, []);

  return (
    <StageProvider>
      <main ref={ref} id="main" tabIndex={-1} className="au" data-compact="false">
        {children}
      </main>
    </StageProvider>
  );
}
