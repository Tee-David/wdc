"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Plus, X } from "lucide-react";
import ServiceIcon from "@/components/ui/service-icon";
import { PAIRS } from "@/lib/service-pairs";
import type { ServiceSlug } from "@/lib/services";
import "./services-builder.css";

export type BuilderItem = {
  slug: ServiceSlug;
  name: string;
  short: string;
  lede: string;
  icon: string;
  chips: string[];
  workHref: string | null;
  workCount: number;
};

/**
 * THE PACKAGE BUILDER. The six services are cards you tick, and the page builds
 * the package beside them: what is in it, what usually goes with it, and one
 * button that carries the choice to /start. Each card is a real checkbox, so it
 * works with a keyboard and a screen reader, and keeps real links to its own
 * page and its work, so nothing here hides a crawlable URL. On a phone the
 * package is a bar along the bottom instead of a column, and it steps aside
 * when the element with id `svb-end` (the closing section) scrolls into view.
 */
export function ServicesBuilder({ items }: { items: BuilderItem[] }) {
  const [picked, setPicked] = useState<ServiceSlug[]>([]);
  const [said, setSaid] = useState("");
  const by = (s: ServiceSlug) => items.find((i) => i.slug === s)!;
  const [barHidden, setBarHidden] = useState(false);

  useEffect(() => {
    const el = document.getElementById("svb-end");
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setBarHidden(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const toggle = (s: ServiceSlug, on?: boolean) => {
    const next = on ?? !picked.includes(s);
    setPicked((p) => (next ? (p.includes(s) ? p : [...p, s]) : p.filter((x) => x !== s)));
    setSaid(`${by(s).short} ${next ? "added to" : "removed from"} your package.`);
  };

  const suggestions = [...new Set(picked.flatMap((s) => PAIRS[s]))].filter((s) => !picked.includes(s)).slice(0, 3);
  const href = picked.length ? `/start?services=${picked.join(",")}` : "/start";
  const cta = picked.length ? `Start with ${picked.length === 1 ? "this" : "these"} (${picked.length})` : "Start a project";

  return (
    <div className="svb">
      <div className="svb__grid" role="group" aria-label="Services to put in your package">
        {items.map((s) => {
          const on = picked.includes(s.slug);
          return (
            <article key={s.slug} className={`svb-card${on ? " is-on" : ""}`}>
              <input
                id={`svb-${s.slug}`} className="svb-card__in" type="checkbox" checked={on}
                onChange={() => toggle(s.slug)} aria-describedby={`svb-${s.slug}-d`}
              />
              <label htmlFor={`svb-${s.slug}`} className="svb-card__face">
                <span className="svb-card__top">
                  <span className="svb-card__ic" aria-hidden="true"><ServiceIcon name={s.icon} size={24} /></span>
                  <span className="svb-card__tick" aria-hidden="true"><Check size={16} strokeWidth={3} /></span>
                </span>
                <span className="svb-card__t">{s.name}</span>
                <span className="svb-card__d" id={`svb-${s.slug}-d`}>{s.lede}</span>
                <span className="svb-card__chips" aria-hidden="true">
                  {s.chips.map((c) => <i key={c}>{c}</i>)}
                </span>
                <span className="svb-card__state">{on ? "In your package" : "Add to package"}</span>
              </label>
              <div className="svb-card__links">
                <Link href={`/services/${s.slug}`} aria-label={`What's included in ${s.name}`}>What&rsquo;s included</Link>
                {s.workHref && s.workCount > 0 ? <Link href={s.workHref}>See the work ({s.workCount})</Link> : null}
              </div>
            </article>
          );
        })}
      </div>

      <aside className="svb-pack" aria-label="Your package">
        <div className="svb-pack__head">
          <h2>Your package</h2>
          <span className="svb-stack" aria-hidden="true">
            {picked.map((s) => (
              <span key={s} className="svb-stack__i"><ServiceIcon name={by(s).icon} size={18} /></span>
            ))}
          </span>
        </div>
        {picked.length ? (
          <ul className="svb-pack__list">
            {picked.map((s) => (
              <li key={s}>
                <div>
                  <b>{by(s).short}</b>
                  <span>{by(s).chips.slice(0, 3).join(", ")}</span>
                </div>
                <button type="button" className="svb-x" onClick={() => toggle(s, false)} aria-label={`Remove ${by(s).short}`}>
                  <X size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="svb-pack__empty">Tick what you need and it builds here. Not sure? Start anyway and describe the problem, we will say which fits.</p>
        )}
        {suggestions.length ? (
          <div className="svb-pack__more">
            <span>Often paired with it</span>
            <div>
              {suggestions.map((s) => (
                <button key={s} type="button" className="svb-add" onClick={() => toggle(s, true)}>
                  <Plus size={14} aria-hidden="true" /> {by(s).short}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <Link className="pv-btn pv-btn--accent svb-pack__cta" href={href}>{cta}</Link>
        <p className="svb-pack__fine">No commitment. We reply the same working day.</p>
        <p className="svb-sr" role="status" aria-live="polite">{said}</p>
      </aside>

      {/* The phone's version of the package: one bar, always in reach. */}
      <div className={`svb-bar${picked.length && !barHidden ? " is-on" : ""}`} aria-hidden={!picked.length || barHidden}>
        <span className="svb-stack" aria-hidden="true">
          {picked.map((s) => <span key={s} className="svb-stack__i"><ServiceIcon name={by(s).icon} size={18} /></span>)}
        </span>
        <Link className="pv-btn pv-btn--accent" href={href} tabIndex={picked.length && !barHidden ? 0 : -1}>{cta}</Link>
      </div>
    </div>
  );
}
