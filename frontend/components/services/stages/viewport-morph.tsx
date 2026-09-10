"use client";

import { useState } from "react";
import { Stage, TabRow, useStageMotion } from "./stage-shell";
import { WEB_STACKS } from "@/lib/showcase";

/**
 * 03 · Full-Stack Web — "One build, every viewport".
 *
 * Three device mockups running the SAME page, each from a capture taken at that
 * device's real width, all scrolling at once.
 *
 * The old version resized a single frame across three widths on a timer, which
 * showed one thing at a time and proved nothing: a screenshot squashed narrow
 * is not a responsive layout, it is a squashed screenshot. Capturing the page
 * separately at 1440, 768 and 390 means each frame shows the layout that width
 * actually gets — the nav collapses, the columns stack, the type resets — and
 * putting them side by side makes that the whole argument.
 *
 * All three tracks share one duration, which is the trick that makes it read.
 * Each track is one capture tall, so equal duration means equal RELATIVE
 * progress: at eight seconds in, all three are showing the same part of the
 * same page in three different layouts. Matching pixel speed instead would
 * drift them apart within a screen, since the phone capture is 26 times its own
 * width and the desktop one only 5.7.
 *
 * The captures are WDC's own site, which is a real full-stack responsive build
 * and is named as ours in the caption. Client long-scrolls drop into SHOTS
 * without touching anything else here.
 */
const SHOTS = [
  { id: "desktop", label: "Desktop", px: 1440, src: "/work/long/wdc-desktop.jpg" },
  { id: "tablet", label: "Tablet", px: 768, src: "/work/long/wdc-tablet.jpg" },
  { id: "phone", label: "Phone", px: 390, src: "/work/long/wdc-phone.jpg" },
] as const;

/** One device. The track holds the capture TWICE and translates by exactly
 *  -50%, so the loop closes without measuring the image height. */
function Device({
  shot,
  stack,
  still,
}: {
  shot: (typeof SHOTS)[number];
  stack: string;
  still: boolean;
}) {
  return (
    <figure className={`dv dv--${shot.id}`}>
      <div className="dv__body">
        {shot.id === "desktop" ? (
          <div className="dv__bar" aria-hidden="true">
            <i /><i /><i />
            <span className="dv__url">{stack}</span>
          </div>
        ) : (
          <span className="dv__notch" aria-hidden="true" />
        )}
        <div className="dv__view">
          <div className={`dv__track${still ? " is-still" : ""}`}>
            {[0, 1].map((dup) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={dup}
                src={shot.src}
                alt={dup === 0 ? `The WDC site at ${shot.px}px wide` : ""}
                aria-hidden={dup === 1}
                loading="lazy"
                draggable={false}
              />
            ))}
          </div>
        </div>
      </div>
      <figcaption className="dv__cap">
        <span className="dv__label">{shot.label}</span>
        <span className="dv__px">{shot.px}px</span>
      </figcaption>
    </figure>
  );
}

export default function ViewportMorph() {
  const mode = useStageMotion();
  const [stack, setStack] = useState<string>(WEB_STACKS[2].id); // custom build
  const active = WEB_STACKS.find((s) => s.id === stack) ?? WEB_STACKS[0];
  const still = mode === "still";

  const controls = (
    <>
      <TabRow items={WEB_STACKS} value={stack} onChange={setStack} label="Build type" />
      <p className="sv-stage__note">{active.note}</p>
    </>
  );

  return (
    <Stage
      caption="Our own site, captured at three real widths. The frames are scrolling the live page."
      controls={controls}
    >
      <div className={`vp3 vp3--${mode}`}>
        <div className="vp3__rack">
          {SHOTS.map((s) => (
            <Device key={s.id} shot={s} stack={active.label.toLowerCase()} still={still} />
          ))}
        </div>
        <div className="vp3__chips">
          {active.chips.map((c, n) => (
            <span className="vp__chip" key={c} style={{ transitionDelay: `${n * 45}ms` }}>
              {c}
            </span>
          ))}
        </div>
      </div>
    </Stage>
  );
}
