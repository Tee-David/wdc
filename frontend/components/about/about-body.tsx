"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { useReveal } from "@/components/preview/use-reveal";
import ServiceIcon from "@/components/ui/service-icon";
import ScrollCue from "@/components/ui/scroll-cue";
import { SERVICES } from "@/lib/services";
import ScrollExpand from "@/components/ui/scroll-expand";
import dynamic from "next/dynamic";
import { BRAND_KINDS } from "@/lib/showcase";
import { MOTTO } from "@/lib/site";

import "@/components/preview/preview.css";
import "@/components/services/services.css";
import "@/components/ui/motion-kit.css";
import "./about.css";
import StrokeNumber from "@/components/ui/stroke-number";
import Image from "next/image";

/* 156 KB of WebGL (`ogl`), for one decorative wheel most of the way down ONE
   page -- and it was not even /about paying for it. The homepage links to
   /about, so Next prefetches that route's JavaScript, and the whole of `ogl`
   came down on the homepage having never been executed there: it was the
   largest single entry in Lighthouse's "reduce unused JavaScript".

   `ssr: false` costs nothing here. The canvas is `aria-hidden` decoration and
   the same twelve pieces are ALREADY in the DOM below it as real <img>s -- the
   fallback a screen reader, a crawler and a browser without WebGL all get. So
   there is nothing to server-render and nothing to wait for. */
const CircularGallery = dynamic(() => import("@/components/ui/circular-gallery"), {
  ssr: false,
});

/**
 * /about — the studio behind the work.
 *
 * Built on the same tokens, sections and controls as the rest of the site
 * (`pv-sec`, `pv-wrap`, `pv-btn`, the reveal observer, ServiceIcon), so it
 * reads as another page of one site rather than a second site.
 *
 * Two rules this page keeps, because an About page is where sites usually
 * break them:
 *
 *  1. Every FIGURE is derived from the data, never typed in. The counters read
 *     SERVICES, PROJECTS and LOGOS at render, so they cannot drift away from
 *     what the site actually shows. A hardcoded "50+ projects" is a claim; a
 *     computed 7 is a fact about this codebase.
 *  2. No invented people. The team rail carries the DISCIPLINES in the room,
 *     not stock headshots with made-up names, until real names and photos
 *     exist to put in it.
 */

/* What the studio actually argues, in the same voice as the homepage. */
const BELIEFS = [
  { t: "One roof", d: "Design, build and growth sit in one team, so nothing is lost in the hand-off between the people who draw a thing and the people who build it.", i: "Layers" },
  { t: "Every budget", d: "We work at a premium standard that scales down without becoming a different standard.", i: "Scale" },
  { t: "Built to last", d: "Fast, accessible, maintainable code. Not a template with your logo dropped on it.", i: "Wrench" },
  { t: "You are included", d: "You see the work as it happens, instead of a reveal at the end that you cannot change.", i: "Eye" },
  { t: "Found, not just seen", d: "Search and content work that keeps paying after the site ships, including being found by the AI tools people now ask.", i: "Search" },
  { t: "Candid engineering", d: "AI and software built around a real outcome, and we say plainly when a model is not the answer.", i: "Cpu" },
];

/* The disciplines in the room. NOT people: no names, no stock headshots.
   Real team members drop straight in against this shape once there are names
   and photographs to use, and the rail below does not change. */
const TEAM = [
  { id: "brand", name: "Brand & design", role: "Identity, print, motion", i: "Palette", note: "Works out what a brand has to say before anything gets drawn." },
  { id: "eng", name: "Engineering", role: "Web, apps, platform", i: "Code", note: "Ships the thing, then keeps it fast and maintainable after launch." },
  { id: "growth", name: "Growth", role: "SEO, content, paid", i: "TrendingUp", note: "Makes the work findable, then keeps it earning after it goes live." },
  { id: "product", name: "Product", role: "Scope, research, QA", i: "Compass", note: "Turns a business problem into something a team can actually build." },
  { id: "social", name: "Social", role: "Calendars, community", i: "MessageCircle", note: "Runs the accounts day to day, not just the launch post." },
];

/* Twelve pieces of real artwork for the wheel, taken three at a time from each
   of the four kinds rather than twelve in a row from one. A dozen flyers turning
   past looks like one job repeated; a flyer, a logo, a mockup and a guide page
   in rotation looks like a studio. */
const WHEEL = BRAND_KINDS.flatMap((k) => k.items.slice(0, 3)).map((m) => ({
  image: m.src,
  text: m.title,
  id: m.id,
}));

