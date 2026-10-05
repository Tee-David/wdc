import Link from "next/link";
import Image from "next/image";
import ServiceIcon from "@/components/ui/service-icon";
import { PROJECTS } from "@/lib/projects";
import { caseHref } from "@/lib/work";
import { TESTIMONIALS } from "@/lib/testimonials";
import { CardMarquee } from "@/components/ui/card-marquee";

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

/* THE STORY, chapter by chapter, in the order it happened. The only date is
   the one the owner gave (around 2016); nothing else is dated, counted or
   named, so nothing here can go out of date or be wrong. */
const CHAPTERS = [
  { i: "Palette", t: "It began with a flyer", d: "Around 2016, with a laptop and a lot to learn, we started where most businesses start: a logo, a flyer, a poster. Small jobs, done with care. The people we did them for came back, and told others." },
  { i: "Orbit", t: "A logo is not a brand", d: "We learned that fast. A brand is how a business looks, moves and sounds everywhere a customer meets it. So we added motion design and brand guides, so a brand stays itself in every hand it passes through.", cta: { l: "See the branding work", h: "/work/branding" } },
  { i: "Layers", t: "Websites for everyone", d: "Many of our clients could not afford a custom-built website, and they should not have to go without one. So we built sites on management systems they could run themselves: affordable, easy to update, and properly made." },
  { i: "Code", t: "Custom, when it matters", d: "Some businesses need something no template can do. For them we started building custom websites, to a professional standard, around exactly how they work.", cta: { l: "Browse the websites", h: "/work/web" } },
  { i: "Phone", t: "Apps, then software", d: "Then clients wanted apps in people's hands, and systems to run the business behind them. We followed the problem, and learned to build software and AI that solves it instead of decorating it." },
  { i: "Search", t: "Being seen", d: "A great brand nobody can find does not grow. So visibility became part of the job: search, content and ads that bring the right people to the work.", cta: { l: "See how we get you found", h: "/services/seo" } },
  { i: "Users", t: "One team, all of it", d: "Today the same people who design the brand build what carries it and grow what comes after. You talk to one team, from the first sketch to the first hundred customers." },
] as const;

export default function AboutBody() {
  const proof = PROJECTS.filter((p) => p.cover);
  /* Their words, verbatim, from lib/testimonials.ts, leaving out any that name a city (our copy names none). */
  const quotes = TESTIMONIALS.filter((q) => !/Lagos|Abuja|Ibadan/.test(q.text));

  return (
    <div className="pv ab">
      {/* THE SAME OPENING AS EVERY OTHER PAGE (AGENTS.md, "Page shape"): the navy
          band with the label, the h1 and the lede, and nothing else. */}
      <section className="wk-hero">
        <div className="pv-wrap wk-hero__in">
          <span className="pv-eyebrow">About</span>
          <h1 className="pv-mix">Brilliant simplicity <b>of thought</b></h1>
          <p className="pv-lede">
            We help businesses grow their brand. We started with a logo and a
            flyer, and we now design, build and grow everything a brand needs,
            with one team, so the work arrives as one thing rather than many
            handovers.
          </p>
        </div>
      </section>

      {/* ---------------- the mission ---------------- */}
      <section className="pv-sec" aria-labelledby="ab-mission">
        <div className="pv-wrap ab-story">
          <div>
            <span className="pv-eyebrow">Why we exist</span>
            <h2 id="ab-mission" className="pv-mix">Most businesses do not know where to start growing their <b>brand.</b></h2>
          </div>
          <div className="ab-story__text">
            <p>
              They guess. They hire one person for the logo, another for the website,
              a third for the ads, and none of them talk to each other. The mistakes
              add up, and the fault lines show: a brand that looks different in every
              place, a site nobody can update, a lot of attention that goes nowhere.
            </p>
            <p>
              We know those mistakes because we made some of them ourselves, coming
              up. And they still happen today, to businesses of every size. That is
              why We Dig Creativity exists.
            </p>
            <p className="ab-mission">
              <b>Our mission</b>
              To give every business, big or small, a brand that people understand,
              trust, and keep coming back to.
            </p>
            <p className="ab-more ab-more--left"><Link href="/services">See what we do</Link></p>
          </div>
        </div>
      </section>

      {/* ---------------- the story ---------------- */}
      <section className="pv-sec pv-sec--alt" aria-labelledby="ab-story">
        <div className="pv-wrap">
          <div className="pv-head">
            <span className="pv-eyebrow">Our story</span>
            <h2 id="ab-story" className="pv-mix">From a single flyer to <b>everything a brand needs</b></h2>
            <p className="pv-lede">We never planned the whole thing. We followed what our clients needed next, and learned each part properly before offering it.</p>
          </div>
          <ol className="ab-line">
            {CHAPTERS.map((c, n) => (
              <li key={c.t}>
                <span className="ab-ic" aria-hidden="true"><ServiceIcon name={c.i} size={22} /></span>
                <div>
                  <span className="ab-line__k">Chapter {n + 1}</span>
                  <h3>{c.t}</h3>
                  <p>{c.d}</p>
                  {"cta" in c && c.cta ? <p className="ab-more ab-more--left"><Link href={c.cta.h}>{c.cta.l}</Link></p> : null}
                </div>
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
            <h2 id="ab-values" className="pv-mix">Made to be kept, <b>not abandoned</b></h2>
            <p className="pv-lede">We care how people see your product and how well it works for them. Everything we make is meant to still be doing its job long after launch day.</p>
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
      <section className="pv-sec pv-sec--alt" aria-labelledby="ab-proof">
        <div className="pv-wrap">
          <div className="pv-head">
            <span className="pv-eyebrow">The proof</span>
            <h2 id="ab-proof" className="pv-mix">Do not take our word. <b>Open the work.</b></h2>
            <p className="pv-lede">Reviews and feedback from clients built this studio, and the work speaks for itself. Every project below is live and can be opened.</p>
          </div>
          {quotes.length ? (
            <CardMarquee label="What clients say" seconds={quotes.length * 12}>
              {quotes.map((q) => (
                <blockquote key={q.client} className="ab-quote"><p>&ldquo;{q.text}&rdquo;</p><footer>{q.client}</footer></blockquote>
              ))}
            </CardMarquee>
          ) : null}
          {proof.length ? (
            <div className="ab-proof">
              <CardMarquee label="Projects you can open" seconds={proof.length * 9} reverse>
                {proof.map((p) => (
                  <Link key={p.name} className="wk-card" href={caseHref(p.caseSlug) ?? "/work"}>
                    <span className="wk-card__shot">
                      <Image src={p.cover!} alt={`${p.name}, a project by We Dig Creativity`} fill sizes="340px" />
                    </span>
                    <span className="wk-card__body">
                      <span className="wk-card__t">{p.name}</span>
                      <span className="wk-card__d">{p.sector}</span>
                    </span>
                  </Link>
                ))}
              </CardMarquee>
            </div>
          ) : null}
          <p className="ab-more"><Link href="/work">See all the work</Link></p>
          <div className="ab-offer">
            <h3>See it before you commit</h3>
            <p>We are that sure of the work. Where it helps, we will show you a working sample, or test an idea with you first, so you judge the result and not the promise.</p>
            <Link className="pv-btn pv-btn--accent" href="/start">Ask for a sample</Link>
          </div>
        </div>
      </section>

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
