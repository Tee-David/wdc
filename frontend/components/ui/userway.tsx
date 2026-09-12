"use client";

import { useCallback, useRef } from "react";
import "./userway.css";

/**
 * The UserWay accessibility menu.
 *
 * WHAT IT IS. A third-party widget offering contrast, text size, spacing,
 * cursor and screen-reader adjustments. It does not make the site accessible
 * by itself -- semantics, focus order and contrast are ours to get right in
 * the markup, and are -- but it gives a reader controls the site does not
 * otherwise offer.
 *
 * IT IS NOT LOADED WITH THE PAGE. Same reasoning as the AI agent beside it:
 * the widget pulls its own runtime and styles, and putting that in front of
 * every first paint would hand back the work spent getting the homepage fast.
 * It arrives only when somebody reaches the accessibility button. Until then
 * this is one button and no third-party network, script, stylesheet or cookie.
 *
 * WHY OUR OWN BUTTON. Theirs ships with the script, so a deferred script means
 * no trigger at all until something triggers it, which is a chicken and egg.
 * Ours is always there, in the brand's colours, in the corner the layout
 * reserved for it, and it hands over the moment the real menu is ready.
 * `data-trigger` is what UserWay documents for exactly this: bind their menu
 * to an element of ours rather than take a corner of the screen themselves.
 */

const SRC = "https://cdn.userway.org/widget.js";
const ACCOUNT = "VX940Pk1yl";
/** Their menu binds to this id, so their own launcher never renders. */
const TRIGGER_ID = "wdc-userway-trigger";

export default function UserWay({ className = "" }: { className?: string }) {
  const asked = useRef(false);

  const load = useCallback(() => {
    if (asked.current) return;
    asked.current = true;
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.setAttribute("data-account", ACCOUNT);
    /* Bind their menu to our button instead of letting them place their own
       floating trigger, which would land in the same corner as the agent. */
    s.setAttribute("data-trigger", TRIGGER_ID);
    /* A failed CDN is not a reason to have no button: clearing the guard lets
       the next press try again. */
    s.onerror = () => { asked.current = false; s.remove(); };
    document.body.appendChild(s);
  }, []);

  return (
    <button
      id={TRIGGER_ID}
      type="button"
      className={`uw ${className}`}
      onPointerEnter={load}
      onFocus={load}
      onClick={load}
      aria-label="Accessibility options"
    >
      {/* The universal access mark: a figure with arms out in a ring. Drawn
          rather than imported, because it is one icon and it has to take the
          button's colour through every state. */}
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
           strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9.2" />
        <circle cx="12" cy="7.4" r="1.15" fill="currentColor" stroke="none" />
        <path d="M6.9 10.2c3.3 1 7 1 10.2 0" />
        <path d="M12 10.6v3.6m0 0-2.3 4.2m2.3-4.2 2.3 4.2" />
      </svg>
      <span className="uw__t">Accessibility</span>
    </button>
  );
}
