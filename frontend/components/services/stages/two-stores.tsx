"use client";

import { useState } from "react";
import { Stage, useStageMotion } from "./stage-shell";

/**
 * 04 · Cross-Platform Apps — "One codebase, two stores".
 *
 * One source block feeds two device frames whose screens scroll in sync: the
 * "one codebase, every device" line, animated. The marquee is the same
 * infinite-track trick LogoLoop uses, running vertically — the track is
 * duplicated and translated by exactly half its height, so the seam never
 * shows and no measurement is needed.
 *
 * PLACEHOLDER: the screens are abstract UI blocks, not real app captures.
 * Replace SCREENS with real product shots when they exist; nothing else moves.
 */
const SCREENS = [
  { t: "Dashboard", rows: 4, accent: true },
  { t: "Search", rows: 3, accent: false },
  { t: "Profile", rows: 5, accent: false },
  { t: "Checkout", rows: 3, accent: true },
];

/* One half of the track has to be taller than the screen or the -50% loop
   scrolls past the end and shows blank space at the bottom. */
const REEL = [...SCREENS, ...SCREENS, ...SCREENS];

function Phone({ os, paused }: { os: "iOS" | "Android"; paused: boolean }) {
  return (
    <div className={`ph ph--${os.toLowerCase()}`}>
      <div className="ph__os">{os}</div>
      <div className="ph__screen">
        <div className={`ph__track${paused ? " is-still" : ""}`}>
          {[0, 1].map((dup) => (
            <div className="ph__half" key={dup} aria-hidden={dup === 1}>
              {REEL.map((s, n) => (
                <div className="ph__card" key={`${dup}-${n}-${s.t}`}>
                  <span className={`ph__pill${s.accent ? " is-accent" : ""}`}>{s.t}</span>
                  {Array.from({ length: s.rows }).map((_, r) => (
                    <span className="ph__line" key={r} style={{ width: `${92 - r * 13}%` }} />
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TwoStores() {
  const mode = useStageMotion();
  const [os, setOs] = useState<"iOS" | "Android">("iOS");
  const paused = mode === "still";

  /* Compact: two phones side by side on a 390px screen are thumbnails, so the
     narrow render shows one and lets you switch platform instead. */
  if (mode === "compact") {
    return (
      <Stage caption="One codebase, both stores.">
        <div className="ts ts--compact">
          <div className="ts__toggle" role="group" aria-label="Platform">
            {(["iOS", "Android"] as const).map((o) => (
              <button
                key={o}
                type="button"
                className={`ts__tab${os === o ? " is-on" : ""}`}
                aria-pressed={os === o}
                onClick={() => setOs(o)}
              >
                {o}
              </button>
            ))}
          </div>
          <Phone os={os} paused={paused} />
        </div>
      </Stage>
    );
  }

  return (
    <Stage caption="One source, two platforms, the same screens.">
      <div className="ts">
        <div className="ts__src">
          <span className="ts__srclabel">One codebase</span>
          <div className="ts__code" aria-hidden="true">
            {["<App />", "screens/", "shared logic"].map((l) => (
              <span key={l}>{l}</span>
            ))}
          </div>
          <div className="ts__split" aria-hidden="true">
            <span /><span />
          </div>
        </div>
        <div className="ts__devices">
          <Phone os="iOS" paused={paused} />
          <Phone os="Android" paused={paused} />
        </div>
      </div>
    </Stage>
  );
}
