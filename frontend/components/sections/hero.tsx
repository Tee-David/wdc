"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { LogoGlyph } from "@/components/ui/logo-glyph";
import LogoLoop from "@/components/ui/logo-loop";
import { LOGOS } from "@/lib/logos";

/**
 * THE HOMEPAGE FILM, and the hero that frames it.
 *
 * The film is the studio's own 30-second showreel, cut in two shapes (16:9 and
 * 9:16) under `public/hero/film/`. It plays full-bleed behind the copy, and a
 * chapter bar names each part of it as it plays: on a desktop a glass strip
 * along the bottom, on a phone a row of progress bars under the buttons, with
 * play/pause beside them. The chapters are the six services, so on a desktop
 * the strip does the work a services paragraph would, without the paragraph.
 *
 * THE FILM IS CUT FOR THIS LAYOUT. The 16:9 cut keeps its action in the right
 * half, the 9:16 cut in the top third, so the copy sits over dark navy in
 * both. It still carries white cards and type of its own, so the copy is
 * never left to the film's luck: the dark shade is anchored to the COPY
 * (`.hero-film__copy::before` in globals.css), not to a percentage of the
 * screen, so it is behind the headline at every height from a 568px phone to
 * a 1440px desktop. Re-measure there before lightening it.
 *
 * NOTHING OF THE FILM IS ON THE CRITICAL PATH.
 *  - The first paint is a poster: a still of the exact frame the film starts
 *    from (`FILM_START`), cut by `scripts/hero-film-posters.sh`. It is the
 *    page's LCP, a plain <img> with art direction, so the phone downloads a
 *    40KB portrait still and nothing else.
 *  - The video has no `src` in the HTML. It is chosen and attached after the
 *    page's `load`, when the browser is idle, so 3MB of film never competes
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

/** The first frame anybody sees: the cloud of separate vendors (hosting
    company, printer, SEO freelancer...) that the film then pulls into one
    mark, while the headline answers it. Keep in step with `AT` in
    scripts/hero-film-posters.sh, or the poster and the film will not be the
    same picture. */
const FILM_START = 4.2;

const FILM = {
  "wide-dark": "/hero/film/wdc-film-v3-16x9-dark.mp4",
  "wide-light": "/hero/film/wdc-film-v4-16x9-light.mp4",
  "tall-dark": "/hero/film/wdc-film-v3-9x16-dark.mp4",
  "tall-light": "/hero/film/wdc-film-v4-9x16-light.mp4",
} as const;

/** Four cuts: two shapes of screen, two themes. The light ones are a pale
    ground with navy marks, so the copy over them is navy (see `.hero-film` in
    globals.css). The theme is the `dark` class next-themes keeps on <html>. */
const isDark = () => document.documentElement.classList.contains("dark");

/** Portrait screens take the 9:16 cut. A portrait tablet is closer to 9:16
    than to 16:9, so the line is the orientation, not a pixel width. */
const PORTRAIT = "(orientation: portrait)";

/** Both themes' first frames are in the HTML and CSS shows the one that matches
    (`.hero-film__poster--*` in globals.css), so there is no flash of the wrong
    theme while the page hydrates. */
const POSTERS = [["dark", "v3"], ["light", "v4"]].map(([tone, v]) => ({
  tone,
  wide1280: `/hero/film/wdc-film-${v}-16x9-${tone}-1280.jpg`,
  wide1920: `/hero/film/wdc-film-${v}-16x9-${tone}-1920.jpg`,
  tall: `/hero/film/wdc-film-${v}-9x16-${tone}-720.jpg`,
}));

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

/** A visitor who asked for less motion (or less data) is not auto-played. Read
    as an external store so the server and the first client render agree (not
    calm), and only a real preference changes what the button shows. */
