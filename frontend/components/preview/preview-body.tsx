"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PROJECTS } from "@/lib/projects";
import { FAQS } from "@/lib/faq";
import { CONTACT_EMAIL } from "@/lib/site";

import "./preview.css";

/* Copy is WDC's own, taken from the existing homepage, the PRD and llms.txt. */

const SERVICES = [
  {
    title: "Branding & Design",
    body: "Identity systems, logos, motion, and visuals that make brands unmistakable across every surface.",
    img: "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=1200&q=80",
  },
  {
    title: "SEO",
    body: "Get found; technical, on-page, and content SEO that ranks, earns clicks, and converts.",
    img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80",
  },
  {
    title: "Full-Stack Web Development",
    body: "Fast, accessible, scalable websites and web apps engineered to perform and last.",
    img: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&q=80",
  },
  {
    title: "Cross-Platform App Development",
    body: "One codebase, every device; native-quality mobile experiences on iOS and Android.",
    img: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&q=80",
  },
  {
    title: "Software Engineering & AI",
    body: "Custom software and AI integrations engineered around real business outcomes.",
    img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80",
  },
  {
    title: "Social Media & PPC",
    body: "Turn attention into growth with paid ads and social content that actually moves.",
    img: "https://images.unsplash.com/photo-1611926653458-09294b3142bf?w=1200&q=80",
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
  { t: "Built to last", d: "Fast, accessible, maintainable code, not a template with your logo on it.", label: "Our services", href: "#pv-services" },
  { t: "You are included", d: "You see the work as it happens instead of a reveal at the end.", label: "How we work", href: "#pv-process" },
  { t: "Found, not just seen", d: "Search and content work that keeps paying after the site ships.", label: "Our services", href: "#pv-services" },
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
              <a className="pv-job" key={p.url} href={p.url} target="_blank" rel="noopener noreferrer">
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
              <div className="pv-step" key={s.t}>
                <span className="pv-step__n">{String(i + 1).padStart(2, "0")}</span>
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
          <div className="pv-srows pv-reveal">
            {[0, 1].map((row) => (
              <div className="pv-srow" key={row}>
                {SERVICES.slice(row * 3, row * 3 + 3).map((s, i) => {
                  const idx = row * 3 + i;
                  return (
                    <a
                      className={`pv-scard${active === idx ? " is-on" : ""}`}
                      key={s.title}
                      href="#pv-contact"
                      onMouseEnter={() => setActive(idx)}
                      onFocus={() => setActive(idx)}
                    >
                      <div className="pv-scard__media">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={s.img} alt="" loading="lazy" />
                      </div>
                      <span className="pv-scard__n">{String(idx + 1).padStart(2, "0")}</span>
                      <div className="pv-scard__ic"><Icon i={idx} /></div>
                      <div className="pv-scard__body">
                        <h3>{s.title}</h3>
                        <p>{s.body}</p>
                        <span className="pv-more">Talk to us</span>
                      </div>
                    </a>
                  );
                })}
              </div>
            ))}
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
            <div className="pv-qa pv-reveal">
              {FAQS.map((f, i) => (
                <details key={f.q} open={i === 0}>
                  <summary>
                    <span className="pv-qn">/ {String(i + 1).padStart(2, "0")}</span>
                    <span>{f.q}</span>
                    <span className="pv-qi" aria-hidden="true" />
                  </summary>
                  <p>{f.a}</p>
                </details>
              ))}
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
            <form className="pv-form" onSubmit={(e) => e.preventDefault()}>
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
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
