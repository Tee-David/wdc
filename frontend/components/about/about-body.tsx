"use client";

import { useCallback, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { useReveal } from "@/components/preview/use-reveal";
import { useCountUp, useNearViewport } from "@/components/services/stages/stage-shell";
import ServiceIcon from "@/components/ui/service-icon";
import ScrollExpand from "@/components/ui/scroll-expand";
import { SERVICES } from "@/lib/services";
import { PROJECTS } from "@/lib/projects";
import { LOGOS } from "@/lib/logos";
import { BRAND_KINDS } from "@/lib/showcase";
import { MOTTO } from "@/lib/site";

import "@/components/preview/preview.css";
import "@/components/services/services.css";
import "@/components/ui/motion-kit.css";
import "./about.css";

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

/* Counters, derived. `to` is a function of the real data so these numbers can
   never disagree with the pages they describe. */
const FIGURES = [
  { id: "services", to: SERVICES.length, label: "Services", hint: "design, build and growth" },
  { id: "projects", to: PROJECTS.length, label: "Live projects", hint: "every one of them open to visit" },
  { id: "tools", to: LOGOS.length, label: "Tools in the stack", hint: "chosen per job, not per habit" },
];

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

/* Real artwork, straight from the branding library. */
const MONTAGE = BRAND_KINDS[0].items.slice(0, 3);

function Figure({ f }: { f: (typeof FIGURES)[number] }) {
  const { ref, near } = useNearViewport<HTMLDivElement>("120px");
  const n = useCountUp(f.to, near);
  return (
    <div className="ab-fig" ref={ref}>
      <span className="ab-fig__n">{Math.round(n)}</span>
      <span className="ab-fig__l">{f.label}</span>
      <span className="ab-fig__h">{f.hint}</span>
    </div>
  );
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
          <h2>The disciplines in the room</h2>
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
      <div className="ab-team__rail" ref={rail} onScroll={sync}>
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

  return (
    <div className="pv ab">
      {/* ---------------- hero ---------------- */}
      <section className="pv-sec pv-sec--band ab-hero">
        {/* The reference's line art, redrawn in our own hand: one continuous
            stroke that draws itself in. Decorative, so it is hidden from
            assistive tech and skipped entirely under reduced motion. */}
        <svg className="ab-swirl" viewBox="0 0 1200 400" aria-hidden="true" preserveAspectRatio="none">
          <path
            className="ab-swirl__p"
            d="M-40 300 C 180 300 150 90 320 90 S 470 300 620 300 S 800 60 950 120 S 1120 320 1260 240"
            fill="none"
          />
        </svg>
        <div className="pv-wrap">
          <nav className="sv-crumb pv-reveal" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">About</span>
          </nav>
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

          {/* real pieces from the library, not stock */}
          <ScrollExpand>
            <div className="ab-montage pv-reveal">
              {MONTAGE.map((m, n) => (
                <figure className="ab-montage__i" key={m.id} style={{ "--d": `${n * 90}ms` } as CSSProperties}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.src} alt={m.title} loading="lazy" />
                </figure>
              ))}
            </div>
          </ScrollExpand>
          <p className="ab-cap">Work from the studio. More of it on the services page.</p>
        </div>
      </section>

      {/* ---------------- figures ---------------- */}
      <section className="pv-sec pv-sec--alt">
        <div className="pv-wrap">
          <div className="ab-figs pv-reveal">
            {FIGURES.map((f) => <Figure key={f.id} f={f} />)}
          </div>
        </div>
      </section>

      {/* ---------------- beliefs ---------------- */}
      <section className="pv-sec">
        <div className="pv-wrap">
          <div className="pv-head pv-head--left pv-reveal">
            <span className="pv-eyebrow">How we think</span>
            <h2>Six things we will not trade away</h2>
          </div>
          <ol className="sv-steps pv-reveal">
            {BELIEFS.map((b, n) => (
              <li className="sv-step" key={b.t}>
                <span className="sv-step__icon" style={{ "--bob": `${n * 260}ms` } as CSSProperties}>
                  <ServiceIcon name={b.i} delay={n * 90} />
                </span>
                <span className="sv-step__n">{String(n + 1).padStart(2, "0")}</span>
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
            <h2>Tell us what you are trying to get done.</h2>
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
