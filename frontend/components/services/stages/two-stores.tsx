"use client";

import { useState } from "react";
import { Stage, TabRow, useStageMotion } from "./stage-shell";
import CodeBrowser from "@/components/ui/code-browser";
import { APP_SOURCE, APP_KINDS } from "@/lib/showcase";

/**
 * 04 · Cross-Platform Apps — "One codebase, two stores".
 *
 * One source block feeds two device frames whose screens scroll in sync: the
 * "one codebase, every device" line, animated. The marquee is the same
 * infinite-track trick LogoLoop uses, running vertically — the track is
 * duplicated and translated by exactly half its height, so the seam never
 * shows and no measurement is needed.
 *
 * The four tabs render four genuinely different interfaces, from APP_KINDS[].ui:
 * a SaaS dashboard with KPIs and a chart, an ERP order table, a marketplace
 * grid with prices, a work queue with checkboxes. The previous version stacked
 * the same grey card under every tab, which made the control look decorative
 * and the whole stage look templated.
 *
 * These are SKETCHES of an interface, not captures of a shipped product, which
 * is what the caption says. Real screenshots drop in against the same slot.
 */
type Block = { t: string; a?: string; b?: string };

/** One interface block. Four shapes, because a dashboard, a table, a
 *  marketplace grid and a work queue do not look alike. */
function Blk({ blk }: { blk: Block }) {
  if (blk.t === "kpi") {
    return (
      <div className="ph__kpis">
        {[blk.a, blk.b].map((l) => (
          <span className="ph__kpi" key={l}>
            <i className="ph__kpin" />
            <em>{l}</em>
          </span>
        ))}
      </div>
    );
  }
  if (blk.t === "chart") {
    /* fixed heights, not random: a chart that reshuffles on every render reads
       as noise and makes the two phones disagree with each other */
    const bars = [38, 62, 45, 78, 56, 88, 70];
    return (
      <div className="ph__chart">
        {bars.map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}
      </div>
    );
  }
  if (blk.t === "tile") {
    return (
      <div className="ph__tile">
        <i className="ph__thumb" />
        <span className="ph__tt">{blk.a}</span>
        <span className="ph__tp">{blk.b}</span>
      </div>
    );
  }
  if (blk.t === "task") {
    return (
      <div className="ph__task">
        <i className={`ph__check${blk.b === "done" ? " is-done" : ""}`} />
        <span>{blk.a}</span>
      </div>
    );
  }
  return (
    <div className="ph__row">
      <span className="ph__ra">{blk.a}</span>
      <span className="ph__rb">{blk.b}</span>
    </div>
  );
}

/* One half of the track has to be taller than the screen or the -50% loop
   scrolls past the end and shows blank space at the bottom. Three passes of the
   block list clears it at every phone size on the page. */
function Phone({ os, paused, ui, screens }: {
  os: "iOS" | "Android";
  paused: boolean;
  ui: readonly Block[];
  screens: readonly string[];
}) {
  const REEL = [...ui, ...ui, ...ui];
  return (
    <div className={`ph ph--${os.toLowerCase()}`}>
      <div className="ph__os">{os}</div>
      <div className="ph__screen">
        {/* the platform's own status bar, which is most of what makes a frame
            read as iOS or Android rather than "a phone" */}
        <div className="ph__status" aria-hidden="true">
          <span>{os === "iOS" ? "9:41" : "09:41"}</span>
          <span className="ph__sig"><i /><i /><i /></span>
        </div>
        <div className="ph__head" aria-hidden="true">{screens[0]}</div>
        {/* The track is clipped by its OWN viewport, not by the phone frame.
            `ph-scroll` translates it upward by half its height, and a transform
            paints outside the flow: clipped only at the frame, the rising track
            slid up over the status bar and header and covered them. */}
        <div className="ph__vp">
        <div className={`ph__track${paused ? " is-still" : ""}`}>
          {[0, 1].map((dup) => (
            <div className="ph__half" key={dup} aria-hidden={dup === 1}>
              {REEL.map((blk, n) => <Blk blk={blk} key={`${dup}-${n}`} />)}
            </div>
          ))}
        </div>
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
          <Phone os={os} paused={paused} ui={active.ui} screens={active.screens} />
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
          {/* Real, switchable files rather than three words dressed as code.
              The claim of this stage is that one source ships to both stores,
              and a reader can now check it: the same screen component, the same
              client, and a config that names both platforms. */}
          <CodeBrowser files={APP_SOURCE} label="Shared source" />
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
          <Phone os="iOS" paused={paused} ui={active.ui} screens={active.screens} />
          <Phone os="Android" paused={paused} ui={active.ui} screens={active.screens} />
        </div>
      </div>
    </Stage>
  );
}
