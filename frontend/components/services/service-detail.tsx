"use client";

import type { CSSProperties } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Service, ServiceSlug } from "@/lib/services";
import { LOGOS, type LogoCategory } from "@/lib/logos";
import { LogoGlyph } from "@/components/ui/logo-glyph";
import LogoLoop from "@/components/ui/logo-loop";
import ServiceIcon from "@/components/ui/service-icon";
import SwipeRail from "@/components/ui/swipe-rail";
import StrokeNumber from "@/components/ui/stroke-number";
import { LazyStage } from "./stages/stage-shell";

import "./services.css";
import "./stages/stages.css";

/**
 * One service, on its own page.
 *
 * WHY THIS EXISTS RATHER THAN A FILTER ON `services-body.tsx`. That component
 * renders all six services and, with them, all six signature stages: six
 * code-split demos, six tool marquees and a pinned rail, on one route. The
 * audit measured that page at 8,320ms of blocked main thread against the
 * homepage's 1,360ms, and 27.4 phone screens long. Splitting it is not a
 * layout preference, it is the fix -- a visitor who came for SEO now downloads
 * the SEO stage and nothing else.
 *
 * The markup deliberately reuses `sv-*` classes. A detail page that invented
 * its own would be a second visual language for the same content.
 */

/* One signature stage per service, each code-split so a visitor loads the one
   demo their page actually shows. `ssr: false` because every one of them
   measures or animates something that does not exist on a server. */
const STAGES: Record<ServiceSlug, React.ComponentType> = {
  branding: dynamic(() => import("./stages/grid-motion"), { ssr: false }),
  seo: dynamic(() => import("./stages/serp-climb"), { ssr: false }),
  web: dynamic(() => import("./stages/viewport-morph"), { ssr: false }),
  apps: dynamic(() => import("./stages/two-stores"), { ssr: false }),
  software: dynamic(() => import("./stages/pipeline"), { ssr: false }),
  social: dynamic(() => import("./stages/feed-wall"), { ssr: false }),
};

/* Which stages render a controls row. The placeholder has to reserve the same
   height or the page jumps when the real thing arrives. */
const STAGE_HAS_CONTROLS: Record<ServiceSlug, boolean> = {
  branding: false, seo: true, web: true, apps: true, software: true, social: true,
};

/* Same treatment as the homepage marquee: a mono mark beside the tool's name,
   so the strip says what we use rather than showing a row of unlabelled marks
   the reader has to recognise. Identical to services-body.tsx on purpose. */
/* A service's tool row is drawn from the categories it names, so it shows the
   marks already registered under them rather than client logos WDC has not
   claimed. Same rule as services-body.tsx. */
const toolsFor = (cats: LogoCategory[]) =>
  LOGOS.filter((l) => cats.includes(l.category));

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

export default function ServiceDetail({ service }: { service: Service }) {
  const Stage = STAGES[service.slug];

  return (
    <>
      {/* SHOW IT, THEN EXPLAIN IT. The demo goes above the prose for the same
          reason it does on the combined page: a visitor who scrolls past the
          copy still sees what we actually make. */}
      <section className="pv-sec sv-svc" aria-labelledby="svc-h">
        <div className="pv-wrap">
          <div className="sv-svc__cols">
            {/* NO ScrollExpand HERE, and that is an alignment decision.

                It scales `.se` as you scroll, which is a nice reveal on the
                long combined page where each service arrives in turn. On a
                service's own page the showcase is half of a two-column row,
                and a scaled box does not sit where its layout box says it
                does -- the panel rendered 39px below the prose beside it,
                while the two columns themselves measured perfectly level. A
                reveal is not worth a row that does not line up. */}
            <div className="sv-svc__showcase">
              <LazyStage withControls={STAGE_HAS_CONTROLS[service.slug]}>
                <Stage />
              </LazyStage>
            </div>

            <div className="sv-svc__head sv-svc__head--after pv-reveal">
              <div className="sv-svc__intro">
                <p className="sv-svc__body">{service.body}</p>
              </div>

              <aside className="sv-side">
                <h2 className="pv-mix"><b>What you get</b></h2>
                <ul className="sv-deliv">
                  {service.deliverables.map((d) => <li key={d}>{d}</li>)}
                </ul>
                <div className="sv-tools">
                  <small>Tools we use</small>
                  {/* Every tool for this service, not a first-seven slice: the
                      marquee is what makes showing all of them possible in a
                      rail this narrow. */}
                  <LogoLoop
                    logos={marqueeItems(service.tools)}
                    speed={32}
                    direction="left"
                    logoHeight={17}
                    gap={26}
                    pauseOnHover
                    scaleOnHover
                    fadeOut
                    className="sv-tools__loop"
                    ariaLabel={`Tools we use for ${service.name}`}
                  />
                </div>
              </aside>

              {/* `service.short` is used as written -- "Software & AI", "Social
                  & PPC" -- because lowercasing it turned AI into ai and PPC
                  into ppc, which reads as a typo rather than a house style. */}
              <Link className="pv-btn pv-btn--line sv-svc__cta" href={`/contact?topic=${service.slug}`}>
                Talk about {service.short}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT GOES. The six steps were a grid on the combined page and stay
          one here; they are the part a prospect reads when they are deciding
          whether we know what we are doing. */}
      <section className="pv-sec sv-svc">
        <div className="pv-wrap">
          <div className="pv-head pv-reveal">
            <span className="pv-eyebrow">How it goes</span>
            <h2 className="pv-mix">What working with us on <b>{service.short.toLowerCase()}</b> looks like</h2>
          </div>
          {/* The reference's six-card grid: a grid on desktop, and on a phone
              a swipe rail. It used to pin, like the homepage services, which
              held the page still for a thousand pixels of scrolling; the
              homepage keeps that as its one showpiece. */}
          <SwipeRail label={`How it goes: ${service.steps.length} steps, swipe for more`} count={service.steps.length}>
            <ol className="sv-steps pv-reveal">
              {service.steps.map((step, n) => (
                <li className="sv-step" key={step.t}>
                  {/* The stagger for the idle bob; see sv-bob in services.css. */}
                  <span className="sv-step__icon" style={{ "--bob": `${n * 260}ms` } as CSSProperties}>
                    <ServiceIcon name={step.i} delay={n * 90} />
                  </span>
                  <StrokeNumber className="sv-step__n" value={String(n + 1).padStart(2, "0")} delay={n * 160} />
                  <h3>{step.t}</h3>
                  <p>{step.d}</p>
                </li>
              ))}
            </ol>
          </SwipeRail>
        </div>
      </section>
    </>
  );
}
