"use client";

import { useEffect, useState } from "react";
import { WdcMark } from "@/components/brand/logo";
import "./preloader.css";

/**
 * The preloader: the logo lockup assembling itself over the page, once per
 * browser session.
 *
 * THE MOVE, and why it is this one. The mark springs in from the left, and the
 * act of its box springing open from zero width is what shoves the wordmark to
 * the right -- so the two halves do not animate into position independently,
 * they collide into the lockup they already form in the header. The logo is
 * not being presented; it is being assembled, and it lands in the shape the
 * reader is about to see in the corner of every page.
 *
 * NON-BLOCKING, which is the part that matters. `pointer-events: none` and no
 * scroll lock: the page underneath is live and scrollable from the first
 * frame, so someone who already knows the site can scroll straight through it.
 * A preloader that holds the door shut is a toll, not an introduction, and
 * anyone who has seen it once should not be paying it again -- so it plays
 * once per browser session, and not at all under reduced motion.
 *
 * IT DEFERS TO THE INTRO. The homepage has its own full-screen ring intro on a
 * first visit, and two openings back to back is one too many. When the ring
 * has claimed the visit, the preloader stands down entirely.
 *
 * THE DECISION IS MADE BEFORE FIRST PAINT, NOT IN AN EFFECT. Whether the
 * overlay should play depends on three browser-only facts -- session storage,
 * the motion preference, and whether the ring intro has claimed this visit --
 * none of which the server can know. Deciding in an effect means the page
 * paints first and the overlay then drops on top of content the reader has
 * already started reading, which is worse than having no preloader at all.
 *
 * So the same inline script in app/layout.tsx that already decides the ring
 * intro decides this too, before the parser reaches the body, and writes the
 * answer to `data-preload` on the root element. The CSS keeps the overlay
 * hidden unless that attribute says `play`. The markup is therefore identical
 * on the server and the client -- nothing to mismatch -- and this component is
 * left with one job: take the overlay away when the hold is over.
 */
export default function Preloader() {
  const [phase, setPhase] = useState<"holding" | "leaving" | "done">("holding");

  useEffect(() => {
    /* The hold, and nothing else. If the script above decided against playing,
       the overlay is already `display: none` and this timer simply unmounts
       something nobody saw. */
    const leave = window.setTimeout(() => setPhase("leaving"), 1750);
    const done = window.setTimeout(() => setPhase("done"), 2200);
    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(done);
    };
  }, []);

  return phase === "done" ? null : <Overlay leaving={phase === "leaving"} />;
}

function Overlay({ leaving }: { leaving: boolean }) {
  return (
    <div
      className={`pl${leaving ? " is-leaving" : ""}`}
      aria-hidden="true"
    >
      <div className="pl__lockup">
        {/* The mark's BOX opens from zero width; the mark itself rushes in
            from the left inside it. The box is what displaces the wordmark. */}
        <div className="pl__markbox">
          <span className="pl__mark">
            <WdcMark tone="auto" />
          </span>
        </div>

        <span className="pl__word">
          <span className="pl__w1">We Dig</span>
          <span className="pl__w2">Creativity</span>
        </span>
      </div>

      {/* A thin line closing across the foot of the screen for the length of
          the hold. It is the only thing on the overlay that reports progress,
          and it is what stops the pause reading as a stall. */}
      <span className="pl__bar"><i /></span>
    </div>
  );
}
