export const STAMP_STATES = {
  paid:      { word: "PAID",      top: "THANK YOU",   bottom: "THANK YOU",    tone: "good" },
  part:      { word: "PART PAID", top: "RECEIVED",    bottom: "BALANCE DUE",  tone: "warn" },
  pending:   { word: "PENDING",   top: "AWAITING",    bottom: "CONFIRMATION", tone: "warn" },
  overdue:   { word: "OVERDUE",   top: "PAST DUE",    bottom: "PLEASE SETTLE", tone: "bad" },
  failed:    { word: "FAILED",    top: "NOT TAKEN",   bottom: "TRY AGAIN",    tone: "bad" },
  refunded:  { word: "REFUNDED",  top: "RETURNED",    bottom: "IN FULL",      tone: "info" },
  reversed:  { word: "REVERSED",  top: "NOT COLLECTED", bottom: "SEE NOTES",  tone: "mute" },
  void:      { word: "VOID",      top: "CANCELLED",   bottom: "NOT PAYABLE",  tone: "mute" },
  draft:     { word: "DRAFT",     top: "NOT ISSUED",  bottom: "NOT PAYABLE",  tone: "mute" },
} as const;

export type StampStatus = keyof typeof STAMP_STATES;

/**
 * A hash that looks random and is not. `fract(sin(x) * large)`, the same one
 * the confetti uses. Pure, stable across renders, identical on the server and
 * in the browser.
 */
export const noise = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * A circle as a path, so it can share a subpath with another one.
 *
 * WHY NOT `<circle>`. Every ring here is a filled band with a hole, and the
 * reliable way to cut that hole is two subpaths of one path under
 * `fill-rule: evenodd`. `<circle>` cannot be a subpath.
 *
 * TWO HALF-ARCS, NOT ONE. The usual shorthand -- a single arc whose endpoint
 * is a hair from its start -- renders as a filled disc in some engines and a
 * ring in others, which is exactly what went wrong the first time this was
 * drawn: every stamp came out as a solid coin with the lettering buried
 * inside it. Two 180-degree arcs meeting at the far side is unambiguous.
 */
export const circlePath = (cx: number, cy: number, r: number) =>
  `M${(cx + r).toFixed(2)},${cy}` +
  `A${r.toFixed(2)},${r.toFixed(2)} 0 1,0 ${(cx - r).toFixed(2)},${cy}` +
  `A${r.toFixed(2)},${r.toFixed(2)} 0 1,0 ${(cx + r).toFixed(2)},${cy}Z`;

/**
 * The scalloped outer edge.
 *
 * A real rubber stamp's rim is cut, not drawn, so the outline is a ring of
 * lobes rather than a circle. Built as one path of arcs so it is a single
 * shape the browser fills in one go.
 */
export function scallop(cx: number, cy: number, r: number, lobes: number) {
  const step = (Math.PI * 2) / lobes;
  /* The bump radius is the chord between two lobe centres, halved. Deriving it
     rather than picking a number keeps the lobes touching exactly at any lobe
     count, with no gaps and no overlap. */
  const bump = Math.sin(step / 2) * r;
  let d = "";
  for (let i = 0; i < lobes; i++) {
    const a0 = i * step - Math.PI / 2;
    const a1 = (i + 1) * step - Math.PI / 2;
    const p0 = [cx + Math.cos(a0) * r, cy + Math.sin(a0) * r];
    const p1 = [cx + Math.cos(a1) * r, cy + Math.sin(a1) * r];
    if (i === 0) d += `M${p0[0].toFixed(2)},${p0[1].toFixed(2)}`;
    d += `A${bump.toFixed(2)},${bump.toFixed(2)} 0 0 1 ${p1[0].toFixed(2)},${p1[1].toFixed(2)}`;
  }
  return d + "Z";
}