/**
 * How far the pinned wheel section has travelled, 0 to 1.
 *
 * Kept in a REF and never in state: this updates on every scroll frame, and a
 * setState here would re-render the page sixty times a second to hand a number
 * to a canvas that is not part of React's tree anyway.
 */
function useScrollRun<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const run = useRef(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    /* Measured once per resize rather than once per frame: a rect read in a
       scroll callback forces the browser to flush layout before it can answer,
       and `rect.top` is only `docTop - scrollY` anyway. */
    let docTop = 0;
    let height = 0;
    const measure = () => {
      const r = el.getBoundingClientRect();
      docTop = r.top + window.scrollY;
      height = r.height;
    };

    const apply = () => {
      const top = docTop - window.scrollY;
      /* The travel available is the section's height MINUS one screen, because
         the last screenful is spent with the pin resting at the bottom. Using
         the full height would leave the wheel short of its last image by
         exactly one viewport. */
      const travel = height - (window.innerHeight || 1);
      run.current = travel <= 0 ? 0 : Math.min(1, Math.max(0, -top / travel));
      /* Published for the scroll cue, which is the only thing that can tell a
         reader this 300vh section has not ended. Same custom property the
         pinned rows write, so the cue does not care what is driving it. */
      el.style.setProperty("--pin-p", run.current.toFixed(4));
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    };
    measure();
    apply();
    /* Only a resize can move the section in the document, so that is the only
       time the cached offset needs taking again. */
    const onResize = () => { measure(); onScroll(); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);
  return { ref, run };
}

function TeamRail() {
  const rail = useRef<HTMLDivElement | null>(null);
  const [at, setAt] = useState({ start: true, end: false });

  /* Arrow state comes from the rail's own scroll position rather than an
     index, because the rail is also a native scroll container: dragging it or
     flicking it on a phone has to keep the arrows honest. */
  const sync = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    setAt({
      start: el.scrollLeft <= 2,
      end: el.scrollLeft >= el.scrollWidth - el.clientWidth - 2,
    });
  }, []);

  const nudge = (dir: 1 | -1) => {
    const el = rail.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(".ab-tm");
    const step = card ? card.offsetWidth + 18 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return (
    <>
      <div className="ab-team__head">
        <div>
          <span className="pv-eyebrow">The team</span>
          <h2 className="pv-mix"><b>The disciplines</b> in the room</h2>
        </div>
        <div className="ab-team__nav">
          <button
            type="button"
            className="ab-arrow"
            aria-label="Previous"
            disabled={at.start}
            onClick={() => nudge(-1)}
          >
            <Arrow dir="left" />
          </button>
          <button
            type="button"
            className="ab-arrow ab-arrow--on"
            aria-label="Next"
            disabled={at.end}
            onClick={() => nudge(1)}
          >
            <Arrow dir="right" />
          </button>
        </div>
      </div>
      {/* Focusable and labelled for the same reason as the code pane: the rail
          is a real scroll container, and arrow keys can only reach it if it can
          take focus. The buttons above drive the same scroll, so this is a
          second route to it rather than the only one. */}
      <div
        className="ab-team__rail"
        ref={rail}
        onScroll={sync}
        tabIndex={0}
        role="region"
        aria-label="Disciplines in the studio"
      >
        {TEAM.map((m, n) => (
          <article className="ab-tm" key={m.id} style={{ "--d": `${n * 70}ms` } as CSSProperties}>
            <span className="ab-tm__icon">
              <ServiceIcon name={m.i} size={20} />
            </span>
            <h3>{m.name}</h3>
            <p className="ab-tm__role">{m.role}</p>
            <p className="ab-tm__note">{m.note}</p>
          </article>
        ))}
      </div>
    </>
  );
}

function Arrow({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {dir === "left"
        ? <><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></>
        : <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>}
    </svg>
  );
}

