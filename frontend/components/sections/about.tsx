"use client";

import { useRef } from "react";
import { motion } from "motion/react";
import { OptionWheel } from "@/components/ui/option-wheel";
import { LineShadowText } from "@/components/ui/line-shadow-text";

/** Ten outcomes clients actually come to us for — one or two words each. */
const OUTCOMES = [
  "Brand Visibility",
  "More Sales",
  "Engagement",
  "Conversions",
  "Web Traffic",
  "Quality Leads",
  "Customer Loyalty",
  "Market Reach",
  "Retention",
  "Real Growth",
];

/**
 * Full-screen positioning section: a scroll-driven "focus flow" word wheel of
 * the outcomes clients want (left) beside WDC's one-roof value line (right).
 * Deep royal blue in light mode; default dark surface in dark mode.
 */
export function About() {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={sectionRef}
      id="about"
      /* Flat edges — it tucks beneath the hero's bottom curve above and the
         Services' top curve below, so its colour fills both seams. */
      className="relative z-0 -mt-10 flex min-h-svh items-center overflow-hidden bg-[#000065] py-32 text-white dark:bg-background md:-mt-16 md:py-40 lg:-mt-[5.5rem] lg:py-48"
    >
      <div className="mx-auto w-full max-w-[1280px] px-6 lg:px-10">
        {/* One centred heading, spanning both columns */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mb-20 max-w-4xl text-balance text-center font-heading text-4xl font-bold leading-[1.05] tracking-tight md:mb-24 md:text-5xl xl:text-6xl"
        >
          You want results. We&apos;re the{" "}
          <LineShadowText className="text-secondary" shadowColor="#ff6500">
            engine
          </LineShadowText>{" "}
          behind them.
        </motion.h2>

        <div className="grid grid-cols-1 items-center gap-14 md:grid-cols-2 md:gap-16">
          {/* Left: interactive option wheel — bends and flows as the rAF loop
              eases each option along the circle. The arrow rides beside it. */}
          <div className="order-2 md:order-1">
            <div className="relative flex h-[380px] w-full items-stretch md:h-[440px]">
              {/* Arrow */}
              <div
                aria-hidden="true"
                className="absolute left-0 top-1/2 z-10 flex -translate-y-1/2 items-center"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-10 w-10 text-secondary drop-shadow-[0_2px_8px_rgba(255,101,0,0.5)]"
                >
                  <path d="M4 12h14M12 6l6 6-6 6" />
                </svg>
              </div>
              <div className="h-full w-full pl-14">
                <OptionWheel
                  items={OUTCOMES}
                  targetRef={sectionRef}
                  textColor="rgba(255,255,255,0.35)"
                  activeColor="#ffffff"
                  fontSize={2.6}
                  spacing={1.5}
                  curve={1}
                  tilt={7}
                  blur={3}
                  fade={0.22}
                  smoothing={200}
                  inset={80}
                />
              </div>
            </div>
          </div>

          {/* Right: the copy — no scroller */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
            className="order-1 md:order-2"
          >
            {/* All white — the services carry extra font weight instead of
                colour so they still stand out against the copy. */}
            <p className="font-heading text-2xl font-normal leading-relaxed tracking-tight text-white md:text-3xl xl:text-[2.15rem]">
              WDC Solutions is the creative engine behind brands that get
              noticed, get found, and get results;{" "}
              <span className="font-extrabold">branding &amp; design</span>,{" "}
              <span className="font-extrabold">SEO</span>,{" "}
              <span className="font-extrabold">full-stack web development</span>,{" "}
              <span className="font-extrabold">cross-platform apps</span>, and{" "}
              <span className="font-extrabold">
                AI-powered software engineering
              </span>{" "}
              under one roof.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default About;
