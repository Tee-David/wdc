import Link from "next/link";
import Image from "next/image";
import ServiceIcon from "@/components/ui/service-icon";
import { SERVICES } from "@/lib/services";
import { PROJECTS } from "@/lib/projects";
import { LOGOS } from "@/lib/logos";
import { caseHref } from "@/lib/work";

import "@/components/preview/preview.css";
import "@/components/work/work.css";
import "./about.css";

/**
 * /about, in the order a visitor wants answers: who you are and why (the
 * story), what you stand for, how you work, who is in the room, proof it works,
 * and one clear next step. It reads top to bottom with no pinned or scroll
 * driven sections, so it is the same on a phone, with a keyboard and for a
 * crawler.
 *
 * EVERY FIGURE IS DERIVED from the data (services, projects, tools), never
 * typed in, so a number cannot drift away from what the site shows. And there
 * are no invented people: the team section names the disciplines in the room
 * until real names and photographs exist to put there.
 */

const BELIEFS = [
  { t: "One roof", d: "Design, build and growth sit in one team, so nothing is lost in the hand-off between the people who draw a thing and the people who build it.", i: "Layers" },
  { t: "Every budget", d: "We work at a premium standard that scales down without becoming a different standard.", i: "Scale" },
  { t: "Built to last", d: "Fast, accessible, maintainable code. Not a template with your logo dropped on it.", i: "Wrench" },
  { t: "You are included", d: "You see the work as it happens, instead of a reveal at the end that you cannot change.", i: "Eye" },
  { t: "Found, not just seen", d: "Search and content work that keeps paying after the site ships, including being found by the AI tools people now ask.", i: "Search" },
  { t: "Candid engineering", d: "AI and software built around a real outcome, and we say plainly when a model is not the answer.", i: "Cpu" },
];

const TEAM = [
  { name: "Brand & design", role: "Identity, print, motion", i: "Palette", note: "Works out what a brand has to say before anything gets drawn." },
  { name: "Engineering", role: "Web, apps, platform", i: "Code", note: "Ships the thing, then keeps it fast and maintainable after launch." },
  { name: "Growth", role: "SEO, content, paid", i: "TrendingUp", note: "Makes the work findable, then keeps it earning after it goes live." },
  { name: "Product", role: "Scope, research, QA", i: "Compass", note: "Turns a business problem into something a team can actually build." },
  { name: "Social", role: "Calendars, community", i: "MessageCircle", note: "Runs the accounts day to day, not just the launch post." },
];

/* The three stages a project moves through, and the services under each. */
const STAGES = [
  { t: "Brand", d: "What it says, and how it looks and sounds everywhere a customer meets it.", s: ["branding", "social"] },
  { t: "Build", d: "The website, app or system that carries it, built to be fast and easy to keep updated.", s: ["web", "apps", "software"] },
  { t: "Grow", d: "What happens after launch: being found, and turning attention into enquiries.", s: ["seo", "social"] },
] as const;

const FIGURES = [
  { n: SERVICES.length, l: "services, handled by one team" },
  { n: TEAM.length, l: "disciplines in the room" },
  { n: PROJECTS.length, l: "live projects you can open and check" },
  { n: LOGOS.length, l: "tools and platforms we work with" },
];

