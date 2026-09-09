"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { SERVICES, type ServiceSlug } from "@/lib/services";
import { PROJECTS } from "@/lib/projects";
import { LOGOS, type LogoCategory } from "@/lib/logos";
import { LogoGlyph } from "@/components/ui/logo-glyph";
import { CONTACT_EMAIL } from "@/lib/site";

import "@/components/preview/preview.css";
import "./services.css";

/* One line-art glyph per service, in the order SERVICES is declared. Drawn
   here rather than pulled from an icon package so they inherit currentColor
   and match the stroke weight the rest of the page already uses. */
const GLYPHS: Record<ServiceSlug, string> = {
  branding: "M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z",
  seo: "M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM21 21l-4.3-4.3",
  web: "M16 18l6-6-6-6M8 6l-6 6 6 6",
  apps: "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 19h2",
  software: "M12 2a4 4 0 0 1 4 4v1h1a3 3 0 0 1 0 6h-1v1a4 4 0 0 1-8 0v-1H7a3 3 0 0 1 0-6h1V6a4 4 0 0 1 4-4z",
  social: "M4 4h16v12H5.2L4 18.4V4zM8 9h8M8 13h5",
};

/* Six stage glyphs, one per position in a service's run. The reference gives
   every card in the grid its own icon; repeating the service mark six times
   reads as a placeholder, so the stage index picks the glyph. */
const STEP_GLYPHS = [
  "M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM21 21l-4.3-4.3",
  "M4 7l5-2 6 2 5-2v12l-5 2-6-2-5 2V7zM9 5v14M15 7v14",
  "M3 4h18v16H3zM3 9h18M9 9v11",
  "M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5",
  "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  "M4 4h16v12H5.2L4 18.4V4zM8 9h8M8 13h5",
];

function Svg({ d, className }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
         className={className}>
      <path d={d} />
    </svg>
  );
}

const Glyph = ({ slug, className }: { slug: ServiceSlug; className?: string }) =>
  <Svg d={GLYPHS[slug]} className={className} />;

/* The toolbox rows are real: each service names LogoCategory keys and we pull
   the marks already registered under them, rather than showing client logos
   WDC has not claimed. */
const toolsFor = (cats: LogoCategory[], limit = 7) =>
  LOGOS.filter((l) => cats.includes(l.category)).slice(0, limit);

