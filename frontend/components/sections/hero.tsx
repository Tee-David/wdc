"use client";

import Link from "next/link";
import NextImage from "next/image";
import type React from "react";
import { useEffect, useState } from "react";
import TextType from "@/components/ui/text-type";
import { LogoGlyph } from "@/components/ui/logo-glyph";
import LogoLoop from "@/components/ui/logo-loop";
import { LOGOS } from "@/lib/logos";

/* The rotating half of the headline. Each line finishes the fixed line above
   it, so every one has to read as a whole sentence with "What if we made it"
   in front of it -- which is why these are phrases and questions rather than
   the single adjectives they replaced. */
const ROTATING_WORDS = [
  "your best decision?",
  "impossible to ignore?",
  "unfairly good?",
  "your competition's problem?",
  "ridiculously effective?",
  "the one they copy?",
  "convert like crazy?",
  "sell itself?",
  "the obvious choice?",
  "yours?",
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

/**
 * The backdrop cycle: one image per discipline, so the thing behind the claim
 * changes as you watch and covers the whole offer rather than one corner of it.
 *
 * Supplied by the studio and processed rather than dropped in raw — the
 * originals are 2576px camera files and this paints a 16:10 band. Each is
 * centre-cropped to that shape once, at build time, instead of being letterboxed
 * or squashed by the browser: a 2.5MB image resized on every load is the single
 * heaviest thing a hero can do to a phone on mobile data. Six images, 1.1MB
 * total, and only the first is eager.
 */
const BG_IMAGES = [
  "/hero/web-design.jpg",
  "/hero/design-desk.jpg",
  "/hero/mobile-dev.jpg",
  "/hero/ai-key.jpg",
  "/hero/search-console.jpg",
  "/hero/robotics.jpg",
];

/* Five is the number of bands. Enough that the wipe reads as a wipe rather
   than a two-piece split, few enough that a 390px phone still gets 78px
   slices and the compositor still gets one viewport of texture in total. */
const SLATS = 5;

function HeroBackdrop() {
  const [i, setI] = useState(0);
  /* THE FRAME WE CAME FROM, and the whole reason the transition used to look
     grey. Only one backdrop was ever mounted: `key` remounted it on every
     change, so the incoming image animated from opacity 0 with NOTHING behind
     it, and for the length of the fade the hero was the page's own dark ground
     seen through the scrim. That is not a crossfade, it is a dip to grey and
     back. Holding the previous frame underneath at full opacity means the new
     one fades over a picture instead of over a hole. */
  const [prev, setPrev] = useState<number | null>(null);
  const [warmNext, setWarmNext] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setI((p) => { setPrev(p); return (p + 1) % BG_IMAGES.length; }), 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    // Keep the second frame out of the initial network queue. It only becomes
    // visible after five seconds, so fetching it during the LCP window makes
    // the first frame slower for no user-visible benefit.
    const id = window.setTimeout(() => setWarmNext(true), 3500);
    return () => window.clearTimeout(id);
  }, []);

  const next = BG_IMAGES[(i + 1) % BG_IMAGES.length];

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* THE ANIMATION MOVED TO A WRAPPER so the picture itself can be a
          `next/image`. The crossfade and the slow scale are identical -- they
          are transform and opacity either way -- but the image is now resized
          per device and served as AVIF or WebP instead of as the raw 1.1MB set
          of JPEGs. This is the homepage's LCP element, and it was measuring
          5.4s on emulated mobile against a 2.5s target. */}
      {/* The outgoing frame, held still and fully opaque until the incoming one
          has covered it. No animation of its own: it is a floor, not a layer
          anyone is meant to notice. */}
      {prev !== null && prev !== i ? (
        <div className="absolute inset-0">
          <NextImage
            src={BG_IMAGES[prev]}
            alt=""
            fill
            sizes="100vw"
            quality={70}
            className="object-cover"
          />
        </div>
      ) : null}

      {/* FIRST FRAME: one plain image, no slats.

          The first backdrop is the page's Largest Contentful Paint, and the
          wipe below exists to move BETWEEN pictures. Running it on arrival
          would start the LCP element at opacity 0 in five pieces, which is the
          exact mistake the headline comment further down describes. So the
          entrance stays the plain fade it was, and the wipe only ever runs from
          the second slide onward -- by which time `prev` is set. */}
      {prev === null ? (
        <div className="hero-backdrop absolute inset-0">
          <NextImage
            src={BG_IMAGES[i]}
            alt=""
            fill
            /* Full-bleed at every width, so the browser should pick the
               variant that matches the viewport and nothing smaller. */
            sizes="100vw"
            /* It is the LCP element, so it is preloaded and fetched at high
               priority; every later frame appears at least five seconds in and
               has no business competing for that queue. Marking more than one
               image `priority` is the commonest way to make LCP worse rather
               than better. */
            priority
            quality={70}
            className="object-cover"
          />
        </div>
      ) : (
        /* THE SLIT WIPE.

           Five vertical bands of the incoming photograph slide into place in
           sequence over the frame we came from. It reads as one picture being
           drawn across the other rather than as a dissolve, and it is the
           reason `@vfx-js/core` was turned down: that would have cost a live
           WebGL context and a permanent requestAnimationFrame loop on the
           page's LCP element. This costs neither.

           WHY IT IS CHEAP. Each band is a `overflow: hidden` window holding
           the same image, shifted left by its own index so the picture lines
           up across all five -- so the five layers add up to exactly one
           viewport of texture, the same as the single layer it replaces, and
           the browser makes one network request because every band asks for
           the same URL. Only `transform` and `opacity` are animated, both of
           which the compositor handles without the main thread, so the wipe
           cannot collide with hydration, scrolling, or the typing headline.

           WHY THE ZOOM IS ON THE CONTAINER. A transform on a band moves that
           band's slice of the picture relative to its neighbours; that is the
           effect, and it resolves to zero. A SCALE per band would do the same
           thing permanently at the seams, because each band would scale about
           its own centre. Scaling the container scales all five together, so
           the slow push-in survives with the picture intact. */
        <div
          key={BG_IMAGES[i]}
          className="hero-slats"
          style={{ "--n": SLATS } as React.CSSProperties}
        >
          {Array.from({ length: SLATS }, (_, k) => (
            <span
              className="hero-slat"
              key={k}
              style={{ "--k": k } as React.CSSProperties}
            >
              <span className="hero-slat__in">
                <NextImage
                  src={BG_IMAGES[i]}
                  alt=""
                  fill
                  sizes="100vw"
                  quality={70}
                  className="object-cover"
                />
              </span>
            </span>
          ))}
        </div>
      )}

      {/* WARMING THE NEXT FRAME. The crossfade is 1.4s and an unfetched image
          cannot make that, so without this the first pass through the set fades
          to blank and then pops. This used to be `new Image()` with the raw
          path, which now fetches the ORIGINAL JPEG and defeats the optimiser
          entirely -- the wrong file, at full size, on every slide. Rendering
          the next frame as a real `next/image` at zero opacity fetches exactly
          the variant the visible one will ask for, so when it comes round it is
          already in the cache. */}
      {warmNext ? (
        <NextImage
          key={`warm-${next}`}
          src={next}
          alt=""
          fill
          sizes="100vw"
          quality={70}
          className="object-cover opacity-0"
        />
      ) : null}
      {/* Keep the photography visible while the white hero copy remains clear.
          A light base plus a scrim shaped to the copy, NOT one flat veil --
          see .hero-scrim in globals.css for the measurements behind the
          numbers, and re-measure if you change them. */}
      <div className="absolute inset-0 bg-black/30 dark:bg-background/28" />
      <div className="hero-scrim absolute inset-0" />
      <div className="absolute inset-0 dark:bg-gradient-to-b dark:from-transparent dark:via-transparent dark:to-background/60" />
      <div className="absolute inset-0 dark:bg-primary/10 dark:mix-blend-multiply" />
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative z-10 flex min-h-svh flex-col overflow-hidden rounded-b-[2.5rem] md:rounded-b-[4rem] lg:rounded-b-[5.5rem]">
      <HeroBackdrop />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 pt-28 text-center md:pt-32 lg:px-10">
        <p
          /* CSS, NOT JAVASCRIPT -- see the note on the h1 below. */
          style={{ animationDelay: "50ms" }}
          /* WHITE, with the orange carried by the emphasis alone.

             The whole line was `text-secondary`, which was fine over the dark
             brand artwork this hero used to show. Against the new photographs
             it is #ff6500 on rgb(103,103,103) — 1.83:1, which is not a colour,
             it is a smudge. White on the same ground is 5.66:1, and the motto
             keeps its accent on the two words that carry it, where the weight
             and the size already do most of the work.

             The pill behind it is the belt to that brace: small caps at 12px
             over a photograph need a ground of their own, not just a shadow. */
          className="hero-rise mb-5 inline-flex rounded-full bg-black/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-white backdrop-blur-[2px] [text-shadow:0_1px_10px_rgba(0,0,0,0.5)]"
        >
          ...brilliant simplicity{" "}
          <b className="ml-[0.4em] font-bold text-secondary">of thought!</b>
        </p>

        {/* THE ENTRANCE IS A CSS ANIMATION, NOT A JAVASCRIPT ONE, and this is
            the whole reason the homepage's LCP was bad.

            These three blocks were `motion` elements starting at `opacity: 0`.
            That opacity is inlined into the server HTML, so the headline is
            INVISIBLE until framer-motion hydrates and animates it in -- and
            hydration waits on ~240KB of JavaScript. Measured on emulated
            mobile: the hero photograph was painted at 1.8s, the page was
            otherwise done at 1.1s, and LCP landed at 4.9s because the largest
            element on the page was still transparent until the bundle arrived.

            A CSS keyframe runs from the first frame the browser paints, with no
            JavaScript involved at all. The animation is identical to look at.
            Under reduced motion the rule is dropped and the copy is simply
            there. */}
        <h1
          className="hero-rise--solid whitespace-nowrap text-[clamp(1.55rem,6.5vw,4.25rem)] font-bold leading-[1.08] tracking-tight !text-white [text-shadow:0_4px_20px_rgba(0,0,0,0.5),0_1px_4px_rgba(0,0,0,0.35)]"
        >
          {/* TWO BLOCKS, NOT ONE LINE AND A `<br>`, and the reason is
              measurable rather than typographic -- it looks identical.

              Largest Contentful Paint picks the block element holding the
              largest text and re-fires every time that block's content
              changes. With both lines in one block, the rotating word made the
              whole heading a new LCP candidate on every cycle, so the metric
              kept walking forward for as long as the animation ran: measured
              at 4.3s, 4.4s and 4.9s on successive runs of an identical page
              that had finished painting at 1.1s. It was reporting the age of
              the animation, not the speed of the site.

              Split, the candidate is this first line -- the longer of the two,
              and one whose text never changes -- and it settles once. The
              second line goes on animating; it is simply no longer the largest
              thing on the page. */}
          <span className="block">What if we made it&hellip;</span>
          {/* THE SECOND LINE CARRIES ITS OWN SIZE, and that is what keeps the
              promise of one line each.

              The two lines share an h1, so they used to share a font size.
              That was fine when the rotating half was "pixel-perfect." at
              fourteen characters; the longest of these is "your competition's
              problem?" at twenty-seven, nearly double. At the shared size it
              wrapped to two lines on a phone.

              `reserveWidth` already holds the width of the LONGEST phrase, so
              the line never reflows as the text types; the size here is chosen
              so that longest phrase, plus the chevron, fits the narrowest
              viewport we support. */}
          <span className="block text-[clamp(1.05rem,4.35vw,2.85rem)]">
          {/* Decorative. Without aria-hidden a screen reader reads the h1 as
              "What if we made it greater than your best decision". */}
          <span aria-hidden="true" className="text-secondary">&gt;</span>{" "}
          {/* `startFull` so the phrase is complete in the first render rather
              than typing itself in from empty; `reserveWidth` so the line does
              not reflow on every character. */}
          <TextType
            text={ROTATING_WORDS}
            typingSpeed={70}
            deletingSpeed={40}
            pauseDuration={1700}
            showCursor
            startFull
            reserveWidth
            cursorCharacter="▎"
            className="font-heading"
          />
          </span>
        </h1>

        <div
          className="hero-rise mt-8 flex w-full flex-col items-stretch justify-center gap-4 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center"
          style={{ animationDelay: "400ms" }}
        >
          <Link
            href="#pv-contact"
            className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-secondary px-7 py-3.5 sm:w-auto text-sm font-semibold text-black shadow-[0_12px_34px_rgba(255,101,0,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-black hover:shadow-none active:translate-y-0"
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
            href="#pv-work"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-line bg-white text-black px-7 py-3.5 sm:w-auto text-sm font-semibold shadow-[0_8px_26px_rgba(0,0,0,0.12)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#000065] hover:text-white hover:border-[#000065] active:translate-y-0 dark:bg-background/40 dark:text-foreground dark:hover:bg-primary dark:hover:text-white dark:hover:border-primary"
          >
            Explore Our Work
          </Link>
        </div>
      </div>

      {/* Bottom: tool logo carousel the intro logos land into */}
      <div
        style={{ animationDelay: "500ms" }}
        className="hero-rise relative z-10 mx-auto w-full max-w-[1280px] px-6 pb-8 pt-6 lg:px-10"
      >
        <LogoMarquee />
      </div>
    </section>
  );
}
