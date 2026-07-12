"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

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
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

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

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface/60 text-foreground backdrop-blur transition-transform duration-200 hover:scale-110 active:scale-95 ${className}`}
    >
      {/* Sun */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        className={`h-5 w-5 transition-all duration-300 ${
          isDark ? "scale-0 -rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
        } absolute`}
      >
        <circle cx="12" cy="12" r="4.5" />
        <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
      </svg>
      {/* Moon */}
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`h-5 w-5 transition-all duration-300 ${
          isDark ? "scale-100 rotate-0 opacity-100" : "scale-0 rotate-90 opacity-0"
        } absolute`}
      >
        <path d="M21 13.2A8.6 8.6 0 0 1 10.8 3 8.6 8.6 0 1 0 21 13.2Z" />
      </svg>
    </button>
  );
}
