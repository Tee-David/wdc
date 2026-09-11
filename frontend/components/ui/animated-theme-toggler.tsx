"use client";

import { useCallback, useRef } from "react";
import { useTheme } from "next-themes";

/* `useHasMounted` USED TO LIVE HERE and is gone with the state it fed. The
   glyph no longer waits for hydration to know which theme it is in -- CSS
   knows before the first paint. See the note beside the two SVGs below. */

/**
 * Theme toggle with a View-Transitions circle reveal expanding from the
 * button. Falls back to an instant swap where the API is unavailable
 * or reduced motion is requested.
 */
export function AnimatedThemeToggler({
  className = "",
  duration = 650,
}: {
  className?: string;
  duration?: number;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggle = useCallback(() => {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (!document.startViewTransition || reduceMotion || !buttonRef.current) {
      setTheme(next);
      return;
    }

    const { top, left, width, height } =
      buttonRef.current.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const maxRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = document.startViewTransition(() => {
      setTheme(next);
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${maxRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        }
      );
    });
  }, [resolvedTheme, setTheme, duration]);

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={toggle}
      /* ONE NEUTRAL LABEL, in both directions. The old one read the theme out
         of React, which before hydration is always "light" -- so a dark page
         announced "switch to dark mode" until the JavaScript landed, and said
         it for ever on a page whose chunk never arrived. "Switch theme" is
         true in both states and needs nothing loaded to be true. */
      aria-label="Switch theme"
      /* Brand navy with a white glyph, in BOTH themes. It used to take
         `bg-surface/60` and `text-foreground`, which follow the theme: in dark
         mode that was a near-white disc holding a near-white moon, so the icon
         disappeared into its own button. Only the glyph should change when you
         toggle; the button is a fixed object. */
      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#000065] text-white shadow-[0_2px_10px_-2px_rgba(0,0,26,0.5)] ring-1 ring-white/15 transition-transform duration-200 hover:scale-110 active:scale-95 ${className}`}
    >
      {/* WHICH GLYPH SHOWS IS DECIDED BY CSS, NOT BY REACT, and that is the
          whole fix for the moon that appeared with the wifi off.

          It used to be `isDark = mounted && resolvedTheme === "dark"`, and
          `mounted` is false until hydration -- so every page, in every theme,
          was SERVER-RENDERED showing the moon, and only swapped to the sun
          once the JavaScript arrived and ran. On a dark page with no network,
          where the chunk never arrives, it never swapped: a white moon, on a
          dark page, for ever.

          next-themes stamps `class="dark"` on <html> from a blocking inline
          script BEFORE first paint, so the correct glyph can be chosen with a
          plain descendant selector. No state, no hydration, no flash of the
          wrong icon on any load -- and it is still right when nothing but the
          HTML and the CSS made it through. See `.tt__sun` / `.tt__moon` in
          app/globals.css. */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        className="tt__g tt__sun h-5 w-5 absolute"
      >
        <circle cx="12" cy="12" r="4.5" />
        <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
      </svg>
      {/* Moon — shown in light mode. See the note on the sun above. */}
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="tt__g tt__moon h-5 w-5 absolute"
      >
        <path d="M21 13.2A8.6 8.6 0 0 1 10.8 3 8.6 8.6 0 1 0 21 13.2Z" />
      </svg>
    </button>
  );
}
