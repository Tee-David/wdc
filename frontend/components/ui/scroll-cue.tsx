"use client";

import "./scroll-cue.css";

/**
 * The "keep going" cue for a pinned sideways run.
 *
 * THE PROBLEM IT SOLVES. A pinned horizontal rail is a section that does not
 * move vertically while you scroll it. On a phone the stage is only as tall as
 * one card, so the bottom two thirds of the screen is empty ground — and the
 * cards do not advance until you scroll, which is the one thing a reader who
 * thinks the page has ended will not do. The section reads as the end of the
 * document. It is not; there are five more cards and four more sections.
 *
 * WHAT IT IS. A short progress track with a chevron under it, set at the type
 * size of a caption in the muted colour. It says how far through the run you
 * are and which way to keep going, and it is deliberately quiet: this is a
 * hint for someone who is about to give up, not a call to action competing
 * with the cards above it.
 *
 * WHEN IT GOES. `--pin-p` is the run's own progress, 0 to 1, written by
 * whichever pin owns this. The cue fades out between 45% and 78% of the run,
 * so by the time the section releases and the next one arrives it has been
 * gone for a while — a hint still on screen when the thing it hints at is
 * finished is just furniture.
 *
 * It is `aria-hidden` and `pointer-events: none`. Nothing here is a control,
 * and none of the content behind it depends on it: the rail is a real scroll
 * container, so it can also simply be swiped.
 */
export default function ScrollCue({ label = "Keep scrolling" }: { label?: string }) {
  return (
    <div className="cue" aria-hidden="true">
      <span className="cue__bar"><i /></span>
      <span className="cue__t">
        {label}
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6"
             strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2.5v7M3 6.8 6 9.8l3-3" />
        </svg>
      </span>
    </div>
  );
}