export default function ServicesBody() {
  const [filter, setFilter] = useState<ServiceSlug | "all">("all");
  const track = useRef<HTMLDivElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  /* Same reveal contract as the homepage: motion is opt-in and a blanket
     timeout guarantees content appears even if the observer never fires. */
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

  const shown = useMemo(
    () => filter === "all" ? PROJECTS : PROJECTS.filter((p) => p.services.includes(filter)),
    [filter],
  );

  const sync = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setAtStart(el.scrollLeft < 8);
    // a track that does not overflow is both at the start and at the end, so
    // both arrows correctly disable instead of scrolling nothing
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
  }, []);

  /* Re-measure when the filter changes: a narrower result set can remove the
     overflow entirely, and a stale atEnd would leave a live-looking arrow. */
  useEffect(() => {
    const el = track.current;
    if (el) el.scrollLeft = 0;
    sync();
  }, [filter, sync]);

  const step = (dir: number) => {
    const el = track.current;
    if (!el) return;
    const first = el.children[0] as HTMLElement | undefined;
    const gap = parseFloat(getComputedStyle(el).gap || "24");
    const by = first ? first.getBoundingClientRect().width + gap : 320;
    el.scrollBy({ left: dir * by, behavior: "smooth" });
  };

  return (
    <div className="pv sv">
      {/* ---------------- hero ---------------- */}
      <section className="pv-sec pv-sec--band sv-hero">
        {/* Decorative only: the bubbles echo the reference's floating badges.
            They sit behind the copy and are hidden from assistive tech. */}
        <div className="sv-orbit" aria-hidden="true">
          {SERVICES.slice(0, 4).map((s, i) => (
            <span className={`sv-bub sv-bub--${i + 1}`} key={s.slug}>
              <Glyph slug={s.slug} />
            </span>
          ))}
        </div>
        <div className="pv-wrap">
          <nav className="sv-crumb pv-reveal" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Services</span>
          </nav>
          <div className="sv-hero__copy pv-reveal">
            <h1>Everything a brand needs, under one roof</h1>
            <p className="pv-lede">
              Six services, one team. Design, engineering and growth sit together, so
              nothing is lost in the hand-off between the people who draw a thing and
              the people who build it.
            </p>
            <div className="sv-hero__cta">
              <a className="pv-btn pv-btn--accent" href="#sv-contact">Book a strategy call</a>
              <a className="pv-btn pv-btn--line" href="#sv-work">See the work</a>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- in-page service nav ---------------- */}
      <nav className="sv-jump" aria-label="Services">
        <div className="pv-wrap sv-jump__inner">
          {SERVICES.map((s, i) => (
            <a className="sv-jump__link" href={`#${s.slug}`} key={s.slug}>
              <span className="sv-jump__n">/ {String(i + 1).padStart(2, "0")}</span>
              {s.short}
            </a>
          ))}
        </div>
      </nav>

      {/* ---------------- the six services ---------------- */}
      {SERVICES.map((s, i) => (
        <section
          className={`pv-sec sv-svc${i % 2 ? " pv-sec--alt" : ""}`}
          id={s.slug}
          key={s.slug}
          aria-labelledby={`${s.slug}-h`}
        >
          <div className="pv-wrap">
            <div className="sv-svc__head pv-reveal">
              <div className="sv-svc__intro">
                <span className="pv-eyebrow">Service / {String(i + 1).padStart(2, "0")}</span>
                <h2 id={`${s.slug}-h`}>{s.name}</h2>
                <p className="pv-lede">{s.lede}</p>
                <p className="sv-svc__body">{s.body}</p>
                <a className="pv-btn pv-btn--line sv-svc__cta" href="#sv-contact">
                  Talk about {s.short.toLowerCase()}
                </a>
              </div>
              <aside className="sv-side">
                <h3>What you get</h3>
                <ul className="sv-deliv">
                  {s.deliverables.map((d) => <li key={d}>{d}</li>)}
                </ul>
                <div className="sv-tools">
                  <small>Tools we use</small>
                  <div className="sv-tools__row">
                    {toolsFor(s.tools).map((t) => (
                      <span className="sv-tool" key={t.id} title={t.name}>
                        <LogoGlyph entry={t} mono className="sv-tool__i" />
                      </span>
                    ))}
                  </div>
                </div>
              </aside>
            </div>

            {/* the reference's six-card grid, one per stage of this service */}
            <ol className="sv-steps pv-reveal">
              {s.steps.map((st, n) => (
                <li className="sv-step" key={st.t}>
                  <span className="sv-step__icon"><Svg d={STEP_GLYPHS[n]} /></span>
                  <span className="sv-step__n">{String(n + 1).padStart(2, "0")}</span>
                  <h3>{st.t}</h3>
                  <p>{st.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ))}

      {/* ---------------- work carousel ---------------- */}
      <section className="pv-sec pv-sec--band sv-work" id="sv-work">
        <div className="pv-wrap">
          <div className="pv-head pv-reveal">
            <span className="sv-pill">Projects</span>
            <h2>Exceptional work</h2>
            <p className="pv-lede">
              Every project here is live. Filter by service, then open any of them and
              see it for yourself.
            </p>
          </div>

          <div className="sv-filters pv-reveal" role="group" aria-label="Filter work by service">
            <button
              type="button"
              className={`sv-chip${filter === "all" ? " is-on" : ""}`}
              aria-pressed={filter === "all"}
              onClick={() => setFilter("all")}
            >
              All work <span className="sv-chip__c">{PROJECTS.length}</span>
            </button>
            {SERVICES.map((s) => {
              const n = PROJECTS.filter((p) => p.services.includes(s.slug)).length;
              return (
                <button
                  type="button"
                  key={s.slug}
                  className={`sv-chip${filter === s.slug ? " is-on" : ""}`}
                  aria-pressed={filter === s.slug}
                  onClick={() => setFilter(s.slug)}
                >
                  {s.short} <span className="sv-chip__c">{n}</span>
                </button>
              );
            })}
          </div>

          {shown.length > 0 ? (
            <>
              <div className="sv-work__bar">
                <p className="sv-count" aria-live="polite">
                  {shown.length} {shown.length === 1 ? "project" : "projects"}
                  {filter === "all" ? "" : ` in ${SERVICES.find((s) => s.slug === filter)?.short}`}
                </p>
                <div className="pv-nav">
                  <button className="pv-rbtn pv-rbtn--prev" onClick={() => step(-1)}
                          disabled={atStart} aria-label="Previous project" />
                  <button className="pv-rbtn" onClick={() => step(1)}
                          disabled={atEnd} aria-label="Next project" />
                </div>
              </div>
              <div className="pv-track sv-track" ref={track} onScroll={sync}>
                {shown.map((p) => (
                  <a className="pv-job" key={p.url} href={p.url}
                     target="_blank" rel="noopener noreferrer">
                    <div className="pv-shot">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.cover} alt={`${p.name} website`} loading="lazy" />
                    </div>
                    <div className="pv-job__body">
                      <div className="pv-job__row">
                        <b>{p.name}</b>
                        <span className="pv-badge" aria-hidden="true" />
                      </div>
                      <p className="pv-job__desc">{p.sector}</p>
                      <div className="sv-tags">
                        {p.services.map((t) => (
                          <span className="sv-tag" key={t}>
                            {SERVICES.find((s) => s.slug === t)?.short}
                          </span>
                        ))}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </>
          ) : (
            /* Honest empty state. Borrowing another service's work here would
               imply a case study that does not exist. */
            <div className="sv-empty" aria-live="polite">
              <p>
                We have not published a case study for{" "}
                <b>{SERVICES.find((s) => s.slug === filter)?.short}</b> yet.
              </p>
              <p className="sv-empty__sub">
                We have done the work; it is the write-up that is outstanding. Ask us and
                we will send relevant examples.
              </p>
              <a className="pv-btn pv-btn--accent" href="#sv-contact">Ask for examples</a>
            </div>
          )}
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="pv-sec sv-cta" id="sv-contact">
        <div className="pv-wrap">
          <div className="sv-cta__box pv-reveal">
            <span className="pv-eyebrow">Start here</span>
            <h2>Tell us what you are trying to achieve.</h2>
            <p className="pv-lede">
              Not a feature list; the outcome. We will tell you honestly which of the six
              services it needs, and which it does not.
            </p>
            <div className="sv-cta__row">
              <a className="pv-btn pv-btn--accent" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
              <Link className="pv-btn pv-btn--line" href="/#contact">Use the contact form</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