export default function AboutBody() {
  const proof = PROJECTS.filter((p) => p.cover).slice(0, 3);
  const bySlug = (s: string) => SERVICES.find((x) => x.slug === s)!;

  return (
    <div className="pv ab">
      {/* THE SAME OPENING AS EVERY OTHER PAGE (AGENTS.md, "Page shape"): the navy
          band with the label, the h1 and the lede, and nothing else. */}
      <section className="wk-hero">
        <div className="pv-wrap wk-hero__in">
          <span className="pv-eyebrow">About</span>
          <h1 className="pv-mix">Brilliant simplicity <b>of thought</b></h1>
          <p className="pv-lede">
            We are a creative and digital agency. We design the brand, build the
            product and run the growth that follows, with the same team on all
            three, so the work arrives as one thing rather than three handovers.
          </p>
        </div>
      </section>

      {/* ---------------- the story ---------------- */}
      <section className="pv-sec" aria-labelledby="ab-story">
        <div className="pv-wrap ab-story">
          <div>
            <span className="pv-eyebrow">Our story</span>
            <h2 id="ab-story" className="pv-mix">Most agencies hand you a logo and leave. We stay for the part where it has to <b>work</b>.</h2>
          </div>
          <div className="ab-story__text">
            <p>
              A brand that looks right but loads slowly, ranks nowhere and cannot be
              updated by the people who own it is not finished. So we take the whole
              path: what the brand says, how it is built, and what happens to it after
              launch.
            </p>
            <p>
              That is why design, engineering and growth sit in one team. The person
              who draws the page talks to the person who builds it, and both talk to
              the person who will make it findable. You deal with one group of people,
              and you see the work as it happens.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- the figures ---------------- */}
      <section className="pv-sec pv-sec--alt" aria-label="The studio in numbers">
        <div className="pv-wrap">
          <ul className="ab-figs">
            {FIGURES.map((f) => (
              <li key={f.l}><b>{f.n}</b><span>{f.l}</span></li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------- how we work ---------------- */}
      <section className="pv-sec" aria-labelledby="ab-how">
        <div className="pv-wrap">
          <div className="pv-head">
            <span className="pv-eyebrow">How we work</span>
            <h2 id="ab-how" className="pv-mix">One path, <b>three stages</b></h2>
            <p className="pv-lede">Every project moves through the same three stages, with the same people. You can start at any one of them.</p>
          </div>
          <ol className="ab-stages">
            {STAGES.map((st, n) => (
              <li key={st.t}>
                <span className="ab-stages__n" aria-hidden="true">{n + 1}</span>
                <h3>{st.t}</h3>
                <p>{st.d}</p>
                <ul>
                  {st.s.map((slug) => (
                    <li key={slug}><Link href={`/services/${slug}`}>{bySlug(slug).name}</Link></li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------- what we stand for ---------------- */}
      <section className="pv-sec pv-sec--alt" aria-labelledby="ab-values">
        <div className="pv-wrap">
          <div className="pv-head">
            <span className="pv-eyebrow">What we stand for</span>
            <h2 id="ab-values" className="pv-mix">Six things we will <b>not trade away</b></h2>
          </div>
          <ul className="ab-values">
            {BELIEFS.map((b) => (
              <li key={b.t}>
                <span className="ab-ic" aria-hidden="true"><ServiceIcon name={b.i} size={22} /></span>
                <h3>{b.t}</h3>
                <p>{b.d}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------- the people ---------------- */}
      <section className="pv-sec" aria-labelledby="ab-team">
        <div className="pv-wrap">
          <div className="pv-head">
            <span className="pv-eyebrow">The people</span>
            <h2 id="ab-team" className="pv-mix"><b>The disciplines</b> in the room</h2>
            <p className="pv-lede">Your project gets the people it needs from each of these, not a hand-off between separate companies.</p>
          </div>
          <ul className="ab-team">
            {TEAM.map((m) => (
              <li key={m.name}>
                <span className="ab-ic" aria-hidden="true"><ServiceIcon name={m.i} size={22} /></span>
                <h3>{m.name}</h3>
                <p className="ab-team__role">{m.role}</p>
                <p>{m.note}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------- proof ---------------- */}
      {proof.length ? (
        <section className="pv-sec pv-sec--alt" aria-labelledby="ab-proof">
          <div className="pv-wrap">
            <div className="pv-head">
              <span className="pv-eyebrow">The proof</span>
              <h2 id="ab-proof" className="pv-mix">Work you can <b>open and check</b></h2>
            </div>
            <ul className="ab-proof">
              {proof.map((p) => {
                const href = caseHref(p.caseSlug) ?? "/work";
                return (
                  <li key={p.name}>
                    <Link className="wk-card" href={href}>
                      <span className="wk-card__shot">
                        <Image src={p.cover!} alt={`${p.name}, a project by We Dig Creativity`} fill sizes="(max-width: 700px) 100vw, 360px" />
                      </span>
                      <span className="wk-card__body">
                        <span className="wk-card__t">{p.name}</span>
                        <span className="wk-card__d">{p.sector}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="ab-more"><Link href="/work">See all the work</Link></p>
          </div>
        </section>
      ) : null}

      {/* ---------------- the next step ---------------- */}
      <section className="pv-sec pv-sec--band ab-cta">
        <div className="pv-wrap">
          <div className="pv-cta">
            <span className="pv-eyebrow">Next step</span>
            <h2 className="pv-mix">Tell us <b>what you are trying to get done.</b></h2>
            <p>Not a brief, not a budget. The outcome. We will tell you what it actually takes, and say so if it is not us.</p>
            <Link className="pv-btn pv-btn--accent" href="/start">Start a project</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
