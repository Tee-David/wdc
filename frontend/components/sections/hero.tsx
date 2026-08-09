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

const MARQUEE_LOGOS = LOGOS.map((entry) => ({
  title: entry.name,
  ariaLabel: entry.name,
  node: (
    <span className="group flex shrink-0 items-center gap-2 !text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.45)] transition-colors duration-300 hover:!text-white/80 dark:text-muted dark:hover:text-foreground dark:[text-shadow:none]">
      <LogoGlyph
        entry={entry}
        mono
        className="h-[1em] w-[1em] opacity-80 transition-opacity duration-300 group-hover:opacity-100"
      />
      <span className="text-sm font-medium leading-none">{entry.name}</span>
    </span>
  ),
}));

function LogoMarquee() {
  return (
    <div id="hero-marquee" className="w-full">
      <p className="mb-5 text-center text-xs font-semibold uppercase tracking-[0.25em] !text-white [text-shadow:0_1px_12px_rgba(0,0,0,0.5)] dark:text-muted">
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

/** Three creative-workspace shots that cross-fade behind the hero. */
const BG_IMAGES = [
  "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1600&q=80",
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1600&q=80",
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1600&q=80",
];

function HeroBackdrop() {
  const [i, setI] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => setI((p) => (p + 1) % BG_IMAGES.length), 5000);
    return () => clearInterval(id);
  }, [reduceMotion]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <AnimatePresence initial={false}>
        <motion.img
          key={BG_IMAGES[i]}
          src={BG_IMAGES[i]}
          alt=""
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: { duration: 1.4, ease: "easeInOut" },
            scale: { duration: 6, ease: "linear" },
          }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </AnimatePresence>
      {/* Light mode: 40% black scrim for text legibility. Dark mode keeps a
          readability overlay + brand tint + bottom fade. */}
      <div className="absolute inset-0 bg-black/40 dark:bg-background/72" />
      <div className="absolute inset-0 dark:bg-gradient-to-b dark:from-transparent dark:via-transparent dark:to-background/85" />
      <div className="absolute inset-0 dark:bg-primary/25 dark:mix-blend-multiply" />
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative z-10 flex min-h-svh flex-col overflow-hidden rounded-b-[2.5rem] md:rounded-b-[4rem] lg:rounded-b-[5.5rem]">
      <HeroBackdrop />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 pt-28 text-center md:pt-32 lg:px-10">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="mb-5 text-xs font-semibold uppercase tracking-[0.25em] text-secondary [text-shadow:0_1px_14px_rgba(0,0,0,0.35)]"
        >
          ...brilliant simplicity of thought!
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="whitespace-nowrap text-[clamp(1.55rem,6.5vw,4.25rem)] font-bold leading-[1.08] tracking-tight !text-white [text-shadow:0_4px_20px_rgba(0,0,0,0.5),0_1px_4px_rgba(0,0,0,0.35)]"
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

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            href="#contact"
            className="group inline-flex items-center gap-2 rounded-full bg-secondary px-7 py-3.5 text-sm font-semibold text-white shadow-[0_12px_34px_rgba(255,101,0,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-[#000065] hover:shadow-none active:translate-y-0"
          >
            Let&apos;s Talk
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
            className="inline-flex items-center gap-2 rounded-full border border-line bg-white text-[#000065] px-7 py-3.5 text-sm font-semibold shadow-[0_8px_26px_rgba(0,0,0,0.12)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#000065] hover:text-white hover:border-[#000065] active:translate-y-0 dark:bg-background/40 dark:text-foreground dark:hover:bg-primary dark:hover:text-white dark:hover:border-primary"
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
        className="relative z-10 mx-auto w-full max-w-[1280px] px-6 pb-8 pt-6 lg:px-10"
      >
        <LogoMarquee />
      </motion.div>
    </section>
  );
}
