"use client";

import { useState } from "react";
import { Stage, TabRow, useStageMotion } from "./stage-shell";
import { APP_KINDS } from "@/lib/showcase";

/**
 * 04 · Cross-Platform Apps — "One codebase, two stores".
 *
 * One source block feeds two device frames whose screens scroll in sync: the
 * "one codebase, every device" line, animated. The marquee is the same
 * infinite-track trick LogoLoop uses, running vertically — the track is
 * duplicated and translated by exactly half its height, so the seam never
 * shows and no measurement is needed.
 *
 * PLACEHOLDER: the screens are abstract UI blocks, not real product captures.
 * Real shots drop in against APP_KINDS[].screens; nothing else moves.
 */
/* Screen names come from the product kind, because "we build apps" is not a
   proposition — "we build the ERP your operations run on" is. */
/* One half of the track has to be taller than the screen or the -50% loop
   scrolls past the end and shows blank space at the bottom. */
function reel(screens: readonly string[]) {
  const cards = screens.map((t, i) => ({ t, rows: 3 + (i % 3), accent: i % 2 === 0 }));
  return [...cards, ...cards, ...cards];
}

function Phone({ os, paused, screens }:
  { os: "iOS" | "Android"; paused: boolean; screens: readonly string[] }) {
  const REEL = reel(screens);
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
  const [kind, setKind] = useState<string>(APP_KINDS[0].id);
  const paused = mode === "still";
  const active = APP_KINDS.find((k) => k.id === kind) ?? APP_KINDS[0];

  const controls = (
    <>
      <TabRow items={APP_KINDS} value={kind} onChange={setKind} label="Product type" />
      <p className="sv-stage__note">{active.note}</p>
    </>
  );

  /* Compact: two phones side by side on a 390px screen are thumbnails, so the
     narrow render shows one and lets you switch platform instead. */
  if (mode === "compact") {
    return (
      <Stage caption="One codebase, both stores." controls={controls}>
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
          <Phone os={os} paused={paused} screens={active.screens} />
        </div>
      </Stage>
    );
  }

  const screens = active.screens;

  return (
    <Stage caption="Illustrative screens. One source, two platforms." controls={controls}>
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
          {/* the screens this product kind actually ships with — the column
              was carrying one block against two full phones */}
          <ul className="ts__screens">
            {screens.map((sc) => <li key={sc}>{sc}</li>)}
          </ul>
          <p className="ts__ship">Both stores, one release.</p>
        </div>
        <div className="ts__devices">
          <Phone os="iOS" paused={paused} screens={active.screens} />
          <Phone os="Android" paused={paused} screens={active.screens} />
        </div>
      </div>
    </Stage>
  );
}
