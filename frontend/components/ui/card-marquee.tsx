import type { ReactNode } from "react";
import "./card-marquee.css";

/**
 * A row of cards that drifts sideways, in pure CSS: transform only, no script.
 * The cards are rendered twice (the second copy is hidden from assistive tech)
 * so the loop has no seam. It pauses on hover and on keyboard focus, and under
 * reduced motion it stops and becomes an ordinary scrolling row.
 */
export function CardMarquee({ label, seconds = 60, reverse = false, children }: { label: string; seconds?: number; reverse?: boolean; children: ReactNode[] }) {
  return (
    <div className={`cm${reverse ? " cm--rev" : ""}`} role="region" aria-label={label} style={{ "--cm-s": `${seconds}s` } as React.CSSProperties}>
      <ul className="cm__track">{children.map((c, i) => <li key={i}>{c}</li>)}</ul>
      <ul className="cm__track cm__track--copy" aria-hidden="true" inert>{children.map((c, i) => <li key={i}>{c}</li>)}</ul>
    </div>
  );
}
