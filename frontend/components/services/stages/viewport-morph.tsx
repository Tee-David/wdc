"use client";

import { useState } from "react";
import { Stage, TabRow, useStageMotion } from "./stage-shell";
import { WEB_STACKS, type WebStack } from "@/lib/showcase";

/**
 * 03 · Full-Stack Web — "One build, every viewport".
 *
 * Three device mockups, and the TAB decides what is in them.
 *
 * An earlier version resized a single frame across three widths on a timer,
 * which showed one thing at a time and proved nothing: a screenshot squashed
 * narrow is not a responsive layout, it is a squashed screenshot. Capturing a
 * page separately at 1440, 768 and 390 means each frame shows the layout that
 * width actually gets, and putting them side by side makes that the argument.
 *
 * Two behaviours, chosen per stack rather than globally:
 *
 *  - A tall page SCROLLS. All three tracks share one duration, which is what
 *    makes it read: each track is one capture tall, so equal duration means
 *    equal RELATIVE progress and at eight seconds in all three are showing the
 *    same part of the same page in three different layouts. Matching pixel
 *    speed would drift them apart within a screen, since the phone capture is
 *    26 times its own width and the desktop one only 5.7.
 *  - A dashboard HOLDS STILL. It is one screen, already fitting its frame;
 *    scrolling it would just jitter a static image.
 *
 * A stack with no captures says so. Borrowing another stack's screens to fill
 * the WordPress tab would be a lie told in pictures.
 */
const DEVICES = [
  { id: "desktop", label: "Desktop", px: 1440, key: "desktop" },
  { id: "tablet", label: "Tablet", px: 768, key: "tablet" },
  { id: "phone", label: "Phone", px: 390, key: "phone" },
] as const;

function Device({
  device,
  src,
  stack,
  scroll,
  alt,
}: {
  device: (typeof DEVICES)[number];
  src?: string;
  stack: string;
  scroll: boolean;
  alt: string;
}) {
  return (
    <figure className={`dv dv--${device.id}`}>
      <div className="dv__body">
        {device.id === "desktop" ? (
          <div className="dv__bar" aria-hidden="true">
            <i /><i /><i />
            <span className="dv__url">{stack}</span>
          </div>
        ) : (
          <span className="dv__notch" aria-hidden="true" />
        )}
        <div className="dv__view">
          {src ? (
            /* The track holds the capture TWICE and translates by exactly -50%,
               so a scrolling loop closes without measuring the image height. */
            <div className={`dv__track${scroll ? "" : " is-still"}${scroll ? "" : " dv__track--fit"}`}>
              {(scroll ? [0, 1] : [0]).map((dup) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={dup}
                  src={src}
                  alt={dup === 0 ? alt : ""}
                  aria-hidden={dup === 1}
                  loading="lazy"
                  draggable={false}
                />
              ))}
            </div>
          ) : (
            <span className="dv__wait" aria-hidden="true" />
          )}
        </div>
      </div>
      <figcaption className="dv__cap">
        <span className="dv__label">{device.label}</span>
        <span className="dv__px">{device.px}px</span>
      </figcaption>
    </figure>
  );
}

export default function ViewportMorph() {
  const mode = useStageMotion();
  const [stack, setStack] = useState<string>(WEB_STACKS[0].id);
  const active: WebStack = WEB_STACKS.find((s) => s.id === stack) ?? WEB_STACKS[0];
  const still = mode === "still";
  const scroll = active.scroll && !still;

  const controls = (
    <>
      <TabRow items={WEB_STACKS} value={stack} onChange={setStack} label="Build type" />
      <p className="sv-stage__note">{active.note}</p>
    </>
  );

  const caption = active.shots
    ? `${active.shotOf}, captured at three real widths.`
    : `Screens for ${active.label} builds are being added.`;

  return (
    <Stage caption={caption} controls={controls}>
      {/* keyed by stack so switching tab restarts the tracks together rather
          than dropping the new captures into the old one's mid-flight timing */}
      <div className={`vp3 vp3--${mode}`} key={active.id}>
        <div className="vp3__rack">
          {DEVICES.map((d) => (
            <Device
              key={d.id}
              device={d}
              src={active.shots?.[d.key]}
              stack={active.label.toLowerCase()}
              scroll={scroll}
              alt={`${active.shotOf ?? active.label} at ${d.px}px wide`}
            />
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
