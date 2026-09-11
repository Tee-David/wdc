"use client";

import { useTheme } from "next-themes";
import "./theme-switch-button.css";

/**
 * The theme switch, as a button with a label, for the mobile menu.
 *
 * WHY NOT THE CIRCULAR ONE FROM THE HEADER. That one is a 40px disc with the
 * words "Switch theme" sitting beside it in a plain <span> -- so the label
 * looked like part of the control and did nothing when tapped. On a phone, the
 * words are exactly what a thumb aims at, which made the real target a third
 * the size it appeared to be. Here the icon and the label are one button with
 * one background and one hit area.
 *
 * THE GLYPH IS CHOSEN BY CSS, not by React state, for the same reason as the
 * header toggle: `class="dark"` is on <html> before the first paint, while
 * hydration may be late or may never happen. See app/globals.css. The label
 * is deliberately a fixed "Switch theme" rather than "Switch to light mode",
 * which is only knowable after hydration and was wrong until then.
 */
export default function ThemeSwitchButton() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      className="tsb"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Switch theme"
    >
      <span className="tsb__ic" aria-hidden="true">
        <svg className="tt__g tt__sun" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
        </svg>
        <svg className="tt__g tt__moon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 13.2A8.6 8.6 0 0 1 10.8 3 8.6 8.6 0 1 0 21 13.2Z" />
        </svg>
      </span>
      <span>Switch theme</span>
    </button>
  );
}
