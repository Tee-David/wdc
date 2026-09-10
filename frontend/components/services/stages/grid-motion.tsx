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
   the -50% translate scrolls the end of the track into view. Ten tiles per half
   clears it at every width: the widest case is ~1820px of stage against 200px
   tiles. Thinner categories cycle their items to reach the count rather than
   leaving holes. */
const PER_ROW = 10;

const ROWS = [
  { dir: "l", dur: 46 },
  { dir: "r", dur: 58 }, // different durations so the rows never re-sync
] as const;

export default function GridMotion() {
  const mode = useStageMotion();
  const [kind, setKind] = useState(BRAND_KINDS[0].id);

  const active = BRAND_KINDS.find((k) => k.id === kind) ?? BRAND_KINDS[0];

  /* The second row starts three items in. Without the offset both rows show
     the same sequence and the wall reads as one list printed twice. */
  const rows = useMemo(
    () =>
      ROWS.map((_, ri) =>
        Array.from({ length: PER_ROW }, (_, i) => {
          const it = active.items[(i + ri * 3) % active.items.length];
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
