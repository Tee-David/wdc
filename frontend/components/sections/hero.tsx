"use client";

import Link from "next/link";
import { motion } from "motion/react";
import TextType from "@/components/ui/text-type";
import { LogoGlyph } from "@/components/ui/logo-glyph";
import LogoLoop from "@/components/ui/logo-loop";
import { LOGOS } from "@/lib/logos";

/** One word per service: branding, SEO, web, apps, software/AI. */
const ROTATING_WORDS = [
  "unforgettable.",
  "unmissable.",
  "pixel-perfect.",
  "everywhere.",
  "intelligent.",
];

const MARQUEE_LOGOS = LOGOS.map((entry) => ({
  title: entry.name,
  ariaLabel: entry.name,
  node: (
    <span className="group flex shrink-0 items-center gap-2 text-muted transition-colors duration-300 hover:text-foreground">
      <LogoGlyph
        entry={entry}
        mono
        className="h-[1em] w-[1em] opacity-70 transition-opacity duration-300 group-hover:opacity-100"
      />
      <span className="text-sm font-medium leading-none">{entry.name}</span>
    </span>
  ),
}));

function LogoMarquee() {
  return (
    <div id="hero-marquee" className="w-full">
      <p className="mb-5 text-center text-xs font-semibold uppercase tracking-[0.25em] text-muted">
        Powering brands with the world&apos;s best tools
      </p>
      <LogoLoop
        logos={MARQUEE_LOGOS}
        speed={90}
        direction="left"
        logoHeight={26}
        gap={44}
        pauseOnHover
        scaleOnHover
        fadeOut
        ariaLabel="Tools and platforms WDC works with"
      />
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative flex min-h-svh flex-col overflow-hidden pt-24 md:pt-32">
      {/* Ambient brand glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-[-10%] h-[520px] w-[520px] rounded-full bg-primary/20 blur-[140px] dark:bg-primary/40"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-10 left-[-8%] h-[380px] w-[380px] rounded-full bg-secondary/10 blur-[120px] dark:bg-secondary/15"
      />

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 text-center lg:px-10">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="mb-5 text-xs font-semibold uppercase tracking-[0.25em] text-secondary"
        >
          We don&apos;t just create — we dig deep
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="text-[2.6rem] font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl xl:text-7xl"
        >
          We make your business
          <br />
          <span className="text-secondary">&gt;</span>{" "}
          <TextType
            text={ROTATING_WORDS}
            typingSpeed={70}
            deletingSpeed={40}
            pauseDuration={1700}
            showCursor
            cursorCharacter="▎"
            className="font-heading"
          />
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.28 }}
          className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted md:text-lg"
        >
          WDC Solutions is the creative engine behind brands that get
          noticed, get found, and get results — branding &amp; design, SEO,
          full-stack web development, cross-platform apps, and AI-powered
          software engineering under one roof.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-9 flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            href="#contact"
            className="group inline-flex items-center gap-2 rounded-full bg-secondary px-7 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(255,101,0,0.4)] active:translate-y-0"
          >
            Book a Strategy Call
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
            >
              <path d="M2 8h11M9 3.5 13.5 8 9 12.5" />
            </svg>
          </Link>
          <Link
            href="#work"
            className="inline-flex items-center gap-2 rounded-full border border-line px-7 py-3.5 text-sm font-semibold text-foreground transition-all duration-200 hover:border-secondary hover:text-secondary"
          >
            Explore Our Work
          </Link>
        </motion.div>
      </div>

      {/* Bottom: tool logo carousel the intro logos land into */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.5 }}
        className="mx-auto w-full max-w-[1280px] px-6 pb-10 pt-16 lg:px-10"
      >
        <LogoMarquee />
      </motion.div>
    </section>
  );
}
