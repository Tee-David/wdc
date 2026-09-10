"use client";

import { useState } from "react";
import { Stage, TabRow, useStageMotion } from "./stage-shell";
import { WEB_STACKS, type WebStack } from "@/lib/showcase";
import StatusIcons from "@/components/ui/status-icons";

/**
 * 03 · Full-Stack Web — "One build, every viewport".
 *
 * One product shot — laptop, tablet and phone stacked and overlapping — and
 * the TAB decides what is running on all three.
 *
 * An earlier version resized a single frame across three widths on a timer,
 * which showed one thing at a time and proved nothing: a screenshot squashed
 * narrow is not a responsive layout, it is a squashed screenshot. Capturing a
 * page separately at 1440, 768 and 390 means each frame shows the layout that
 * width actually gets, and stacking them into one composition makes that the
 * argument in a single glance.
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

/** The page inside a frame: the capture, twice, translated by exactly -50% so
    a scrolling loop closes without anyone measuring the image height. */
function Screen({ src, scroll, alt, page }: {
  src?: string;
  scroll: boolean;
  alt: string;
  /** Is the asset a full-page capture? A page is taller than the frame, so
      held still it has to be CONTAINED or you see a sliver of it. A single
      screen is roughly the frame's own shape and is FILLED, because contained
      it sat inside the glass with a band of dead space along one edge --
      covering the frame without ever filling it. */
  page: boolean;
}) {
  if (!src) return <span className="dv__wait" aria-hidden="true" />;
  return (
    <div className={`dv__track${scroll ? "" : ` is-still dv__track--fit dv__track--${page ? "page" : "screen"}`}`}>
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
  );
}

/** Laptop and tablet: a browser window, with the chrome a browser actually has
    — real traffic lights and the address centred on the bar. */
function Window({
  device,
  src,
  url,
  scroll,
  alt,
  page,
}: {
  device: (typeof DEVICES)[number];
  src?: string;
  url: string;
  page: boolean;
  scroll: boolean;
  alt: string;
}) {
  return (
    <figure className={`dv dv--${device.id}`}>
      <div className="dv__body">
        <div className="dv__bar" aria-hidden="true">
          <i /><i /><i />
          <span className="dv__url">{url}</span>
        </div>
        <div className="dv__view">
          <Screen src={src} scroll={scroll} alt={alt} page={page} />
        </div>
      </div>
    </figure>
  );
}

/** The phone, drawn as a phone: bezel, Dynamic Island, status bar. A rounded
    rectangle with a grey pill on it fools nobody. */
function Phone({ src, scroll, alt, page }: { src?: string; scroll: boolean; alt: string; page: boolean }) {
  return (
    <figure className="dv dv--phone">
      <div className="dv__body">
        <span className="dv__island" aria-hidden="true" />
        <div className="dv__status" aria-hidden="true">
          <span className="dv__time">9:41</span>
          <StatusIcons />
        </div>
        <div className="dv__view">
          <Screen src={src} scroll={scroll} alt={alt} page={page} />
        </div>
      </div>
    </figure>
  );
}

export default function ViewportMorph() {
  const mode = useStageMotion();
  const [stack, setStack] = useState<string>(WEB_STACKS[0].id);
  const active: WebStack = WEB_STACKS.find((s) => s.id === stack) ?? WEB_STACKS[0];
  const still = mode === "still";
  const scroll = active.scroll && !still;
  /* On a phone the laptop stands ALONE.

     The three-up stack is 1071 units wide against a 604-tall plate, and a
     phone gives it about 325px: the laptop's screen lands at roughly 110px
     across, which is a picture of a website rather than a website. The old
     answer was to scale the plate 1.75x about a point near the overlap and let
     the laptop run off the left edge — readable, but you were seeing the
     middle of one browser window with no sign that the composition had three
     machines in it at all.

     So the crop is gone and the overlays go with it. One machine at full
     width is legible AND complete, which the crop could not be at the same
     time; the tablet and the phone are still there from 700px up, where there
     is room for all three. */
  const lone = mode === "compact";

  const controls = (
    <>
      <TabRow items={WEB_STACKS} value={stack} onChange={setStack} label="Build type" />
      <p className="sv-stage__note">{active.note}</p>
    </>
  );

  /* The caption states what is ACTUALLY on screen. Claiming three widths while
     showing one would be the caption contradicting the picture above it. */
  const caption = !active.shots
    ? `Screens for ${active.label} builds are being added.`
    : active.cap;

  return (
    <Stage caption={caption} controls={controls}>
      {/* keyed by stack so switching tab restarts the tracks together rather
          than dropping the new captures into the old one's mid-flight timing */}
      <div className={`vp3 vp3--${mode}`} key={active.id}>
        <div className="vp3__rack">
          <div className="vp3__scene">
            <Window
              device={DEVICES[0]}
              src={active.shots?.desktop}
              url={active.url}
              scroll={scroll}
              page={active.scroll}
              alt={`${active.shotOf ?? active.label} at 1440px wide`}
            />
            {/* The overlays appear only when a capture for that width EXISTS.
                A stack with a desktop capture and nothing else shows the laptop
                alone: rendering empty tablet and phone frames beside it reads
                as broken, and filling them with the desktop shot would present
                one screenshot as three different layouts. A stack with no
                captures at all still gets the desktop frame, which carries the
                awaiting state so the tab is never blank. */}
            {active.shots?.tablet && !lone ? (
              <Window
                device={DEVICES[1]}
                src={active.shots.tablet}
                url={active.url}
                scroll={scroll}
                page={active.scroll}
                alt={`${active.shotOf ?? active.label} at 768px wide`}
              />
            ) : null}
            {active.shots?.phone && !lone ? (
              <Phone
                src={active.shots.phone}
                scroll={scroll}
                page={active.scroll}
                alt={`${active.shotOf ?? active.label} at 390px wide`}
              />
            ) : null}
          </div>
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
