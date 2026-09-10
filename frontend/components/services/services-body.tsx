"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { SERVICES, type ServiceSlug } from "@/lib/services";
import { PROJECTS, type Project } from "@/lib/projects";
import SiteModal from "@/components/preview/site-modal";
import { useReveal } from "@/components/preview/use-reveal";
import { LOGOS, type LogoCategory } from "@/lib/logos";
import { LogoGlyph } from "@/components/ui/logo-glyph";
import LogoLoop from "@/components/ui/logo-loop";
import { CONTACT_EMAIL } from "@/lib/site";

import { LazyStage } from "./stages/stage-shell";
import ServiceIcon from "@/components/ui/service-icon";
import PinnedRow from "@/components/ui/pinned-row";
import TextLoop from "@/components/ui/text-loop";
import WarpText from "@/components/ui/warp-text";
import ScrollExpand from "@/components/ui/scroll-expand";
import ParticleText from "@/components/ui/particle-text";

import "@/components/preview/preview.css";
import "./services.css";
import "./stages/stages.css";
import "@/components/ui/motion-kit.css";
import StrokeNumber from "@/components/ui/stroke-number";

/* One signature stage per service, each code-split so a visitor who never
   scrolls to Social never downloads the feed wall. ssr:false because these are
   decorative and browser-driven; the readable copy around them is server
   rendered, so nothing that matters waits on this JS. LazyStage then holds
   the mount until the frame is near the viewport. */
/* Which stages render a controls row — the placeholder has to reserve the same
   height, so mounting one never changes the page's height. */
const STAGE_HAS_CONTROLS: Record<ServiceSlug, boolean> = {
  branding: true, seo: false, web: true, apps: true, software: true, social: false,
};

const STAGES: Record<ServiceSlug, React.ComponentType> = {
  branding: dynamic(() => import("./stages/grid-motion"), { ssr: false }),
  seo: dynamic(() => import("./stages/serp-climb"), { ssr: false }),
  web: dynamic(() => import("./stages/viewport-morph"), { ssr: false }),
  apps: dynamic(() => import("./stages/two-stores"), { ssr: false }),
  software: dynamic(() => import("./stages/pipeline"), { ssr: false }),
  social: dynamic(() => import("./stages/feed-wall"), { ssr: false }),
};

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
const toolsFor = (cats: LogoCategory[]) =>
  LOGOS.filter((l) => cats.includes(l.category));

/* Same treatment as the homepage marquee: a mono mark beside the tool's name,
   so the strip says what we use rather than showing a row of unlabelled marks
   the reader has to recognise. */
const marqueeItems = (cats: LogoCategory[]) =>
  toolsFor(cats).map((entry) => ({
    title: entry.name,
    ariaLabel: entry.name,
    node: (
      <span className="sv-tool">
        <LogoGlyph entry={entry} mono className="sv-tool__i" />
        <span className="sv-tool__n">{entry.name}</span>
      </span>
    ),
  }));

