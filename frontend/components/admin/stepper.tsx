import { Check } from "lucide-react";
import "./workbench.css";

/**
 * A CHEVRON STEPPER: the stages a piece of work goes through, the finished
 * ones ticked, the current one in the words-on-orange fill, the rest flat.
 * Pass the steps and the index of the current one; `done` marks the last step
 * finished too (a delivered project). It is a list, so a screen reader hears
 * "step 3 of 6, current". On a narrow card the row scrolls inside itself and
 * keeps the current step in view without moving the page.
 */
export function Stepper({ steps, at, done = false, label }: { steps: readonly string[]; at: number; done?: boolean; label: string }) {
  return (
    <ol className="adSt" aria-label={label}>
      {steps.map((s, i) => {
        const finished = done || i < at;
        const cur = !done && i === at;
        return (
          <li key={s} className={`adSt__s${finished ? " is-done" : cur ? " is-now" : ""}`} aria-current={cur ? "step" : undefined}>
            <span className="adSt__n" aria-hidden="true">{finished ? <Check /> : i + 1}</span>
            <span className="adSt__t">{s}</span>
            <span className="ad__sr">{finished ? ", done" : cur ? ", current" : ", to come"}</span>
          </li>
        );
      })}
    </ol>
  );
}
