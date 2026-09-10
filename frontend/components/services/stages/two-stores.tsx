"use client";

import { useState } from "react";
import { Stage, TabRow, useStageMotion } from "./stage-shell";
import CodeBrowser from "@/components/ui/code-browser";
import DeviceFrame from "@/components/ui/device-frame";
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
/**
 * The status-bar cluster: wifi and battery.
 *
 * Drawn as one SVG rather than as three divs with borders. At this size — the
 * cluster is only about 14px wide — a battery built from a bordered box and a
 * pseudo-element cap lands on half-pixels and renders as a smudge. A single
 * viewBox scales cleanly to whatever the frame is, and `currentColor` keeps it
 * in step with the platform's own status colour.
 *
 * No cellular bars: these frames are showing an app being used, and the signal
 * meter is the one glyph in the row that says nothing about it. The viewBox is
 * narrowed to 20 rather than left at 34 with a hole in it, so the two remaining
 * glyphs sit against the right edge where a handset puts them.
 */
function StatusIcons() {
  return (
    <svg className="ph__status-i" viewBox="0 0 27 12" fill="currentColor" aria-hidden="true">
      {/* wifi: two arcs and a dot, stroked so the bands stay even */}
      <g transform="translate(0 1)" fill="none" stroke="currentColor" strokeLinecap="round">
        <path d="M.6 3.4a7 7 0 0 1 8.8 0" strokeWidth="1.5" />
        <path d="M2.7 6a4 4 0 0 1 4.6 0" strokeWidth="1.5" />
      </g>
      <circle cx="5" cy="10.2" r="1.1" />
      {/* battery: a filled body with the PERCENTAGE INSIDE it, which is what a
          current iPhone shows, plus the terminal nub. The digits are the bar's
          own background rather than a colour of their own, so they read as
          knocked out of the body however the frame is themed. */}
      <rect x="12" y="1.6" width="13" height="8.8" rx="2.6" />
      <text
        x="18.5" y="6.05"
        textAnchor="middle" dominantBaseline="central"
        fontSize="6.4" fontWeight="700" fill="var(--band)"
        style={{ fontFamily: "var(--font-space-grotesk), system-ui, sans-serif" }}
      >
        82
      </text>
      <rect x="25.7" y="4.3" width="1.3" height="3.4" rx=".6" opacity=".5" />
    </svg>
  );
}

function Phone({ os, paused, ui, screens, shot, shotOf }: {
  os: "iOS" | "Android";
  paused: boolean;
  ui: readonly Block[];
  screens: readonly string[];
  /** A real capture of the product. Wins over the sketch when present. */
  shot?: string;
  shotOf?: string;
}) {
  const REEL = [...ui, ...ui, ...ui];
  return (
    <div className={`ph ph--${os.toLowerCase()}`}>
      <div className="ph__os">{os}</div>
      {/* A real device render rather than a rounded rectangle with a pill on
          it. The frame carries the bezel, the camera and the corner radius the
          hardware actually has, which is what makes iOS read as iOS. */}
      <DeviceFrame
        device={os === "iOS" ? "iphone" : "android"}
        className="ph__frame"
        alt={shotOf ? `${shotOf} on a phone` : `A ${screens[0]} screen`}
      >
      <div className="ph__screen">
        {/* the platform's own status bar, which is most of what makes a frame
            read as iOS or Android rather than "a phone" */}
        <div className="ph__status" aria-hidden="true">
          <span className="ph__time">{os === "iOS" ? "9:41" : "09:41"}</span>
          <StatusIcons />
        </div>
        {/* The synthetic header is only for the SKETCH. A real capture brings
            the product's own top bar with it, and drawing a second one above
            that gives the phone two headers. */}
        {shot ? null : <div className="ph__head" aria-hidden="true">{screens[0]}</div>}
        {/* The track is clipped by its OWN viewport, not by the phone frame.
            `ph-scroll` translates it upward by half its height, and a transform
            paints outside the flow: clipped only at the frame, the rising track
            slid up over the status bar and header and covered them. */}
        <div className="ph__vp">
        {shot ? (
          /* The capture, twice, translated by -50%: the same seamless-loop
             trick the web stage uses, so a tall screen scrolls and closes
             without anyone measuring the image. */
          <div className={`ph__shot${paused ? " is-still" : ""}`}>
            {[0, 1].map((dup) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img key={dup} src={shot} alt="" aria-hidden="true" loading="lazy" draggable={false} />
            ))}
          </div>
        ) : (
          <div className={`ph__track${paused ? " is-still" : ""}`}>
            {[0, 1].map((dup) => (
              <div className="ph__half" key={dup} aria-hidden={dup === 1}>
                {REEL.map((blk, n) => <Blk blk={blk} key={`${dup}-${n}`} />)}
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
      </DeviceFrame>
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
          {/* the screens this product kind actually ships with — the column
              was carrying one block against two full phones */}
          <ul className="ts__screens">
            {screens.map((sc) => <li key={sc}>{sc}</li>)}
          </ul>
          <p className="ts__ship">Both stores, one release.</p>
        </div>
        <div className="ts__devices">
          <Phone os="iOS" paused={paused} ui={active.ui} screens={active.screens}
                 shot={active.shot} shotOf={active.shotOf} />
          <Phone os="Android" paused={paused} ui={active.ui} screens={active.screens}
                 shot={active.shot} shotOf={active.shotOf} />
        </div>
      </div>
    </Stage>
  );
}
