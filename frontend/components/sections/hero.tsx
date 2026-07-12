"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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

const STACK_IMAGES = [
  "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=900&q=80",
  "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=900&q=80",
  "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=900&q=80",
  "https://images.unsplash.com/photo-1522542550221-31fd19575a2d?w=900&q=80",
];

function ImageStack() {
  const [front, setFront] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(
      () => setFront((f) => (f + 1) % STACK_IMAGES.length),
      3800
    );
    return () => clearInterval(id);
  }, [reduceMotion]);

  const depthOf = (i: number) =>
    (i - front + STACK_IMAGES.length) % STACK_IMAGES.length;

  return (
    <div
      className="relative mx-auto aspect-[4/5] w-full max-w-[430px]"
      aria-hidden="true"
    >
      <AnimatePresence initial={false}>
        {STACK_IMAGES.map((src, i) => {
          const depth = depthOf(i);
          if (depth > 2) return null;
          return (
            <motion.div
              key={src}
              className="absolute inset-0 overflow-hidden rounded-3xl border border-line shadow-[0_25px_60px_rgba(0,0,101,0.25)]"
              style={{ transformOrigin: "bottom center" }}
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{
                opacity: depth === 2 ? 0.55 : 1,
                scale: 1 - depth * 0.06,
                y: depth * -26,
                rotate: depth * 2.5,
                zIndex: 10 - depth,
              }}
              exit={{ opacity: 0, x: 140, rotate: 10, transition: { duration: 0.45 } }}
              transition={{ type: "spring", stiffness: 200, damping: 26 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                className="h-full w-full object-cover"
                loading={depth === 0 ? "eager" : "lazy"}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent" />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

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

      <div className="mx-auto grid w-full max-w-[1280px] flex-1 items-center gap-14 px-6 md:grid-cols-[1.15fr_0.85fr] lg:px-10">
        {/* Left: copy */}
        <div className="text-center md:text-left">
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
            className="text-[2.6rem] font-bold leading-[1.05] tracking-tight md:text-6xl"
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
            className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted md:mx-0 md:text-lg"
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
            className="mt-9 flex flex-wrap items-center justify-center gap-4 md:justify-start"
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

        {/* Right: cycling image stack */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="hidden md:block"
        >
          <ImageStack />
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
