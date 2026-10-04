"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { LogoGlyph } from "@/components/ui/logo-glyph";
import LogoLoop from "@/components/ui/logo-loop";
import { LOGOS } from "@/lib/logos";

/**
 * THE HOMEPAGE FILM, and the hero that frames it.
 *
 * The film is the studio's own 30-second showreel, cut in two shapes (16:9 and
 * 9:16) under `public/hero/film/`. It plays full-bleed behind the copy, and a
 * chapter bar names each part of it as it plays: on a desktop a glass strip
 * along the bottom, on a phone a row of story bars along the top with the two
 * sides of the film as previous/next. The chapters are the six services, so
 * the bar does the work a services paragraph would, without the paragraph.
 *
 * THE FILM HAS TYPE OF ITS OWN, which is the problem the layout is built
 * around. A cream frame with navy words sits behind white copy a third of the
 * time, so the copy is never left to the film's luck: the dark shade is
 * anchored to the COPY (`.hero-film__copy::before` in globals.css), not to a
 * percentage of the screen, so it is behind the headline at every height from
 * a 568px phone to a 1440px desktop. Re-measure there before lightening it.
 *
 * NOTHING OF THE FILM IS ON THE CRITICAL PATH.
 *  - The first paint is a poster: a still of the exact frame the film starts
 *    from (`FILM_START`), cut by `scripts/hero-film-posters.sh`. It is the
 *    page's LCP, a plain <img> with art direction, so the phone downloads a
 *    40KB portrait still and nothing else.
 *  - The video has no `src` in the HTML. It is chosen and attached after the
 *    page's `load`, when the browser is idle, so 4MB of film never competes
 *    with the page for bandwidth. It fades in over the poster once it is
 *    actually playing, so a slow connection keeps the still rather than
 *    showing a black box.
 *  - Reduced motion and Save-Data never load it at all. The poster stays, and
 *    the play control is there for anyone who wants the film anyway.
 *  - It pauses off screen and in a hidden tab, and resumes only if the
 *    visitor had not paused it themselves.
 */

/** Where each part of the film starts and ends, in seconds. Measured off the
    16:9 cut; the 9:16 cut is timed to it. Re-measure if the film changes. */
const CHAPTERS = [
  { name: "The studio", start: 0, end: 11 },
  { name: "Branding", start: 11, end: 13 },
  { name: "Search", start: 13, end: 15 },
  { name: "Web", start: 15, end: 17 },
  { name: "Apps", start: 17, end: 19 },
  { name: "Software & AI", start: 19, end: 21 },
  { name: "Social & ads", start: 21, end: 23 },
  { name: "The proof", start: 23, end: 30 },
];

const FILM_LENGTH = 30;

/** The first frame anybody sees: "Six vendors.", which the film turns into
    "Six briefs." and "Nothing lines up." while the headline answers it. Keep
    in step with `AT` in scripts/hero-film-posters.sh, or the poster and the
    film will not be the same picture. */
const FILM_START = 4.2;

const FILM = {
  wide: "/hero/film/wdc-film-16x9.mp4",
  tall: "/hero/film/wdc-film-9x16.mp4",
} as const;

/** Portrait screens take the 9:16 cut. A portrait tablet is closer to 9:16
    than to 16:9, so the line is the orientation, not a pixel width. */
const PORTRAIT = "(orientation: portrait)";

function chapterAt(t: number) {
  const i = CHAPTERS.findIndex((c) => t >= c.start && t < c.end);
  return i < 0 ? CHAPTERS.length - 1 : i;
}

function filled(t: number, c: (typeof CHAPTERS)[number]) {
  if (t >= c.end) return 100;
  if (t <= c.start) return 0;
  return Math.round(((t - c.start) / (c.end - c.start)) * 100);
}

const clock = (t: number) => `0:${String(Math.min(FILM_LENGTH, Math.floor(t))).padStart(2, "0")}`;

