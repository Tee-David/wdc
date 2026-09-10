"use client";

import { useState } from "react";
import "./faq-accordion.css";

/**
 * The FAQ accordion, shared by the homepage and /contact.
 *
 * WHY IT IS NOT `<details>`. It was, in both places, and `<details>` cannot be
 * animated: the browser un-renders the content when `open` is removed, so the
 * panel does not collapse, it vanishes on the frame the attribute changes.
 * Both lists snapped open and shut with nothing in between. The usual fix —
 * keeping `open` permanently set and animating a wrapper inside — buys the
 * animation by telling every screen reader that all eight answers are expanded
 * when seven of them are a zero-height box.
 *
 * So: a real button and a real region, with `aria-expanded` saying what is
 * actually true and `inert` keeping a collapsed answer out of the tab order and
 * the accessibility tree. The height itself comes from a `0fr -> 1fr` grid row
 * rather than a `max-height` guess, so the transition runs to the answer's own
 * height whatever length it is — a `max-height` large enough for the longest
 * answer makes every shorter one appear to snap open early.
 *
 * One open at a time: opening a question closes whichever was open, so the
 * list never grows past a screen and the next question is always in reach.
 */
export default function FaqAccordion({
  items,
  numbered = true,
  idPrefix = "faq",
  /** Which one starts open. -1 for all closed. */
  initial = 0,
}: {
  items: readonly { q: string; a: string }[];
  /** The homepage counts its questions; a narrower column reads better without. */
  numbered?: boolean;
  idPrefix?: string;
  initial?: number;
}) {
  const [open, setOpen] = useState(initial);

  return (
    <div className={`qa${numbered ? " qa--numbered" : ""}`}>
      {items.map((f, i) => {
        const on = open === i;
        const panelId = `${idPrefix}-p-${i}`;
        const headId = `${idPrefix}-h-${i}`;
        return (
          <div className={`qa__item${on ? " is-open" : ""}`} key={f.q}>
            <h3 className="qa__h">
              <button
                type="button"
                className="qa__q"
                id={headId}
                aria-expanded={on}
                aria-controls={panelId}
                onClick={() => setOpen((cur) => (cur === i ? -1 : i))}
              >
                {numbered ? (
                  <span className="qa__n" aria-hidden="true">/ {String(i + 1).padStart(2, "0")}</span>
                ) : null}
                <span className="qa__t">{f.q}</span>
                {/* The plus loses its upright stroke to become a minus. Drawn
                    from two pseudo-elements so one rule flips every row. */}
                <span className="qa__i" aria-hidden="true" />
              </button>
            </h3>
            <div
              className="qa__panel"
              id={panelId}
              role="region"
              aria-labelledby={headId}
              inert={!on}
            >
              <div className="qa__inner">
                <p>{f.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
