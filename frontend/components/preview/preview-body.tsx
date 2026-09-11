"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { PROJECTS, type Project } from "@/lib/projects";
import SiteModal from "./site-modal";
import { FAQS } from "@/lib/faq";
import FaqAccordion from "@/components/ui/faq-accordion";
import { CONTACT_EMAIL } from "@/lib/site";

import "./preview.css";
import StrokeNumber from "@/components/ui/stroke-number";
import ScrollCue from "@/components/ui/scroll-cue";

/* Copy is WDC's own, taken from the existing homepage, the PRD and llms.txt. */

/* `slug` matches lib/services.ts, so a card links to its own section on the
   services page rather than dumping every service into the contact form. */
const SERVICES = [
  {
    slug: "branding",
    title: "Branding & Design",
    body: "Identity systems, logos, motion, and visuals that make brands unmistakable across every surface.",
    /* Moore Designs, not the Marfaa guideline page. That page is a spread of
       body copy and small mono marks: at card size it cropped into the middle
       of a sentence and the reader saw a paragraph, not a brand. This is a
       centred lockup on its own ground, so it survives any crop the card
       gives it and reads as identity work at a glance. */
    img: "/brand-work/moore-cover.jpg",
  },
  {
    slug: "seo",
    title: "SEO",
    body: "Get found; technical, on-page, and content SEO that ranks, earns clicks, and converts.",
    img: "/work/litchconsulting.jpg",
  },
  {
    slug: "web",
    title: "Full-Stack Web Development",
    body: "Fast, accessible, scalable websites and web apps engineered to perform and last.",
    img: "/work/traxstaff.jpg",
  },
  {
    slug: "apps",
    title: "Cross-Platform App Development",
    body: "One codebase, every device; native-quality mobile experiences on iOS and Android.",
    img: "/work/app/trax-app-phone.jpg",
  },
  {
    slug: "software",
    title: "Software Engineering & AI",
    body: "Custom software and AI integrations engineered around real business outcomes.",
    img: "/work/app/trax-app-desktop.jpg",
  },
  {
    slug: "social",
    title: "Social Media & PPC",
    body: "Turn attention into growth with paid ads and social content that actually moves.",
    img: "/brand-work/bamssa-social-night.jpg",
  },
];

const STEPS = [
  { t: "Discovery", d: "We start with the outcome you want, not a feature list." },
  { t: "Strategy", d: "We map what the work has to achieve and agree the scope." },
  { t: "Design", d: "Identity and interface built around your customer, not a template." },
  { t: "Build", d: "Engineered to be fast, accessible and maintainable." },
  { t: "Launch", d: "Shipped properly, with you included at every step." },
  { t: "Grow", d: "SEO, content and campaigns that compound after launch." },
];

const WHY = [
  { t: "One roof", d: "Design, build and growth in one team, so nothing is lost in the hand-off.", label: "See our work", href: "#pv-work" },
  { t: "Every budget", d: "We work with hundreds of accounts, at a premium standard that scales.", label: "How we work", href: "#pv-process" },
  { t: "Built to last", d: "Fast, accessible, maintainable code, not a template with your logo on it.", label: "Our services", href: "/services" },
  { t: "You are included", d: "You see the work as it happens instead of a reveal at the end.", label: "How we work", href: "#pv-process" },
  { t: "Found, not just seen", d: "Search and content work that keeps paying after the site ships.", label: "Our services", href: "/services#seo" },
  { t: "Real engineering", d: "AI and software built around outcomes, and we say when it is not needed.", label: "Talk to us", href: "#pv-contact" },
];

