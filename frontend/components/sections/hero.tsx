"use client";

import Link from "next/link";
import NextImage from "next/image";
import { useEffect, useRef, useState } from "react";
import TextType from "@/components/ui/text-type";
import { LogoGlyph } from "@/components/ui/logo-glyph";
import LogoLoop from "@/components/ui/logo-loop";
import { LOGOS } from "@/lib/logos";

/* The rotating half of the headline. Each line finishes the fixed line above
   it, so every one has to read as a whole sentence with "What if we made it"
   in front of it -- which is why these are phrases and questions rather than
   the single adjectives they replaced.

   EVERY ONE OF THESE FITS ON ONE LINE ON A PHONE, and that is now the rule
   this list is kept to rather than a happy accident. Four were removed for
   failing it: "your competition's problem?", "ridiculously effective?" and
   "impossible to ignore?" wrapped at every mobile width, and "the obvious
   choice?" wrapped at 320. A headline that is two lines for three phrases and
   three lines for the others makes the whole hero jump, and `reserveWidth`
   below holds the box of the TALLEST phrase -- so one wrapping phrase cost
   every other phrase a line of empty space underneath it.

   MEASURED OFF THE LIVE RENDER, not off arithmetic, and the difference
   mattered: computing the column as "the h1 less the chevron" and comparing
   intrinsic widths said all six of the first cut fitted, and three of them
   still wrapped on screen. The reserved sizer sits in the same grid cell as
   the phrase and carries the chevron with it, so the room the words actually
   get is narrower than that sum -- 239px at 320, not 249. What settles it is
   `.text-type__content`'s own count of line boxes while the set cycles, which
   is what `tests/hero.spec.ts` asserts at 320, 360, 390 and 430. Re-measure
   there before adding a phrase; do not reason about character counts. */
