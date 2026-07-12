"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

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
                className={`sr-word inline-block ${
                  highlight
                    ? "mx-[0.06em] rounded-lg bg-secondary px-[0.3em] py-[0.02em] text-white shadow-[0_6px_18px_-6px_rgba(255,101,0,0.6)]"
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
    const words = el.querySelectorAll<HTMLElement>(".sr-word");

    // Reduced motion: show everything, no scrub.
    if (reduce) {
      gsap.set(el, { rotate: 0 });
      gsap.set(words, { opacity: 1, filter: "blur(0px)" });
      return;
    }

    const ns = `sr-${srKey++}`;
    const ctx = gsap.context(() => {
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

    return () => ctx.revert();
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