const REDUCE = "(prefers-reduced-motion: reduce)";
const subscribeCalm = (notify: () => void) => {
  const mq = window.matchMedia(REDUCE);
  mq.addEventListener("change", notify);
  return () => mq.removeEventListener("change", notify);
};
const getCalm = () =>
  window.matchMedia(REDUCE).matches ||
  Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);

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
  /* WHAT THE BUTTON SAYS. The film cannot start until it has been fetched, which
     takes a moment, and the button used to show "Play" for all of it: the hero
     looked paused on arrival. It now shows "Pause" from the first paint, because
     the film is on its way, and says "Play" only when it has a reason to: the
     visitor paused it, the browser refused to start it, or they asked for less
     motion or data. */
  const calm = useSyncExternalStore(subscribeCalm, getCalm, () => false);
  const [refused, setRefused] = useState(false);
  const [paused, setPaused] = useState(false);
  const playingUi = playing || (!calm && !refused && !paused);

  const play = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => {
      setPlaying(false);
      setRefused(true);
    });
  }, []);

  /** Attach the right cut if it is not attached yet, then play. Swapping cuts
      (a phone turned sideways) keeps the place in the film. */
  const start = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const kind = `${window.matchMedia(PORTRAIT).matches ? "tall" : "wide"}-${isDark() ? "dark" : "light"}` as const;
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
    if (playingUi) {
      wanted.current = false;
      setPaused(true);
      v.pause();
    } else {
      wanted.current = true;
      setPaused(false);
      setRefused(false);
      start();
    }
  }, [playingUi, start]);

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
    let fallback = 0;
    const begin = () => {
      armed = true;
      if (!wanted.current) return;
      const later = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
      if (later) idle = later(() => visible.current && start());
      else idle = window.setTimeout(() => visible.current && start(), 300);
    };
    /* NOT BEHIND A SLOW `load`. Waiting for the whole page meant the film began
       only after every image on it had finished, which on a phone connection is
       many seconds of a still hero. It starts at `load` or 2s after hydration,
       whichever is first; either way it is after the poster (the LCP) is on
       screen and the main thread is idle, so it is still off the critical path. */
    let began = false;
    const go = () => {
      if (began) return;
      began = true;
      begin();
    };
    if (document.readyState === "complete") go();
    else {
      window.addEventListener("load", go, { once: true });
      fallback = window.setTimeout(go, 2000);
    }

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

    /* A BROWSER MAY REFUSE THE FIRST play() with no one touching the page (iOS
       Low Power Mode does, whatever the markup says). The film is then a still
       with a play button, which reads as "it does not autoplay". The visitor's
       first tap, key press or click IS permission, so use it: if the film is
       wanted and not running, start it. A visitor who paused it has
       `wanted` false and is left alone; scrolling does not count as a gesture
       to a browser, so it is not listened for. */
    const nudge = () => {
      if (!wanted.current || !visible.current || document.visibilityState !== "visible") return;
      if (!loaded.current) start();
      else if (v.paused) play();
    };
    const gestures = ["pointerup", "touchend", "keydown"] as const;
    for (const g of gestures) window.addEventListener(g, nudge, { passive: true });

    const orientation = window.matchMedia(PORTRAIT);
    const reshape = () => {
      if (loaded.current && wanted.current) start();
      else if (loaded.current) {
        pending.current = v.currentTime;
        loaded.current = null;
      }
    };
    orientation.addEventListener("change", reshape);
    /* The theme switch swaps to the other cut, at the same place in the film. */
    const themeWatch = new MutationObserver(reshape);
    themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      window.removeEventListener("load", go);
      window.clearTimeout(fallback);
      const cancel = (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;
      if (cancel) cancel(idle);
      window.clearTimeout(idle);
      io.disconnect();
      document.removeEventListener("visibilitychange", settle);
      for (const g of gestures) window.removeEventListener(g, nudge);
      orientation.removeEventListener("change", reshape);
      themeWatch.disconnect();
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
      setRefused(false);
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

  return { t, playing: playingUi, shown, seek, toggle, videoProps };
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
        className="hero-film relative isolate z-10 flex min-h-svh flex-col overflow-hidden rounded-b-[2.5rem] md:rounded-b-[4rem] lg:rounded-b-[5.5rem]"
      >
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          {/* ART DIRECTION, so a plain <picture> rather than next/image: the
              phone and the desktop need different FRAMES, not different sizes
              of one. Both stills are already cut to size by the poster script
              (40-70KB), so the optimiser would have nothing left to do. */}
          {POSTERS.map(({ tone, wide1280, wide1920, tall }) => (
            <picture key={tone} className={`hero-film__poster hero-film__poster--${tone}`}>
              <source media={PORTRAIT} srcSet={tall} width={720} height={1280} />
              <img
                src={wide1280}
                srcSet={`${wide1280} 1280w, ${wide1920} 1920w`}
                sizes="100vw"
                width={1920}
                height={1080}
                alt=""
                /* The dark poster is the default theme's, so it is the LCP
                   candidate; the light one is fetched only when it is shown. */
                {...(tone === "dark" ? { fetchPriority: "high" as const } : { loading: "lazy" as const })}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </picture>
          ))}
          <video
            {...film.videoProps}
            tabIndex={-1}
            className={`hero-film__video absolute inset-0 h-full w-full object-cover ${film.shown ? "is-shown" : ""}`}
          />
          <div className="hero-film__veil absolute inset-0" />
        </div>

        {/* The fixed header's height, so nothing below starts under it. */}
        <div className="h-16 shrink-0 md:h-[72px]" />

        {/* The film's own space: nothing over it on a phone, so the top of
            the screen is all film. */}
        <div className="min-h-20 flex-1" />

        <div className="hero-film__copy relative z-10">
          <div className="mx-auto w-full max-w-[1280px] px-5 pb-6 text-center md:px-6 md:pb-10 lg:px-10 lg:pb-[9.25rem] lg:text-left">
            {/* ONE LINE ON A PHONE, TWO FROM A TABLET UP. Two spans: blocks
                from `md`, inline under it, where `.hero-film__title` sizes
                the whole line to the screen's width so it never wraps (see
                globals.css). The text never changes, so it is the LCP
                candidate once the poster is. Transform-only entrance: it is
                visible from the first frame. */}
            <h1
              id="hero-title"
              className="hero-film__title hero-rise--solid font-heading text-[clamp(2.6rem,10.5vw,5.5rem)] font-semibold leading-[0.98] tracking-[-0.04em]"
            >
              <span className="md:block">We do it all.</span>{" "}
              <span className="md:block">Yes, really.</span>
            </h1>
            <p
              className="hero-film__lede hero-rise mx-auto mt-4 max-w-[33rem] text-pretty text-[0.98rem] leading-relaxed sm:text-lg lg:mx-0 lg:mt-6 lg:text-[1.19rem]"
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
                href="/start"
                className="hero-cta group btn-primary inline-flex min-h-[3.375rem] items-center justify-center gap-3 rounded-full border-[1.5px] py-1.5 pl-6 pr-[0.6875rem] text-base font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[color:var(--hf-ink)]"
              >
                Start a Project
                <span className="hero-film__chip" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </Link>
              <Link
                href="#pv-work"
                className="hero-cta btn-secondary inline-flex min-h-[3.375rem] items-center justify-center rounded-full border-[1.5px] px-7 text-base font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[color:var(--hf-ink)]"
              >
                See Our Work
              </Link>
            </div>
            {/* PHONE AND TABLET: the film's progress under the pair, bars only,
                with play/pause at the end. No chapter names: on a phone the
                bars already say "this is playing, and this far in", and a label
                would be one more line between the buttons and the fold. The
                bars are not buttons -- eight across a phone is too narrow to
                tap -- so the toggle is the row's only control. */}
            <div className="mt-5 flex items-center gap-3 md:mt-6 lg:hidden">
              <div aria-hidden="true" className="flex min-w-0 flex-1 gap-1">
                {CHAPTERS.map((c) => (
                  <span key={c.name} className="hero-film__bar flex-1">
                    <span style={{ width: `${filled(film.t, c)}%` }} />
                  </span>
                ))}
              </div>
              <PlayToggle playing={film.playing} onToggle={film.toggle} />
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
              <span aria-hidden="true" className="hero-film__rule mx-1.5 hidden h-8 w-px shrink-0 xl:block" />
              <p aria-hidden="true" className="hero-film__clock hidden w-[4.75rem] shrink-0 text-center xl:block text-[0.8rem] font-medium tabular-nums">
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
