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
      className="relative flex min-h-svh items-center overflow-hidden bg-[#000065] py-24 text-white dark:bg-background md:py-28"
    >
      <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 items-center gap-14 px-6 md:grid-cols-2 md:gap-16 lg:px-10">
        {/* Left: scroll-linked blur word wheel */}
        <div className="order-2 md:order-1">
          <p className="mb-8 text-xs font-semibold uppercase tracking-[0.25em] text-secondary">
            What you actually want
          </p>
          <BlurScroller words={OUTCOMES} targetRef={sectionRef} />
        </div>

        {/* Right: the copy — no scroller */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="order-1 md:order-2"
        >
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.25em] text-secondary">
            Who we are
          </p>
          <p className="font-heading text-2xl font-semibold leading-relaxed tracking-tight md:text-3xl xl:text-[2.15rem]">
            WDC Solutions is the creative engine behind brands that get noticed,
            get found, and get results;{" "}
            <span className="text-secondary">branding &amp; design</span>,{" "}
            <span className="text-secondary">SEO</span>,{" "}
            <span className="text-secondary">full-stack web development</span>,{" "}
            <span className="text-secondary">cross-platform apps</span>, and{" "}
            <span className="text-secondary">AI-powered software engineering</span>{" "}
            under one roof.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

export default About;
