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
      duration: 1.1,
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
