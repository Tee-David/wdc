"use client";

import { useMemo, useState } from "react";
import { Stage, TabRow, useStageMotion } from "./stage-shell";
import { BRAND_KINDS } from "@/lib/showcase";

/**
 * 01 · Branding & Design — a diagonal wall of brand work.
 *
 * Two rows of square tiles drifting in opposite directions inside a frame that
 * is rotated as a whole, so the work crosses the screen on the diagonal. The
 * tiles are REAL WDC artwork, filtered by the kind of work: flyers, marks,
 * mockups, guide spreads.
 *
 * The rows use the same duplicated-track trick as the feed wall — each row
 * renders its tiles twice and translates by exactly -50%, so the loop is
 * seamless without measuring anything at runtime.
 *
 * No per-tile captions on purpose: twenty labels sliding past on a diagonal are
 * unreadable, and the note above the wall already says what kind of work this
 * is. The descriptions still do their job for screen readers, in the list at
 * the bottom, which is also why the moving grid is aria-hidden.
 */

/* Each row has to be WIDER than the (deliberately oversized) rotated stage, or
   the -50% translate scrolls the end of the track into view. Twelve tiles per
   half clears the widest case several times over and, more to the point, puts
   more of the catalogue on screen at once. Thinner categories cycle their items
   to reach the count rather than leaving holes. */
const PER_ROW = 12;

/* FIVE rows, not two. A band rotated by 15deg only covers a WxH frame if it is
   about H + W*sin(15deg) tall; two rows of this tile size fell short of that at
   every width, which left the frame's top-left and bottom-right corners empty.
   Five rows overflow the frame instead, so the corners fill and the wall is
   clipped rather than fenced. Row height is unchanged — the fix is more rows,
   not bigger tiles. Four still left the 768px frame short — it is the tallest
   frame of the three — so the count is set by the worst case, not the average.
   Durations are all different so the rows never re-sync. */
const ROWS = [
  { dir: "l", dur: 46 },
  { dir: "r", dur: 58 },
  { dir: "l", dur: 52 },
  { dir: "r", dur: 64 },
  { dir: "l", dur: 55 },
] as const;

export default function GridMotion() {
  const mode = useStageMotion();
  const [kind, setKind] = useState(BRAND_KINDS[0].id);

  const active = BRAND_KINDS.find((k) => k.id === kind) ?? BRAND_KINDS[0];

  /* Each row starts five items further in. Five rather than a neater number
     because it stays distinct against every pool size here — 6 marks, 8
     mockups, 8 guides, 34 flyers all give five different starts, where a step
     of 2 or 3 makes rows repeat each other on the smaller sets. */
  const rows = useMemo(
    () =>
      ROWS.map((_, ri) =>
        Array.from({ length: PER_ROW }, (_, i) => {
          const it = active.items[(i + ri * 5) % active.items.length];
          return { ...it, key: `${active.id}-${ri}-${i}` };
        }),
      ),
    [active],
  );

  const controls = (
    <>
      <TabRow items={BRAND_KINDS} value={kind} onChange={setKind} label="Kind of work" />
      <p className="sv-stage__note">{active.note}</p>
    </>
  );

  return (
    <Stage caption="Selected WDC brand work." controls={controls}>
      <div className={`gm gm--${mode}`} aria-hidden="true">
        <div className="gm__stage">
          {rows.map((items, ri) => (
            <div className="gm__row" key={ri}>
              <div
                className={`gm__track is-${ROWS[ri].dir}`}
                style={{ animationDuration: `${ROWS[ri].dur}s` }}
              >
                {[0, 1].map((dup) => (
                  <div className="gm__half" key={dup}>
                    {items.map((it) => (
                      <div className="gm__tile" key={`${dup}-${it.key}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={it.src} alt="" loading="lazy" draggable={false} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* what the moving wall is, for anyone not watching it move */}
      <ul className="sr-only">
        {active.items.map((it) => (
          <li key={it.id}>{it.title}</li>
        ))}
      </ul>
    </Stage>
  );
}