/* Placeholder quotes, kept for layout and clearly marked. */
const QUOTES = [
  { q: "WDC rebuilt our brand and site from scratch; within two months we were ranking for terms we'd chased for years.", n: "Amara Okonkwo", r: "Founder, Lumen Studios" },
  { q: "The cross-platform app they shipped feels native on every device. Clean code, on time, and they actually explained the trade-offs.", n: "Daniel Reyes", r: "CTO, Fielded" },
  { q: "Our organic traffic doubled in a quarter. WDC's SEO work is the real thing; technical depth plus content that converts.", n: "Priya Nair", r: "Head of Growth, Northbeam" },
  { q: "Branding, design, and dev under one roof meant no hand-off gaps. The final product looked exactly like the vision.", n: "Marcus Bell", r: "CEO, Cadence Labs" },
  { q: "They wired AI into our support flow and cut response times in half. Genuinely thoughtful engineering, not hype.", n: "Sofia Almeida", r: "COO, Brightloop" },
  { q: "Every detail was considered; animations, accessibility, performance. Our Lighthouse scores have never been greener.", n: "Tobi Adeyemi", r: "Product Lead, Kite" },
];

const initials = (name: string) =>
  name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

function Icon({ i }: { i: number }) {
  const paths = [
    "M3 3v18h18M7 14l4-4 3 3 5-6",
    "M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM21 21l-4.3-4.3",
    "M16 18l6-6-6-6M8 6l-6 6 6 6",
    "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 19h2",
    "M12 2a5 5 0 0 1 5 5v3a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5zM5 21h14",
    "M4 4h16v12H5.2L4 18.4V4zM8 9h8M8 13h5",
  ];
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[i % paths.length]} />
    </svg>
  );
}

