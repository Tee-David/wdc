"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * The contents rail beside a legal document.
 *
 * A privacy policy is read by someone looking for one thing: what you do with
 * their data, or how to get it deleted. The rail is how they find it without
 * reading nine sections to get there, and the highlight tells them where they
 * are once they have jumped.
 *
 * WHY AN OBSERVER AND NOT A SCROLL HANDLER. Scroll position alone cannot tell
 * you which heading is current without measuring every section on every frame.
 * IntersectionObserver is told once where the sections are and reports back
 * only when one crosses the band, which is both cheaper and correct while the
 * page is still settling.
 *
 * The band is deliberately narrow and set high: `-30% 0px -55% 0px` leaves a
 * strip across the upper middle of the viewport, so the heading that lights up
 * is the one being READ rather than the one that has just appeared at the very
 * bottom of the screen.
 */
export default function LegalToc({
  sections,
  others,
}: {
  sections: { id: string; heading: string }[];
  others: { slug: string; title: string }[];
}) {
  const [active, setActive] = useState("");

  useEffect(() => {
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        /* The topmost section currently inside the band. Taking the first
           intersecting entry in DOM order rather than the last event keeps the
           highlight stable when two short sections are both in view. */
        const inBand = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (inBand) setActive(inBand.target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 1] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sections]);

  return (
    <nav className="lg-toc" aria-label="On this page">
      <p className="lg-toc__k">On this page</p>
      <ul className="lg-toc__list">
        {sections.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className={active === s.id ? "is-on" : undefined}
              /* The highlight is a visual convenience; `aria-current` is what
                 says the same thing to a screen reader, which cannot see it. */
              aria-current={active === s.id ? "true" : undefined}
            >
              {s.heading}
            </a>
          </li>
        ))}
      </ul>

      <p className="lg-toc__k lg-toc__k--2">Other documents</p>
      <div className="lg-toc__others">
        {others.map((d) => (
          <Link key={d.slug} href={`/legal/${d.slug}`}>{d.title}</Link>
        ))}
      </div>
    </nav>
  );
}