function useFilm(sectionRef: React.RefObject<HTMLElement | null>) {
  const videoRef = useRef<HTMLVideoElement>(null);
  /** Which cut is attached, or null before the film has been asked for. */
  const loaded = useRef<keyof typeof FILM | null>(null);
  /** Where to land once the attached cut can seek. */
  const pending = useRef<number | null>(FILM_START);
  /** The VISITOR's intent. Scrolling away pauses the film; only the visitor
      pausing it keeps it paused when they come back. */
  const wanted = useRef(true);
  const visible = useRef(true);

  const [t, setT] = useState(FILM_START);
  const [playing, setPlaying] = useState(false);
  const [shown, setShown] = useState(false);

  const play = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => setPlaying(false));
  }, []);

  /** Attach the right cut if it is not attached yet, then play. Swapping cuts
      (a phone turned sideways) keeps the place in the film. */
  const start = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const kind = window.matchMedia(PORTRAIT).matches ? "tall" : "wide";
    if (loaded.current !== kind) {
      if (loaded.current) pending.current = v.currentTime;
      loaded.current = kind;
      setShown(false);
      v.muted = true;
      v.preload = "auto";
      v.src = FILM[kind];
      return; // onLoadedMetadata seeks and plays
    }
    play();
  }, [play]);

  const seek = useCallback(
    (to: number) => {
      wanted.current = true;
      setT(to);
      const v = videoRef.current;
      if (v && loaded.current && v.readyState >= 1) {
        v.currentTime = to;
        play();
      } else {
        pending.current = to;
        start();
      }
    },
    [play, start],
  );

  const toggle = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) {
      wanted.current = false;
      v.pause();
    } else {
      wanted.current = true;
      start();
    }
  }, [playing, start]);

  const step = useCallback(
    (dir: 1 | -1) => {
      /* The video's own clock only once it has one. Before that (reduced
         motion, Save-Data, a browser that cannot play the file) it reads 0,
         and "next" would always land on the second chapter. */
      const v = videoRef.current;
      const now = v && loaded.current && v.readyState >= 1 ? v.currentTime : t;
      const i = chapterAt(now);
      if (dir === 1) {
        seek(CHAPTERS[(i + 1) % CHAPTERS.length].start);
      } else {
        /* Like a story: a tap a moment into a chapter restarts it, a second
           tap goes back one. */
        const into = now - CHAPTERS[i].start;
        seek(into > 1.2 || i === 0 ? CHAPTERS[i].start : CHAPTERS[i - 1].start);
      }
    },
    [seek, t],
  );

  useEffect(() => {
    const v = videoRef.current;
    const section = sectionRef.current;
    if (!v || !section) return;
    v.muted = true;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = Boolean(
      (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData,
    );
    if (reduce || saveData) wanted.current = false;

    /* The observer reports "visible" the moment it is attached, so on its own
       it would fetch the film during page load. Nothing starts it until the
       page has finished loading and gone idle. */
    let armed = false;
    let idle = 0;
    const begin = () => {
      armed = true;
      if (!wanted.current) return;
      const later = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
      if (later) idle = later(() => visible.current && start());
      else idle = window.setTimeout(() => visible.current && start(), 300);
    };
    if (document.readyState === "complete") begin();
    else window.addEventListener("load", begin, { once: true });

    const settle = () => {
      if (!loaded.current) return;
      if (visible.current && document.visibilityState === "visible" && wanted.current) play();
      else v.pause();
    };
    const io = new IntersectionObserver(([entry]) => {
      visible.current = entry.isIntersecting;
      if (armed && visible.current && wanted.current && !loaded.current) start();
      else settle();
    });
    io.observe(section);
    document.addEventListener("visibilitychange", settle);

    const orientation = window.matchMedia(PORTRAIT);
    const reshape = () => {
      if (loaded.current && wanted.current) start();
      else if (loaded.current) {
        pending.current = v.currentTime;
        loaded.current = null;
      }
    };
    orientation.addEventListener("change", reshape);

    return () => {
      window.removeEventListener("load", begin);
      const cancel = (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;
      if (cancel) cancel(idle);
      window.clearTimeout(idle);
      io.disconnect();
      document.removeEventListener("visibilitychange", settle);
      orientation.removeEventListener("change", reshape);
    };
  }, [play, sectionRef, start]);

  const videoProps = {
    ref: videoRef,
    muted: true,
    loop: true,
    playsInline: true,
    preload: "none" as const,
    onLoadedMetadata: () => {
      const v = videoRef.current;
      if (!v) return;
      if (pending.current !== null) {
        v.currentTime = pending.current;
        pending.current = null;
      }
      if (wanted.current && visible.current) play();
    },
    onPlaying: () => {
      setPlaying(true);
      setShown(true);
    },
    onPause: () => setPlaying(false),
    onTimeUpdate: () => {
      const now = videoRef.current?.currentTime ?? 0;
      /* About four times a second is all a 3px bar needs; the CSS
         transition on its width covers the frames in between. */
      setT((prev) => (Math.abs(now - prev) > 0.24 || chapterAt(now) !== chapterAt(prev) ? now : prev));
    },
  };

  return { t, playing, shown, seek, toggle, step, videoProps };
}

function PlayToggle({ playing, onToggle }: { playing: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={playing ? "Pause the film" : "Play the film"}
      className="hero-film__round"
    >
      {playing ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
          <path d="M9 5v14M15 5v14" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
        </svg>
      )}
    </button>
  );
}

