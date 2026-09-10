"use client";

/**
 * The handset status cluster: Wi-Fi and battery, drawn rather than iconised.
 *
 * Shared by every phone mockup on the site so they cannot drift apart -- the
 * apps stage draws two phones side by side and the web stage draws a third,
 * and three hand-rolled status bars is three chances to get one wrong.
 *
 * No cellular bars. They were the first thing to look wrong at this size: five
 * stepped rectangles inside twelve pixels resolve into a grey smear, and a
 * mockup of a product does not need to assert a carrier.
 */
/** Charge shown by the battery, 0-1. One constant so the outline and the fill
    inside it cannot disagree. */
const CHARGE = 0.82;

export default function StatusIcons() {
  /* Battery geometry, in the same user units as the viewBox. The body is an
     OUTLINE with a proportional fill inside it, which is what a handset
     actually draws. The previous version filled the body solid and knocked a
     "82" out of it: no outline, no level, and at this size it read as a grey
     badge rather than as a battery. */
  const bx = 13.4, by = 1.9, bw = 11.4, bh = 8.2, pad = 1.05;
  const inner = bw - pad * 2;

  return (
    <svg className="ph__status-i" viewBox="0 0 28 12" fill="none" aria-hidden="true">
      {/* Wi-Fi: three bands and a dot, which is the real shape. Two bands and a
          dot reads as a weak signal rather than as the icon. */}
      <g stroke="currentColor" strokeLinecap="round" fill="none">
        <path d="M.9 4.1a7.4 7.4 0 0 1 9.4 0" strokeWidth="1.35" />
        <path d="M2.7 6.4a4.7 4.7 0 0 1 5.8 0" strokeWidth="1.35" />
      </g>
      <circle cx="5.6" cy="9.4" r="1.15" fill="currentColor" />

      {/* battery: outline, level, nub */}
      <rect
        x={bx} y={by} width={bw} height={bh} rx="2.5"
        stroke="currentColor" strokeWidth="0.9" opacity=".42"
      />
      <rect
        x={bx + pad} y={by + pad} width={inner * CHARGE} height={bh - pad * 2}
        rx="1.2" fill="currentColor"
      />
      <path
        d={`M${bx + bw + 0.75} ${by + bh / 2 - 1.5}a1.5 1.5 0 0 1 0 3z`}
        fill="currentColor" opacity=".42"
      />
    </svg>
  );
}
