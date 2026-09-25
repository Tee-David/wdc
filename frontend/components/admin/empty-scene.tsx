import { Check, Plus, Search, X, type LucideIcon } from "lucide-react";

export type SceneKind = "first-use" | "no-results" | "cleared" | "error" | "forbidden";

/**
 * THE LITTLE ANIMATED PICTURE OVER EVERY EMPTY STATE (artifact: "WDC empty
 * states and dead ends"). One scene per kind, so the same kind of moment
 * looks the same everywhere:
 *
 *   first-use   a card carrying the section's own icon drops into a tray
 *   no-results  a magnifier sweeps over list rows
 *   cleared     a check tile bobs while sparks twinkle
 *   error       a plug reaches for its socket
 *   forbidden   a padlock gives a small shake
 *
 * Solid tone fills with white or black glyphs (never tints), transform and
 * opacity only, still under reduced motion, and stopped off screen by
 * `content-visibility: auto` on the scene rather than a script. Decorative:
 * the words beside it carry the meaning, so it is hidden from screen readers.
 */
export function EmptyScene({ kind, icon: Icon }: { kind: SceneKind; icon?: LucideIcon }) {
  return (
    <span className={`es es--${kind}`} aria-hidden="true">
      <span className="es__halo" />
      {kind === "first-use" ? (
        <>
          <span className="es__tray" />
          <span className="es__card">{Icon ? <Icon /> : <Plus />}<span className="es__badge"><Plus /></span></span>
        </>
      ) : kind === "no-results" ? (
        <>
          <span className="es__rows"><i /><i /><i /></span>
          <span className="es__lens"><Search /><span className="es__x"><X /></span></span>
        </>
      ) : kind === "cleared" ? (
        <>
          <span className="es__tick"><Check /></span>
          <span className="es__spark es__spark--a" /><span className="es__spark es__spark--b" /><span className="es__spark es__spark--c" />
        </>
      ) : kind === "error" ? (
        <>
          <span className="es__lead" />
          <span className="es__plug"><i /><i /></span>
          <span className="es__socket" />
          <span className="es__zap" />
        </>
      ) : (
        <>
          <span className="es__shackle" />
          <span className="es__lock"><i /></span>
        </>
      )}
    </span>
  );
}

/** Which scene a title asks for, for the call sites that do not say. */
export function sceneFor(title: string): SceneKind {
  if (/\bmatch|no results|nothing found/i.test(title)) return "no-results";
  if (/caught up|all clear|nothing (?:due|overdue|to pay|waiting|archived|on account)|everything .*paid/i.test(title)) return "cleared";
  if (/could not|couldn['’]t|did not load|failed|went wrong/i.test(title)) return "error";
  if (/for the owner|not allowed|no access|owner only/i.test(title)) return "forbidden";
  return "first-use";
}