const ROTATING_WORDS = [
  "the one they copy?",
  "convert like crazy?",
  "unfairly good?",
  "sell itself?",
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
 * The backdrop cycle: one photograph per discipline, so what is behind the
 * claim changes as you watch and covers the whole offer.
 *
 * IT CAME BACK, LIGHTER THAN IT LEFT. The first carousel mounted five sliced
 * copies of every frame and decoded new photographs while the visitor was
 * trying to scroll, so it was replaced by one still image. The rotation is
 * wanted, the cost was not, so this version keeps what the still image fixed:
 *  - the first frame is the page's LCP: plain, `priority`, never animated in;
 *  - rotation starts only after the page's `load`, so no later frame competes
 *    with the first for bandwidth;
 *  - at most two frames are mounted (the one showing and the one fading in),
 *    and the next is fetched and decoded BEFORE it is shown, so a slow phone
 *    holds the current picture rather than fading to a half-loaded one;
 *  - it stops while the hero is off screen or the tab is hidden, and never
 *    runs under reduced motion.
 * A crossfade over the previous frame, opacity and transform only.
 */
const HERO_IMAGES = [
  "/hero/web-design.jpg",
  "/hero/design-desk.jpg",
  "/hero/mobile-dev.jpg",
  "/hero/ai-key.jpg",
  "/hero/search-console.jpg",
  "/hero/robotics.jpg",
];
const HOLD_MS = 5500;

/** The optimiser URL next/image will ask for at this width, so warming it
    fetches the same bytes the frame is about to request. */
function optimisedUrl(src: string) {
  const w = [390, 640, 828, 1080, 1280, 1600, 1920].find((x) => x >= window.innerWidth * Math.min(window.devicePixelRatio || 1, 2)) ?? 1920;
  return `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=70`;
}

function HeroBackdrop() {
  const root = useRef<HTMLDivElement>(null);
  /* `shown` is on top; `under` is the frame it is fading over. */
  const [shown, setShown] = useState(0);
  const [under, setUnder] = useState<number | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let visible = true;
    let timer = 0;
    let current = 0;
    let cancelled = false;

    const advance = async () => {
      const next = (current + 1) % HERO_IMAGES.length;
      /* Fetched and decoded first; a frame that is not ready is not shown. */
      try {
        const img = new window.Image();
        img.src = optimisedUrl(HERO_IMAGES[next]);
        await img.decode();
      } catch {
        schedule();
        return;
      }
      if (cancelled) return;
      setUnder(current);
      setShown(next);
      current = next;
      schedule();
    };
    const schedule = () => {
      window.clearTimeout(timer);
      if (!cancelled && visible && document.visibilityState === "visible") {
        timer = window.setTimeout(advance, HOLD_MS);
      }
    };

    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); });
    const onVisibility = () => schedule();
    const start = () => {
      if (root.current) io.observe(root.current);
      document.addEventListener("visibilitychange", onVisibility);
      schedule();
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("load", start);
      document.removeEventListener("visibilitychange", onVisibility);
      io.disconnect();
    };
  }, []);

  return (
    <div
      ref={root}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* KEYED BY PHOTOGRAPH, so the frame that was showing is the same DOM
          node once it becomes the one underneath: it is never remounted, so
          it cannot blink while the next fades in over it. The first frame is
          plain -- it is the LCP element and must be visible on first paint. */}
      {(under === null ? [shown] : [under, shown]).map((idx, n, all) => (
        <div key={`frame-${idx}`} className={all.length === 2 && n === 1 ? "hero-backdrop absolute inset-0" : "absolute inset-0"}>
          <NextImage
            src={HERO_IMAGES[idx]}
            alt=""
            fill
            sizes="100vw"
            priority={idx === 0}
            quality={70}
            className="object-cover"
          />
        </div>
      ))}
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

      {/* WIDER THAN IT WAS, and measured rather than picked. The two headline
          lines now share one size, and the longest rotating phrase -- "your
          competition's problem?" -- needs about 15.5x the font size in measure
          before it breaks. At a 5xl column that was 944px against the 1064px
          it wants, so the phrase took two lines on every desktop. The column
          is the thing that grew; the type did not shrink. It is the same
          1280px cap the header already uses. */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center px-6 pt-28 text-center md:pt-32 lg:px-10">
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
        {/* ONE SIZE FOR BOTH LINES. The rotating half used to be set nearly
            40% smaller than the fixed half so it could be promised a single
            line; they read as a caption under a headline rather than as one
            sentence. The size lives on the h1 now and both lines inherit it --
            the wrapping problem that the smaller size was solving is solved
            below instead, by reserving the box the longest phrase needs. */}
        <h1
          /* THE SIZE IS SET BY THE LONGEST PHRASE, NOT BY TASTE. Measured on
             the built page: at font size F, "your competition's problem?"
             takes 14.53F of measure and its wider half takes 9.55F, and the
             chevron and its gap take another 0.94F. So the rule is 10.49F <=
             the column, or the phrase needs a THIRD line and the reserved box
             below grows with it. 7.8vw clears that from 320px up; 4.3rem is
             where it stops, which is the largest size whose longest phrase
             still fits one line on a normal laptop.

             Re-measure before changing either number, and remember the
             tracking here is NOT what the class says: `.pv-hero
             [class*="tracking-"]` in preview.css overrides it to +0.02em on
             this page, which is worth about 4% of the width.

             7.4vw, NOT 7.8, AND THE CARET IS WHAT PAID FOR IT. The old number
             was measured against the phrase and the chevron alone, so the line
             it sized had no room left for the blinking bar at the end of it --
             which is a part of the line, and which therefore wrapped onto a
             line of its own at 320, 360, 390 and 430. Re-measured with the
             caret in: the whole line takes 11.22F of measure (0.94F chevron,
             9.88F for the longest phrase, 0.44F caret), and 320px is the width
             that binds, because the 24px gutters are fixed there while
             everything else scales. 11.22F <= 272px puts the ceiling at 7.57vw
             and this sits under it with 5px in hand for the webfont. */
          className="hero-rise--solid text-[clamp(1.5rem,7.4vw,4.3rem)] font-bold leading-[1.08] tracking-tight !text-white [text-shadow:0_4px_20px_rgba(0,0,0,0.5),0_1px_4px_rgba(0,0,0,0.35)]"
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
          {/* `text-balance` rather than `whitespace-nowrap`: at this size the
              line breaks on a phone, and left to itself it breaks with one
              word stranded on the second line. Balanced, it splits evenly. */}
          <span className="block text-balance">What if we made it</span>
          {/* A FLEX ROW, SO THE CHEVRON KEEPS ITS PLACE WHEN THE PHRASE WRAPS.

              At the shared size the longest phrase takes two lines on a phone.
              As inline text the chevron would sit against the first of them and
              the second would tuck under it; as a flex row the chevron is a
              column of its own, aligned to the first line, and the phrase keeps
              one edge however many lines it takes.

              `min-w-0` is what lets the phrase wrap at all: without it the
              reserved width of the longest phrase is a floor, and the row
              overflows the hero sideways instead of breaking. */}
          <span className="flex items-start justify-center">
          {/* `startFull` so the phrase is complete in the first render rather
              than typing itself in from empty; `reserveWidth` so neither the
              width nor the HEIGHT of this line changes as the set cycles --
              which is what keeps the buttons and the logo rail below from
              stepping up and down every time a phrase needs a second line.

              THE CHEVRON IS A `prefix`, NOT A SIBLING. `reserveWidth` holds the
              box of the LONGEST phrase and centres the live one inside it, so a
              chevron rendered beside that box stayed pinned to the box's edge
              while the words drifted to the middle -- it sat a couple of hundred
              pixels clear of the phrase it points at, and the gap resized on
              every cycle. Passed in, it shrink-wraps with the text and travels
              with it. It is measured into the reserved sizer too, so the line
              still does not reflow. */}
          <TextType
            text={ROTATING_WORDS}
            typingSpeed={70}
            deletingSpeed={40}
            pauseDuration={1700}
            showCursor
            startFull
            reserveWidth
            cursorCharacter="▎"
            /* See `.hero-caret` in globals.css: the block glyph carries half an
               em of empty advance behind the bar, and the line has no room to
               pay for it. */
            cursorClassName="hero-caret"
            className="min-w-0 font-heading"
            /* Decorative. Without aria-hidden a screen reader reads the h1 as
               "What if we made it greater than your best decision". */
            prefix={
              <span aria-hidden="true" className="text-secondary mr-[0.3em]">
                &gt;
              </span>
            }
          />
          </span>
        </h1>

        {/* WHAT WE DO, AND WHERE, in one line. The motto and the rotating
            question are the brand's voice; neither tells a first-time visitor
            what the studio makes. Smaller than the heading on purpose, so it
            is never the page's largest text and never an LCP candidate. */}
        <p
          className="hero-rise mx-auto mt-5 max-w-[34rem] text-balance text-sm font-medium leading-relaxed !text-white [text-shadow:0_1px_12px_rgba(0,0,0,0.55)] sm:text-base"
          style={{ animationDelay: "300ms" }}
        >
          Branding, websites, apps and SEO, designed and built by one team.
        </p>

        <div
          className="hero-rise mt-8 flex w-full flex-col items-stretch justify-center gap-4 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center"
          style={{ animationDelay: "400ms" }}
        >
          <Link
            href="#pv-contact"
            /* THE SITE'S PRIMARY BUTTON, and this is the one every other
               primary on the site is now measured against.

               THE TWO HERE ARE ONE PAIR, MIRRORED. This one is filled in the
               ground's strong tone with the weak tone as its label; "Explore
               our work" beside it is the same two colours the other way round.
               Each hovers into what the other one is, so the row always shows
               both halves and neither hover state can be mistaken for the
               button next to it.

               THE COLOURS COME FROM `.btn-primary`, not from utilities. They
               were `bg-white text-black` written out here, which is right on
               this hero and is also how a pair like this drifts: the header
               said the same thing in its own words, the 404 said something
               else entirely in orange and navy, and nothing connected them.
               The hero section sets `--btn-fill: #fff` on itself because it is
               a dark photograph in both themes -- see `.hero-cta` in
               globals.css -- and the class does the rest. */
            className="hero-cta group btn-primary inline-flex w-full items-center justify-center gap-2 rounded-full border px-7 py-3.5 sm:w-auto text-sm font-semibold shadow-[0_12px_34px_rgba(0,0,26,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-none active:translate-y-0"
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
            /* THE SITE'S SECONDARY BUTTON: the mirror of the one above, and
               solid rather than an outline. The navy hover it used to carry
               was the last #000065 fill on a button anywhere on the site. Its
               border is the primary's fill, which is what keeps a black pill
               visible against a dark photograph -- the one case where the fill
               alone would not carry an edge. */
            className="hero-cta btn-secondary inline-flex w-full items-center justify-center gap-2 rounded-full border px-7 py-3.5 sm:w-auto text-sm font-semibold shadow-[0_8px_26px_rgba(0,0,0,0.12)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
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
