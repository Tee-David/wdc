"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

/**
 * Loads the intro only for the visits that actually play it.
 *
 * THE MEASUREMENT. `IntroAnimation` is the heaviest client component on the
 * homepage -- a framer-motion ring of twenty-odd logos with a scroll-driven
 * morph -- and it was imported statically, so its JavaScript was parsed and
 * hydrated by every visitor on every visit. It plays on `/` only, only with
 * motion allowed, and only on a first visit or one more than thirty minutes
 * after the last. Every other visit paid for it and saw nothing.
 *
 * Lighthouse on the homepage: 86 KiB of unused JavaScript, 2.1s of script
 * bootup and 6.4s of main-thread work, for a performance score of 69. This is
 * the largest single piece of that which can be removed outright rather than
 * made smaller.
 *
 * HOW IT DECIDES. Not by re-deriving the rule -- the inline script in
 * app/layout.tsx already made the decision before first paint and wrote it to
 * `data-intro`. Reading that is the only way the two can be guaranteed to
 * agree, and disagreement here is the bad kind: `globals.css` paints a
 * full-screen cover while `data-intro="play"`, which only the intro itself
 * clears. Deciding "skip" here while the document says "play" would leave a
 * blank coloured screen with nothing to lift it.
 *
 * `ssr: false` because the intro is a viewport-owning overlay with no server
 * rendering worth doing, and the decision is browser-only in any case.
 *
 * `useSyncExternalStore` rather than an effect: `data-intro` is external state
 * that React does not own, it is already set before this component ever runs,
 * and it never changes afterwards. Reading it this way gives a correct server
 * snapshot (false, so the server renders nothing) without a setState in an
 * effect and without the extra render that would cause.
 */
const IntroAnimation = dynamic(() => import("./intro-animation"), { ssr: false });

/* Never changes once the pre-paint script has run, so there is nothing to
   subscribe to. */
const subscribe = () => () => {};
const getSnapshot = () => document.documentElement.dataset.intro === "play";
const getServerSnapshot = () => false;

export default function IntroMount() {
  const play = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return play ? <IntroAnimation /> : null;
}
