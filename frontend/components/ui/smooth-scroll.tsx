"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

/**
 * Inertial smooth scrolling (Lenis) wired into GSAP's ticker so ScrollTrigger
 * (the scroll-reveal statement) stays in sync. Disabled under reduced motion.
 * Renders nothing.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    /* NOT ON TOUCH DEVICES. THIS IS THE MOBILE SCROLL HANG.
       The comment below used to claim touch was "left to the platform" because
       this build of Lenis does not smooth touch input. That is true of its
       INPUT handling and irrelevant to the problem: Lenis still runs its own
       rAF loop and still drives `window.scrollTo` towards its own target on
       every frame, whatever moved the page. On a phone the browser is already
       scrolling natively at the same time, so two things are writing the
       scroll position each frame and fighting each other.

       Profiled with real touch events on a phone profile at 4x CPU throttling:
       19% of a drag went to Lenis, `get actualScroll` alone taking 7.5%, with
       individual frames of 817ms. That is the hang -- not slow rendering, a
       tug of war over the scroll position.

       A phone's native scrolling is already inertial, hardware-accelerated and
       running off the main thread. There is nothing for Lenis to add there and
       a great deal for it to break, so it does not load at all: the effect is
       a desktop refinement, and on touch the platform simply does it better.

       `(hover: none) and (pointer: coarse)` rather than a width query -- a
       narrow desktop window is still a mouse, and a large tablet is still a
       finger. */
    if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) return;

    gsap.registerPlugin(ScrollTrigger);
    /* `anchors` is not optional here. Lenis owns the scroll position, so a
       native hash jump moves the document while Lenis's own target stays put,
       and the two then disagree — every in-page link on the site was landing
       hundreds of pixels off its section. Handing anchors to Lenis makes it
       animate to the target it is already tracking.

       The offset clears the fixed header (64px, 72px from md) plus the
       services page's sticky sub-nav, so a section never arrives underneath
       either of them. */
    const lenis = new Lenis({
      /* TIGHTER THAN IT WAS. This ran at 1.1, meaning every wheel tick glided
         for over a second before settling. That is a lot of inertia, and past
         roughly 0.9 it stops reading as smooth and starts reading as lag: the
         page keeps moving after you have stopped asking it to, which feels
         like the machine is behind you rather than with you. 0.75 keeps the
         glide and loses the drag. */
      duration: 0.75,
      /* Wheel only, and only on pointer devices -- see the bail-out above. */
      smoothWheel: true,
      anchors: { offset: -88 },
      /* Every horizontal rail on this site (the work track, the pinned
         services stage, the insight cards, the stage tab rows) is a nested
         scroll container. `smoothWheel` calls preventDefault on EVERY wheel
         event, so without this a sideways trackpad gesture over one of those
         rails was cancelled and neither axis moved -- the rails read as
         frozen. `allowNestedScroll` makes Lenis check the composed path for a
         nested scroller that can actually take the delta on that axis, and
         step aside when it finds one. */
      allowNestedScroll: true,
    });
    // Expose the instance so the intro overlay can stop/reset it while it owns
    // the viewport — otherwise Lenis keeps accumulating a scroll target from
    // the intro's wheel events and animates to the page bottom on hand-off.
    window.__lenis = lenis;

    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      if (window.__lenis === lenis) delete window.__lenis;
    };
  }, []);

  return null;
}

export default SmoothScroll;