export default function PreviewBody() {
  const [active, setActive] = useState(0);
  const track = useRef<HTMLDivElement | null>(null);
  const pinWrap = useRef<HTMLDivElement | null>(null);
  const pinTrack = useRef<HTMLDivElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  /* Motion is opt-in: the flag goes on only when this runs and reduced-motion
     is off, so content is never hidden by CSS alone. A blanket timeout makes
     sure a failed observer can't leave the page blank. */
  useEffect(() => {
    const root = document.querySelector(".pv");
    if (!root) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) return;
    root.classList.add("pv-motion");
    const targets = Array.from(root.querySelectorAll(".pv-reveal"));
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      }),
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );
    targets.forEach((t) => io.observe(t));
    const safety = window.setTimeout(
      () => targets.forEach((t) => t.classList.add("is-in")), 1400);
    return () => { io.disconnect(); window.clearTimeout(safety); };
  }, []);

  /* Phones: the services run pins and scrolls sideways as you scroll down --
     the same move as the getyoursite landing page. The wrapper is given the
     stage's height plus the track's horizontal overflow, so the sticky stage
     has exactly that much vertical scroll to translate the track across. If
     the track already fits, or motion is reduced, we leave the plain CSS snap
     track alone rather than pinning a section with nothing to reveal. */
  useEffect(() => {
    const wrap = pinWrap.current;
    const trk = pinTrack.current;
    const stage = wrap?.querySelector<HTMLElement>(".pv-pinstage");
    if (!wrap || !trk || !stage) return;

    const mq = window.matchMedia("(max-width: 768px)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let on = false;
    let extra = 0;
    let frame = 0;
    let stick = 0;

    /* True while a finger is on the rail. The page keeps scrolling underneath
       during a swipe, so without this the pin would fight the drag and win.
       `dragFrom` is where the rail sat when the finger landed: a tap or a
       VERTICAL swipe that happens to start on a card leaves it unchanged, and
       reconciling those was what yanked the page mid-gesture. */
    let dragging = false;
    let dragFrom = 0;
    let settle = 0;

    const release = () => {
      on = false;
      dragging = false;
      window.clearTimeout(settle);
      wrap.classList.remove("is-pinned");
      wrap.style.removeProperty("--pv-pin-h");
      wrap.style.removeProperty("--pin-p");
      trk.style.transform = "";
    };
    const progress = () => {
      // The stage is stuck while the wrapper's top runs from `stick` down to
      // `stick - span`, so progress is measured against that window. Measuring
      // from a raw rect.top instead would finish the run `stick` pixels late,
      // sliding the cards up under the fixed header before releasing.
      const span = wrap.offsetHeight - stage.clientHeight;
      if (span <= 0) return { p: 0, span: 0 };
      const p = Math.min(1, Math.max(0, (stick - wrap.getBoundingClientRect().top) / span));
      return { p, span };
    };
    const update = () => {
      if (!on || dragging) return;
      // scrollLeft, not a transform: the rail stays a real scroll container, so
      // the same position can be reached by scrolling the page OR by swiping.
      stage.scrollLeft = progress().p * extra;
    };
    /* After a swipe, move the PAGE to the position that produces the rail
       offset the finger left it at. Without this the next vertical scroll
       yanks the cards back to wherever the page happened to be, which is the
       jump that makes hybrid controls feel broken.

       Two things this must NOT do. It must not fire when the rail never
       moved -- a tap on a card, or a vertical swipe that began on one, would
       otherwise re-drive the page from a rail offset it never changed. And it
       must not use a native window.scrollTo while Lenis is running: Lenis
       owns the scroll position, so a native jump moves the document while
       Lenis's own target stays put, and the next frame drags it back. That
       tug of war is the hang. */
    const applyScroll = (top: number) => {
      const lenis = window.__lenis;
      if (lenis) lenis.scrollTo(top, { immediate: true, force: true });
      else window.scrollTo({ top });
    };
    const reconcile = () => {
      if (!dragging) return;
      window.clearTimeout(settle);
      /* `dragging` stays TRUE across this timeout. Momentum keeps the rail
         gliding for a moment after the finger lifts, and update() is what
         writes scrollLeft from the page position -- clearing the flag here
         would let a single scroll frame overwrite the swipe before the line
         below has read where it landed. */
      settle = window.setTimeout(() => {
        dragging = false;
        if (!on || extra <= 0) return;
        if (Math.abs(stage.scrollLeft - dragFrom) < 2) return;
        const { span } = progress();
        if (span <= 0) return;
        const p = Math.min(1, Math.max(0, stage.scrollLeft / extra));
        const wrapTop = wrap.getBoundingClientRect().top + window.scrollY;
        applyScroll(wrapTop - stick + p * span);
      }, 180);
    };
    const measure = () => {
      release();
      if (!mq.matches || reduce) return;
      wrap.classList.add("is-pinned");
      stick = parseFloat(getComputedStyle(stage).top) || 0;
      // measured on the stage, which is the scroll container now
      extra = stage.scrollWidth - stage.clientWidth;
      if (extra <= 0) { release(); return; }
      wrap.style.setProperty("--pv-pin-h", `${stage.clientHeight + extra}px`);
      on = true;
      update();
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    /* One source of truth for the cue. The rail reaches a position two ways --
       the page scrolling drives scrollLeft through update(), and a finger sets
       it directly -- and both end in a scroll event here, so reading it here
       keeps the cue honest during a swipe as well. */
    const publish = () => {
      if (!on || extra <= 0) return;
      const p = Math.min(1, Math.max(0, stage.scrollLeft / extra));
      wrap.style.setProperty("--pin-p", p.toFixed(4));
    };

    const onDown = () => {
      if (!on) return;
      window.clearTimeout(settle);
      dragging = true;
      dragFrom = stage.scrollLeft;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    mq.addEventListener("change", measure);
    stage.addEventListener("scroll", publish, { passive: true });
    stage.addEventListener("pointerdown", onDown, { passive: true });
    stage.addEventListener("touchstart", onDown, { passive: true });
    window.addEventListener("pointerup", reconcile, { passive: true });
    window.addEventListener("pointercancel", reconcile, { passive: true });
    window.addEventListener("touchend", reconcile, { passive: true });
    // let the section's images and the reveal transition settle first
    const t = window.setTimeout(measure, 350);

    return () => {
      window.clearTimeout(t);
      cancelAnimationFrame(frame);
      stage.removeEventListener("scroll", publish);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      mq.removeEventListener("change", measure);
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("touchstart", onDown);
      window.removeEventListener("pointerup", reconcile);
      window.removeEventListener("pointercancel", reconcile);
      window.removeEventListener("touchend", reconcile);
      release();
    };
  }, []);

  const sync = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setAtStart(el.scrollLeft < 8);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
  }, []);

  useEffect(() => { sync(); }, [sync]);

  const step = (dir: number) => {
    const el = track.current;
    if (!el) return;
    const first = el.children[0] as HTMLElement | undefined;
    const gap = parseFloat(getComputedStyle(el).gap || "24");
    const by = first ? first.getBoundingClientRect().width + gap : 320;
    el.scrollBy({ left: dir * by, behavior: "smooth" });
  };

  /* Which project is previewing, and the card that opened it — focus goes back
     there on close, or a keyboard visitor is dumped at the top of the page. */
  const [preview, setPreview] = useState<Project | null>(null);
  const opener = useRef<HTMLAnchorElement | null>(null);

  return (
    <div className="pv">
      {/* ---------------- work ---------------- */}
      <section className="pv-sec" id="pv-work">
        <div className="pv-wrap">
          <div className="pv-bar pv-reveal">
            <div className="pv-head">
              <span className="pv-eyebrow">Selected work</span>
              <h2 className="pv-mix"><b>Brands that get noticed,</b> get found <b>and get results</b></h2>
              <p className="pv-lede">Every project below is live. Open any of them and see for yourself.</p>
            </div>
            <div className="pv-nav">
              <button className="pv-rbtn pv-rbtn--prev" onClick={() => step(-1)}
                      disabled={atStart} aria-label="Previous project" />
              <button className="pv-rbtn" onClick={() => step(1)}
                      disabled={atEnd} aria-label="Next project" />
            </div>
          </div>
          <div className="pv-track pv-reveal" ref={track} onScroll={sync}>
            {PROJECTS.map((p) => (
              /* Still a real link: crawlable, and middle-click or ctrl-click
                 opens the site the way a link should. The click handler only
                 takes over the PLAIN click, which is the one we want to keep
                 on this page. */
              <a
                className="pv-job"
                key={p.url}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                  e.preventDefault();
                  opener.current = e.currentTarget;
                  setPreview(p);
                }}
              >
                <div className="pv-shot">
                  {p.cover ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={p.cover} alt={`${p.name} website`} loading="lazy" />
                  ) : (
                    /* no capture yet: a branded panel, not a broken image */
                    <span className="pv-shot__none" aria-hidden="true">{p.name}</span>
                  )}
                </div>
                <div className="pv-job__body">
                  <div className="pv-job__row">
                    <b>{p.name}</b>
                    <span className="pv-badge" aria-hidden="true" />
                  </div>
                  <p className="pv-job__desc">{p.sector}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- how we work ---------------- */}
      <section className="pv-sec pv-sec--band" id="pv-process">
        <div className="pv-wrap">
          <div className="pv-head pv-reveal">
            <span className="pv-eyebrow">How we work</span>
            <h2 className="pv-mix"><b>A clear line</b> from the first call <b>to what ships</b></h2>
            <p className="pv-lede">You are included at every step, rather than shown a finished thing at the end.</p>
          </div>
          <div className="pv-steps pv-reveal">
            {STEPS.map((s, i) => (
              <div className="pv-step" key={s.t} style={{ "--si": i } as CSSProperties}>
                {/* drawn as a stroke rather than set as text: a glyph is a
                    filled outline and cannot be animated like a pen. */}
                <StrokeNumber
                  className="pv-step__n"
                  value={String(i + 1).padStart(2, "0")}
                  delay={i * 160}
                />
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- services ---------------- */}
      <section className="pv-sec" id="pv-services">
        <div className="pv-wrap">
          <div className="pv-head pv-head--left pv-reveal">
            <span className="pv-eyebrow">Services</span>
            <h2 className="pv-mix"><b>Everything a brand needs</b> to show up <b>and be taken seriously</b></h2>
            <p className="pv-lede">
              From brand identity and websites to cross-platform apps, SEO, and AI-powered
              software; we design and engineer the entire experience, so every touchpoint
              pulls in the same direction.
            </p>
          </div>
          <div className="pv-pinwrap pv-reveal" ref={pinWrap}>
            {/* OUTSIDE the stage, and first. The stage here is `display: flex`
                and is the horizontal scroller, so a child of it becomes a
                column beside the cards rather than a line under them — which
                is exactly what happened: the cue laid out full-height to the
                right of the track and was never on screen. As a sticky child
                of the WRAPPER it holds near the bottom of the viewport for the
                whole run instead, over the cards rather than in the row. */}
            <div className="pv-pincue"><ScrollCue /></div>
            <div className="pv-pinstage">
              <div className="pv-srows pv-pintrack" ref={pinTrack}>
            {[0, 1].map((row) => (
              <div className="pv-srow" key={row}>
                {SERVICES.slice(row * 3, row * 3 + 3).map((s, i) => {
                  const idx = row * 3 + i;
                  return (
                    <a
                      className={`pv-scard${active === idx ? " is-on" : ""}`}
                      key={s.title}
                      href={`/services#${s.slug}`}
                      onMouseEnter={() => setActive(idx)}
                      onFocus={() => setActive(idx)}
                    >
                      <div className="pv-scard__media">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={s.img} alt="" loading="lazy" />
                      </div>
                      <StrokeNumber className="pv-scard__n" value={String(idx + 1).padStart(2, "0")} delay={idx * 160} />
                      <div className="pv-scard__ic"><Icon i={idx} /></div>
                      <div className="pv-scard__body">
                        <h3>{s.title}</h3>
                        <p>{s.body}</p>
                        <span className="pv-more">Learn more</span>
                      </div>
                    </a>
                  );
                })}
                </div>
              ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- why WDC ---------------- */}
      <section className="pv-sec pv-sec--band">
        <div className="pv-wrap">
          <div className="pv-head pv-reveal">
            <span className="pv-eyebrow">Why WDC</span>
            <h2 className="pv-mix"><b>The creative engine</b> behind brands <b>that get results</b></h2>
          </div>
          <div className="pv-icards pv-reveal">
            {WHY.map((w) => (
              <a className="pv-icard" key={w.t} href={w.href}>
                <h3>{w.t}</h3>
                <p>{w.d}</p>
                <div className="pv-icard__foot">
                  <span className="pv-icard__link">{w.label}</span>
                  <span className="pv-icard__btn" aria-hidden="true" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- CTA banner ---------------- */}
      <section className="pv-sec">
        <div className="pv-wrap">
          <div className="pv-cta pv-reveal">
            <span className="pv-eyebrow">Let&rsquo;s talk</span>
            <h2>Tell us what is not working yet.</h2>
            <p>
              Bring the part of your brand that is stuck. We will tell you straight whether
              design, search or engineering fixes it, and what we would do first.
            </p>
            <a className="pv-btn pv-btn--accent" href="#pv-contact">Book a Strategy Call</a>
          </div>
        </div>
      </section>

      {/* ---------------- testimonials ---------------- */}
      <section className="pv-sec pv-sec--alt">
        <div className="pv-wrap">
          <div className="pv-head pv-reveal">
            <span className="pv-eyebrow">Testimonials</span>
            <h2 className="pv-mix"><b>Trusted by brands</b> that dig deeper</h2>
            <p className="pv-lede">
              Founders and teams who care about speed, clarity and results.
            </p>
          </div>
        </div>
        {[false, true].map((rev) => (
          <div className={`pv-marq pv-reveal${rev ? " pv-marq--rev" : ""}`} key={String(rev)}
               aria-hidden={rev || undefined}>
            <div className="pv-mtrack">
              {[0, 1].map((dup) => (
                <div className="pv-mgroup" key={dup} aria-hidden={dup === 1 || undefined}>
                  {QUOTES.map((t) => (
                    <blockquote className="pv-tcard" key={`${dup}-${t.n}`}>
                      <span className="pv-qm">&ldquo;</span>
                      <p>{t.q}</p>
                      <div className="pv-tcard__by">
                        <span className="pv-tcard__av">{initials(t.n)}</span>
                        <span><b>{t.n}</b><span>{t.r}</span></span>
                      </div>
                    </blockquote>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section className="pv-sec">
        <div className="pv-wrap">
          <div className="pv-faq">
            <div className="pv-faq__aside pv-reveal">
              <div className="pv-faq__mark">?</div>
              <h3>Questions people ask before they start.</h3>
              <p>If yours is not here, send it over and we will answer it straight.</p>
              <a className="pv-btn pv-btn--accent" href="#pv-contact">Ask a question</a>
            </div>
            {/* Extracted, because /contact needs the same list and a second
                copy of an accordion is a second set of bugs. The animation
                lives in there too: `<details>` cannot be transitioned, so both
                lists used to snap. */}
            <div className="pv-qa pv-reveal">
              <FaqAccordion items={FAQS} idPrefix="pvfaq" />
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- contact ---------------- */}
      <section className="pv-sec pv-sec--band" id="pv-contact">
        <div className="pv-wrap">
          <div className="pv-head pv-reveal">
            <span className="pv-eyebrow">Reach us</span>
            <h2>Let&rsquo;s talk about your brand.</h2>
          </div>
          <div className="pv-reach pv-reveal">
            <div className="pv-reach__info">
              <p className="pv-lede">
                Tell us what you are trying to achieve and we will come back the same
                working day.
              </p>
              <div style={{ marginTop: 24 }}>
                <div className="pv-cline">
                  <small>Email</small>
                  <b><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></b>
                </div>
                <div className="pv-cline">
                  <small>Working with</small>
                  <b>Brands worldwide</b>
                </div>
              </div>
              <ul className="pv-cwork">
                <li>Branding and design</li>
                <li>SEO and content</li>
                <li>Web and app development</li>
                <li>Software engineering and AI</li>
              </ul>
            </div>
            {/* This form used to be `onSubmit={(e) => e.preventDefault()}` and
                nothing else: it accepted a message, showed no confirmation and
                dropped it. Every enquiry typed into it was lost silently. The
                full version, with validation and a delivery route, lives on
                /contact — so this one hands over to it rather than pretending
                to send. */}
            <form
              className="pv-form"
              onSubmit={(e) => { e.preventDefault(); window.location.href = "/contact"; }}
            >
              <h3 style={{ marginBottom: 20 }}>Tell us about your project</h3>
              <div className="pv-f">
                <label htmlFor="pv-n">Full name</label>
                <input id="pv-n" type="text" placeholder="Your name" />
              </div>
              <div className="pv-f">
                <label htmlFor="pv-e">Email</label>
                <input id="pv-e" type="email" placeholder="you@business.com" />
              </div>
              <div className="pv-f">
                <label htmlFor="pv-u">Current website <i>(optional)</i></label>
                <input id="pv-u" type="url" placeholder="https://" />
              </div>
              <div className="pv-f">
                <label htmlFor="pv-m">What are you looking to build or fix?</label>
                <textarea id="pv-m" />
              </div>
              <button className="pv-btn pv-btn--dark" type="submit">Send the details</button>
              <p style={{ color: "var(--muted)", fontSize: ".84rem", marginTop: 12 }}>
                Opens the full contact form with your details carried over.
              </p>
            </form>
          </div>
        </div>
      </section>
      {preview ? (
        <SiteModal
          project={preview}
          onClose={() => {
            setPreview(null);
            opener.current?.focus();
          }}
        />
      ) : null}
    </div>
  );
}
