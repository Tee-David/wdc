"use client";

import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from "react";

/* GSAP IS NOT IMPORTED AT THE TOP OF THIS FILE, and that is deliberate.
   A static import puts ScrollTrigger in the bundle of every device that
   renders this heading, including the phones that never run the scrubbed
   version below. It is loaded inside the effect, on the branch that uses it.
   (GSAP's core still reaches phones through components/ui/staggered-menu.tsx,
   which genuinely animates the mobile menu. The plugin is what this saves.) */

/**
 * A reveal token: a plain string (split into words), a highlighted phrase
 * (rendered in the brand accent), or an inline icon/glyph placed between
 * words. Every word + icon reveals word-by-word on scroll (opacity + blur),
 * adapted from the react-bits `ScrollReveal` GSAP recipe but extended to
 * carry highlights and icons, styled with our Tailwind theme tokens.
 */
export type RevealToken =
  | string
  | { highlight: string }
  | { icon: ReactNode; label?: string };

interface ScrollRevealProps {
  tokens: RevealToken[];
  className?: string;
  textClassName?: string;
  baseOpacity?: number;
  enableBlur?: boolean;
  blurStrength?: number;
  baseRotation?: number;
}

let srKey = 0;

export function ScrollReveal({
  tokens,
  className = "",
  textClassName = "",
  baseOpacity = 0.12,
  enableBlur = true,
  blurStrength = 8,
  baseRotation = 1.5,
}: ScrollRevealProps) {
  const containerRef = useRef<HTMLHeadingElement>(null);

  const content = useMemo(() => {
    const nodes: ReactNode[] = [];
    /* Counts words, not tokens, so the CSS stagger on touch devices can lean on
       the word's own position rather than on a timeline. */
    let word = 0;
    tokens.forEach((token, ti) => {
      if (typeof token === "string" || "highlight" in token) {
        const text = typeof token === "string" ? token : token.highlight;
        const highlight = typeof token !== "string";
        text
          .split(/(\s+)/)
          .filter((chunk) => chunk.length > 0)
          .forEach((chunk, ci) => {
            if (/^\s+$/.test(chunk)) {
              nodes.push(<span key={`s-${ti}-${ci}`}> </span>);
              return;
            }
            nodes.push(
              <span
                key={`w-${ti}-${ci}`}
                style={{ "--i": word++ } as CSSProperties}
                className={`sr-word inline-block ${
                  highlight
                    /* BLACK ON THE ORANGE PILL, not white. White on #ff6500 is
                       2.95:1 and fails even the 3:1 allowed for large text;
                       black is 7.11:1. Same rule as every other accent fill on
                       the site -- see --on-accent. */
                    ? "mx-[0.14em] text-[0.88em] rounded-lg bg-secondary px-[0.22em] py-[0.05em] text-[var(--on-accent,#000)] shadow-[0_4px_12px_-4px_rgba(255,101,0,0.5)]"
                    : ""
                }`}
              >
                {chunk}
              </span>
            );
          });
      } else {
        nodes.push(
          <span
            key={`i-${ti}`}
            style={{ "--i": word++ } as CSSProperties}
            className="sr-word mx-2 inline-flex translate-y-[0.12em] items-center align-middle"
            aria-label={token.label}
            role={token.label ? "img" : undefined}
          >
            {token.icon}
          </span>
        );
      }
    });
    return nodes;
  }, [tokens]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Reduced motion: show everything, no scrub.
    if (reduce) {
      el.dataset.srMode = "static";
      return;
    }

    /* TOUCH DEVICES DO NOT GET THE SCRUB, AND THIS IS THE iOS SCROLL FIX.

       The desktop version below ties three ScrollTriggers to the scroll
       position with `scrub: true`, and one of them animates `filter: blur()`
       on every word. Blur is a paint-time filter, not a compositor one: each
       scroll frame gives every visible word a new blur radius, and each word
       then has to be rasterised again -- with `will-change` having already
       given each of them its own layer, so a paragraph is dozens of layers
       being repainted in step with the finger.

       Chrome on Android hides this, because there the scroll itself runs off
       the main thread and keeps moving whatever the page is doing. Safari on
       iOS does not, and the result is the page briefly refusing to keep up
       with the finger -- catching, rather than being slow.

       So on a touch device the reveal is a one-shot CSS transition instead:
       opacity only, no blur, no rotation, staggered by each word's own index,
       latched the first time the heading is seen and then finished with. It
       reads as the same effect and costs nothing per frame. The scrubbed
       version is a pointer-device refinement, which is where it was designed
       and where it is affordable. */
    if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) {
      const seen = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          el.dataset.srMode = "in";
          /* Mount-once. Nothing here should survive the reveal: an observer
             left connected is work done for the rest of the visit. */
          seen.disconnect();
        }
      }, { rootMargin: "0px 0px -12% 0px" });
      el.dataset.srMode = "wait";
      seen.observe(el);
      return () => seen.disconnect();
    }

    let ctx: { revert: () => void } | undefined;
    let cancelled = false;

    void (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      const words = el.querySelectorAll<HTMLElement>(".sr-word");
      const ns = `sr-${srKey++}`;
      ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { transformOrigin: "0% 50%", rotate: baseRotation },
        {
          ease: "none",
          rotate: 0,
          scrollTrigger: {
            id: `${ns}-rot`,
            trigger: el,
            start: "top bottom",
            end: "bottom bottom",
            scrub: true,
          },
        }
      );

      gsap.fromTo(
        words,
        { opacity: baseOpacity, willChange: "opacity, filter" },
        {
          ease: "none",
          opacity: 1,
          stagger: 0.05,
          scrollTrigger: {
            id: `${ns}-op`,
            trigger: el,
            start: "top bottom-=20%",
            end: "bottom bottom",
            scrub: true,
          },
        }
      );

      if (enableBlur) {
        gsap.fromTo(
          words,
          { filter: `blur(${blurStrength}px)` },
          {
            ease: "none",
            filter: "blur(0px)",
            stagger: 0.05,
            scrollTrigger: {
              id: `${ns}-blur`,
              trigger: el,
              start: "top bottom-=20%",
              end: "bottom bottom",
              scrub: true,
            },
          }
        );
      }
      }, el);
      /* GSAP now owns the inline styles on these words, so the CSS fallback
         must stop competing for them. */
      el.dataset.srMode = "gsap";
    })();

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [tokens, baseOpacity, enableBlur, blurStrength, baseRotation]);

  return (
    <h2 ref={containerRef} className={className}>
      <span
        className={`font-heading font-bold leading-[1.15] tracking-tight ${textClassName}`}
      >
        {content}
      </span>
    </h2>
  );
}

export default ScrollReveal;