export default function AboutBody() {
  useReveal();
  const { ref: wheelRef, run: wheelRun } = useScrollRun<HTMLDivElement>();

  return (
    <div className="pv ab">
      {/* ---------------- hero ---------------- */}
      <section className="pv-sec pv-sec--band ab-hero">
        {/* The same four floating badges the services hero carries, so the two
            openings read as one site rather than two designs. They replace a
            single hairline swirl that spanned the whole panel: at 18% opacity
            it was too faint to be a shape and too long to be a texture, and it
            said nothing about what we do. These say the four things we do. */}
        <div className="sv-orbit" aria-hidden="true">
          {SERVICES.slice(0, 4).map((s, i) => (
            <span className={`sv-bub sv-bub--${i + 1}`} key={s.slug}>
              <ServiceIcon name={s.icon} delay={300 + i * 220} />
            </span>
          ))}
        </div>
        <div className="pv-wrap">
          <div className="sv-hero__copy pv-reveal">
            <p className="sv-hero__loop">
              <span>We Dig Creativity Solutions</span>
            </p>
            <h1>{MOTTO}</h1>
            <p className="pv-lede">
              We are a creative and digital studio. We design the brand, build the
              product and run the growth that follows, with the same team on all
              three, so the work arrives as one thing rather than three handovers.
            </p>
            <div className="sv-hero__cta">
              <Link className="pv-btn pv-btn--accent" href="/#pv-contact">
                Book a strategy call
              </Link>
              <Link className="pv-btn pv-btn--light" href="/services">
                See what we do
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- the statement + real work ---------------- */}
      <section className="pv-sec">
        <div className="pv-wrap">
          <div className="ab-say pv-reveal">
            <h2>
              Most studios hand you a logo and leave. We stay for the part where
              it has to <em>work</em>.
            </h2>
            <p className="pv-lede">
              A brand that looks right but loads slowly, ranks nowhere and cannot be
              updated by the people who own it is not finished. So we take the whole
              path: what the brand says, how it is built, and what happens to it after
              launch.
            </p>
          </div>

        </div>
      </section>

      {/* ---------------- the wheel ---------------- */}
      {/* Tall on purpose: the extra height IS the control. The pin holds the
          wheel on screen while that height scrolls past, and the same travel
          turns it through all twelve pieces. */}
      <section className="ab-wheelsec" ref={wheelRef}>
        <div className="ab-wheelsec__pin">
          <ScrollExpand className="ab-wheelsec__zoom">
            <div className="ab-wheelsec__stage">
              <CircularGallery items={WHEEL} progress={wheelRun} perView={6} slots={24} />
              {/* The canvas is decorative to assistive tech, so the artwork
                  itself lives here as real images: this is what a screen
                  reader, a crawler and a browser without WebGL all get. */}
              <ul className="ab-wheelsec__flat">
                {WHEEL.map((m, n) => (
                  <li key={m.id} style={{ "--d": `${n * 40}ms` } as CSSProperties}>
                    <Image
                      src={m.image}
                      alt={m.text}
                      fill
                      /* The tile is a square in an auto-fill grid whose track
                         floor is clamp(96px, 14vw, 170px), so 170px is the
                         widest it ever draws. */
                      sizes="(max-width: 700px) 33vw, 170px"
                      quality={70}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </ScrollExpand>
          <p className="ab-cap">Work from the studio. More of it on the services page.</p>
          {/* This section is 300vh tall with the wheel pinned in the middle of
              it, so for three screens of scrolling nothing moves vertically and
              the page reads as having ended. It has not: the wheel is turning
              through twelve images and there are four sections below. The cue
              shows how far through the turn you are and fades out once you are
              past the halfway point and can see for yourself. */}
          <ScrollCue />
        </div>
      </section>

      {/* ---------------- beliefs ---------------- */}
      <section className="pv-sec">
        <div className="pv-wrap">
          <div className="pv-head pv-reveal">
            <span className="pv-eyebrow">How we think</span>
            <h2 className="pv-mix">Six things we will <b>not trade away</b></h2>
          </div>
          <ol className="sv-steps pv-reveal">
            {BELIEFS.map((b, n) => (
              <li className="sv-step" key={b.t}>
                <span className="sv-step__icon" style={{ "--bob": `${n * 260}ms` } as CSSProperties}>
                  <ServiceIcon name={b.i} delay={n * 90} />
                </span>
                <StrokeNumber className="sv-step__n" value={String(n + 1).padStart(2, "0")} delay={n * 160} />
                <h3>{b.t}</h3>
                <p>{b.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------- team ---------------- */}
      <section className="pv-sec pv-sec--alt ab-team">
        <div className="pv-wrap pv-reveal">
          <TeamRail />
        </div>
      </section>

      {/* ---------------- closing ---------------- */}
      <section className="pv-sec pv-sec--band ab-cta">
        <div className="pv-wrap">
          <div className="ab-cta__in pv-reveal">
            <h2 className="pv-mix">Tell us <b>what you are trying to get done.</b></h2>
            <p className="pv-lede">
              Not a brief, not a budget. The outcome. We will tell you what it
              actually takes, and say so if it is not us.
            </p>
            <div className="sv-hero__cta">
              <Link className="pv-btn pv-btn--accent" href="/#pv-contact">
                Book a strategy call
              </Link>
              <Link className="pv-btn pv-btn--light" href="/#pv-work">
                See the work
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