/* THE TOOLS, UNDER THE HERO RATHER than in it. They sat along the bottom of
   the photograph, which was one more thing in a hero the owner wanted calmer;
   on the page's own ground they read as the first line of proof, directly
   above the figures. Same rail the intro hands its logos to. */
const MARQUEE_LOGOS = LOGOS.map((entry) => ({
  title: entry.name,
  ariaLabel: entry.name,
  node: (
    <span className="group flex shrink-0 items-center gap-2 text-muted transition-colors duration-300 hover:text-foreground">
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
    /* CLIPPED SIDEWAYS HERE, because the rail does not clip itself: its track
       is several copies wide, and the hero section that used to hold it was
       doing the clipping. Without this the page was 20,000px wide. */
    <div id="hero-marquee" className="mx-auto w-full max-w-[1280px] overflow-x-clip px-4 pt-10 md:px-6 md:pt-12 lg:px-10">
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
  const sectionRef = useRef<HTMLElement>(null);
  const film = useFilm(sectionRef);
  const now = chapterAt(film.t);

  return (
    <>
      <section
        ref={sectionRef}
        aria-labelledby="hero-title"
        className="hero-film relative isolate z-10 flex min-h-svh flex-col overflow-hidden rounded-b-[2.5rem] bg-[#050627] text-white md:rounded-b-[4rem] lg:rounded-b-[5.5rem]"
      >
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          {/* ART DIRECTION, so a plain <picture> rather than next/image: the
              phone and the desktop need different FRAMES, not different sizes
              of one. Both stills are already cut to size by the poster script
              (40-70KB), so the optimiser would have nothing left to do. */}
          <picture>
            <source media={PORTRAIT} srcSet="/hero/film/wdc-film-9x16-720.jpg" width={720} height={1280} />
            <img
              src="/hero/film/wdc-film-16x9-1280.jpg"
              srcSet="/hero/film/wdc-film-16x9-1280.jpg 1280w, /hero/film/wdc-film-16x9-1920.jpg 1920w"
              sizes="100vw"
              width={1920}
              height={1080}
              alt=""
              fetchPriority="high"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </picture>
          <video
            {...film.videoProps}
            tabIndex={-1}
            className={`hero-film__video absolute inset-0 h-full w-full object-cover${film.shown ? " is-shown" : ""}`}
          />
          <div className="hero-film__veil absolute inset-0" />
        </div>

        {/* The fixed header's height, so nothing below starts under it. */}
        <div className="h-16 shrink-0 md:h-[72px]" />

        {/* PHONE AND TABLET: story bars along the top, on their own strip of
            glass because white type straight over the film's cream frames
            measured under 4.5:1. */}
        <div className="relative z-10 mx-auto w-full max-w-[1280px] px-3 pt-1 md:px-6 lg:hidden">
          <div className="hero-film__glass rounded-2xl py-2 pl-3.5 pr-1.5">
            <div aria-hidden="true" className="flex gap-1 pr-2">
              {CHAPTERS.map((c) => (
                <span key={c.name} className="hero-film__bar flex-1">
                  <span style={{ width: `${filled(film.t, c)}%` }} />
                </span>
              ))}
            </div>
            <div className="mt-1 flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-[0.82rem] font-medium">
                <span className="font-heading font-semibold">{CHAPTERS[now].name}</span>
                <span className="text-white/80">{` · ${now + 1} of ${CHAPTERS.length}`}</span>
              </p>
              <PlayToggle playing={film.playing} onToggle={film.toggle} />
            </div>
          </div>
        </div>

        {/* The film's own space. On a phone its two sides are the story
            controls: the left third goes back, the rest goes forward. */}
        <div className="relative z-10 flex min-h-20 flex-1">
          <button type="button" onClick={() => film.step(-1)} aria-label="Previous chapter of the film" className="hero-film__tap flex basis-[38%] items-center justify-start pl-2 lg:hidden">
            <span className="hero-film__tap-hint" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6" /></svg>
            </span>
          </button>
          <button type="button" onClick={() => film.step(1)} aria-label="Next chapter of the film" className="hero-film__tap flex basis-[62%] items-center justify-end pr-2 lg:hidden">
            <span className="hero-film__tap-hint" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
            </span>
          </button>
        </div>

        <div className="hero-film__copy relative z-10">
          <div className="mx-auto w-full max-w-[1280px] px-5 pb-8 text-center md:px-6 md:pb-12 lg:px-10 lg:pb-[9.25rem] lg:text-left">
            {/* TWO BLOCKS, so the headline is two lines at every width and the
                first one -- text that never changes -- is the LCP candidate
                once the poster is. Transform-only entrance: it is visible
                from the first frame. */}
            <h1
              id="hero-title"
              className="hero-rise--solid font-heading text-[clamp(2.6rem,10.5vw,5.5rem)] font-semibold leading-[0.98] tracking-[-0.04em] text-white"
            >
              <span className="block">Six briefs.</span>
              <span className="block">One studio.</span>
            </h1>
            <p
              className="hero-rise mx-auto mt-4 max-w-[33rem] text-pretty text-[0.98rem] leading-relaxed text-[#e6e7f2] sm:text-lg lg:mx-0 lg:mt-6 lg:text-[1.19rem]"
              style={{ animationDelay: "120ms" }}
            >
              Branding, websites, apps, software, search and ads. Designed and built by one team, so nothing gets lost between agencies.
            </p>
            {/* THE PAIR. `.hero-cta` sets the dark ground's tokens because the
                film is dark in both themes; `.btn-primary`/`.btn-secondary`
                carry the colours and the hover swap. Geometry only here. */}
            <div
              className="hero-rise mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center lg:mt-9 lg:justify-start"
              style={{ animationDelay: "220ms" }}
            >
              <Link
                href="#pv-contact"
                className="hero-cta group btn-primary inline-flex min-h-[3.375rem] items-center justify-center gap-3.5 rounded-full border-[1.5px] py-1.5 pl-6 pr-1.5 text-base font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white"
              >
                Start a project
                <span className="hero-film__chip" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="h-[1.1rem] w-[1.1rem]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </Link>
              <Link
                href="#pv-work"
                className="hero-cta btn-secondary inline-flex min-h-[3.375rem] items-center justify-center rounded-full border-[1.5px] px-7 text-base font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white"
              >
                See our work
              </Link>
            </div>
          </div>
        </div>

        {/* DESKTOP: the chapter strip. Each chapter's width is its share of
            the film, with a floor so the shortest still holds its name. */}
        <div className="absolute inset-x-0 bottom-7 z-10 hidden lg:block">
          <div className="mx-auto max-w-[1280px] px-10">
            <div className="hero-film__glass flex h-[4.5rem] items-center gap-1.5 rounded-[1.375rem] pl-3 pr-2.5">
              <div role="group" aria-label="Chapters of the film" className="flex min-w-0 flex-1 gap-1">
                {CHAPTERS.map((c, i) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => film.seek(c.start)}
                    aria-label={`Play the film from ${c.name}`}
                    aria-current={i === now ? "step" : undefined}
                    className="hero-film__seg"
                    style={{ flexGrow: c.end - c.start }}
                  >
                    <span className="hero-film__seg-label">{c.name}</span>
                    <span className="hero-film__bar">
                      <span style={{ width: `${filled(film.t, c)}%` }} />
                    </span>
                  </button>
                ))}
              </div>
              {/* The clock is the first thing to go when room runs out: under
                  1280px the eight chapters need its 90px more than anyone
                  needs the seconds. */}
              <span aria-hidden="true" className="mx-1.5 hidden h-8 w-px shrink-0 bg-white/20 xl:block" />
              <p aria-hidden="true" className="hidden w-[4.75rem] shrink-0 text-center xl:block text-[0.8rem] font-medium tabular-nums text-white/85">
                {clock(film.t)} / {clock(FILM_LENGTH)}
              </p>
              <PlayToggle playing={film.playing} onToggle={film.toggle} />
            </div>
          </div>
        </div>
      </section>

      <LogoMarquee />
    </>
  );
}