export default function ServicesBody() {
  const [filter, setFilter] = useState<ServiceSlug | "all">("all");
  const track = useRef<HTMLDivElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  /* Same reveal contract as the homepage: motion is opt-in and a blanket
     timeout guarantees content appears even if the observer never fires. */
  useReveal();

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

  /* Live previews open in place rather than sending a visitor away mid-browse. */
  const [preview, setPreview] = useState<Project | null>(null);
  const opener = useRef<HTMLAnchorElement | null>(null);

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
            <p className="sv-hero__loop">
              <span>Ask us about</span>{" "}
              <TextLoop
                items={SERVICES.map((x) => x.name)}
                className="sv-hero__loopword"
              />
            </p>
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
        {/* A marquee of LINKS, so it has to stop when someone reaches for one:
            pauseOnHover for pointers, and LogoLoop pauses on focus too for
            keyboards. Reduced motion holds it still outright. */}
        <LogoLoop
          logos={SERVICES.map((sv) => ({
            href: `#${sv.slug}`,
            ariaLabel: sv.name,
            node: (
              <span className="sv-jump__link">
                {/* The service's own icon rather than a running number. "/ 03"
                    told a reader nothing except that there was an 02 somewhere
                    behind it; the glyph says what the link is before the word
                    is read, which is the whole job of a ticker going past. */}
                <span className="sv-jump__i" aria-hidden="true">
                  <ServiceIcon name={sv.icon} size={17} />
                </span>
                {sv.short}
              </span>
            ),
          }))}
          speed={26}
          direction="left"
          logoHeight={20}
          gap={38}
          pauseOnHover
          fadeOut
          className="sv-jump__loop"
          ariaLabel="Jump to a service"
        />
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
            {/* Name it, SHOW it, then explain it. The work is the argument, so
                it goes above the prose rather than under it: a visitor who
                scrolls past the copy still sees what we actually make. */}
            <div className="sv-svc__top pv-reveal">
              <span className="pv-eyebrow">Service / {String(i + 1).padStart(2, "0")}</span>
              <h2 id={`${s.slug}-h`} className="sv-svc__title">
                <span className="sv-svc__icon">
                  <ServiceIcon name={s.icon} size={22} hover="pop" />
                </span>
                {s.name}
              </h2>
            </div>

            {/* Two columns from 1024px up: the showcase on the left, the words
                about it on the right, reading across rather than down. Below
                that width they stack in the same order — see it, then read it —
                because side by side at 900px gives the stage half a phone. */}
            <div className="sv-svc__cols">
              {/* the service's signature showcase */}
              {(() => {
                const StageFor = STAGES[s.slug];
                return (
                  <div className="sv-svc__showcase">
                    <ScrollExpand>
                      <LazyStage withControls={STAGE_HAS_CONTROLS[s.slug]}>
                        <StageFor />
                      </LazyStage>
                    </ScrollExpand>
                  </div>
                );
              })()}

            <div className="sv-svc__head sv-svc__head--after pv-reveal">
              <div className="sv-svc__intro">
                <p className="pv-lede">{s.lede}</p>
                <p className="sv-svc__body">{s.body}</p>
              </div>
              <aside className="sv-side">
                <h3>What you get</h3>
                <ul className="sv-deliv">
                  {s.deliverables.map((d) => <li key={d}>{d}</li>)}
                </ul>
                <div className="sv-tools">
                  <small>Tools we use</small>
                  {/* every tool for this service, not a first-seven slice —
                      the marquee is what makes showing all of them possible in
                      a rail this narrow */}
                  <LogoLoop
                    logos={marqueeItems(s.tools)}
                    speed={32}
                    direction={i % 2 ? "right" : "left"}
                    logoHeight={17}
                    gap={26}
                    pauseOnHover
                    scaleOnHover
                    fadeOut
                    className="sv-tools__loop"
                    ariaLabel={`Tools we use for ${s.name}`}
                  />
                </div>
              </aside>
              {/* The ask goes AFTER the proof, not between the pitch and it.
                  `s.short` is used as written — "Software & AI", "Social &
                  PPC" — because lowercasing it turned AI into ai and PPC into
                  ppc, which reads as a typo rather than as a house style. */}
              <a className="pv-btn pv-btn--line sv-svc__cta" href="#sv-contact">
                Talk about {s.short}
              </a>
            </div>
            </div>

            {/* the reference's six-card grid — a grid on desktop, and on a
                phone the same pinned horizontal run the homepage services use */}
            <PinnedRow className="sv-steps__pin pv-reveal sv-steps--after">
            <ol className="sv-steps">
              {s.steps.map((st, n) => (
                <li className="sv-step" key={st.t}>
                  {/* the stagger for the idle bob; see sv-bob in services.css */}
                  <span className="sv-step__icon" style={{ "--bob": `${n * 260}ms` } as CSSProperties}>
                    <ServiceIcon name={st.i} delay={n * 90} />
                  </span>
                  <StrokeNumber className="sv-step__n" value={String(n + 1).padStart(2, "0")} delay={n * 160} />
                  <h3>{st.t}</h3>
                  <p>{st.d}</p>
                </li>
              ))}
            </ol>
            </PinnedRow>
          </div>
        </section>
      ))}

      {/* ---------------- work carousel ---------------- */}
      <section className="pv-sec pv-sec--band sv-work" id="sv-work">
        <div className="pv-wrap">
          <div className="pv-head pv-reveal">
            <span className="sv-pill">Projects</span>
            <WarpText as="h2" text="Exceptional work" curve={14} tilt={6} />
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
                  /* Same behaviour as the homepage rail: a plain click previews
                     the live site here, modified clicks still open it. */
                  <a className="pv-job" key={p.url} href={p.url}
                     target="_blank" rel="noopener noreferrer"
                     onClick={(e) => {
                       if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                       e.preventDefault();
                       opener.current = e.currentTarget;
                       setPreview(p);
                     }}>
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
            <h2 className="sv-cta__h">
              <ParticleText text="Let's talk." loop />
            </h2>
            <p className="sv-cta__sub">Tell us what you are trying to achieve.</p>
            <p className="pv-lede">
              Not a feature list; the outcome. We will tell you honestly which of the six
              services it needs, and which it does not.
            </p>
            <div className="sv-cta__row">
              {/* the label says the action; the address itself is long enough
                  to wrap a button onto two lines on a phone */}
              <a className="pv-btn pv-btn--accent" href={`mailto:${CONTACT_EMAIL}`}>
                Send us a mail
              </a>
              <Link className="pv-btn pv-btn--line" href="/#contact">Use the contact form</Link>
            </div>
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
