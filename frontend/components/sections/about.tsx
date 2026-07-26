"use client";

import { useRef } from "react";
import { motion } from "motion/react";
import { BlurScroller } from "@/components/ui/blur-scroller";

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
      className="relative z-0 -mt-10 flex min-h-svh items-center overflow-hidden bg-[#000065] py-24 text-white dark:bg-background md:-mt-16 md:py-28 lg:-mt-[5.5rem]"
    >
      <div className="mx-auto w-full max-w-[1280px] px-6 lg:px-10">
        {/* One heading, spanning both columns */}
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-14 max-w-4xl font-heading text-4xl font-bold leading-[1.05] tracking-tight md:mb-16 md:text-5xl xl:text-6xl"
        >
          You want results. We&apos;re the{" "}
          <span className="text-secondary">engine</span> behind them.
        </motion.h2>

        <div className="grid grid-cols-1 items-center gap-14 md:grid-cols-2 md:gap-16">
          {/* Left: scroll-linked blur word wheel */}
          <div className="order-2 md:order-1">
            <BlurScroller words={OUTCOMES} targetRef={sectionRef} />
          </div>

          {/* Right: the copy — no scroller */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
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
