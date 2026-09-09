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
