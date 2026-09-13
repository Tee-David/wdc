"use client";

import { useEffect, useState } from "react";

/**
 * The contents rail beside an article.
 *
 * WHY THIS IS A COMPONENT AND NOT THE STATIC LIST IT REPLACES. The markup here
 * was a plain server-rendered `<ul>`: the links worked, but nothing ever said
 * WHERE THE READER WAS. On a long post the rail listed eight headings and
 * highlighted none of them, so it answered "what is in this page" and never
 * "which part am I reading". The legal pages have had the answer since they
 * shipped -- `components/legal/legal-toc.tsx` -- and this is deliberately the
 * same mechanism rather than a second one invented for the blog.
 *
 * WHY AN OBSERVER AND NOT A SCROLL HANDLER. Scroll position alone cannot tell
 * you which heading is current without measuring every section on every frame,
 * which is exactly the per-frame layout read the project's conventions forbid.
 * IntersectionObserver is told once where the headings are and reports back
 * only when one crosses the band.
 *
 * The band is the same one the legal rail uses: `-30% 0px -55% 0px` leaves a
 * strip across the upper middle of the viewport, so the heading that lights up
 * is the one being READ rather than the one that has just appeared at the
 * bottom of the screen.
 *
 * The `<details>` wrapper is kept exactly as it was. On a phone eight links are
 * a wall between the reader and the first sentence, so the rail collapses
 * there; the highlight is a desktop affordance and costs a phone nothing,
 * because the observer is cheap and the list is closed anyway.
 */
export default function BlogToc({
  outline,
}: {
  outline: { id: string; text: string; sub?: boolean }[];
}) {
  const [active, setActive] = useState("");

  useEffect(() => {
    const els = outline
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        /* The topmost heading currently inside the band. Taking the first
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
  }, [outline]);

  return (
    <>
      <p className="bl-rail__k bl-rail__k--toc">On this page</p>
      <details className="bl-toc" open>
        <summary>On this page</summary>
        <ul className="bl-toc__list">
          {outline.map((h) => (
            <li key={h.id} className={h.sub ? "is-sub" : undefined}>
              <a
                href={`#${h.id}`}
                className={active === h.id ? "is-on" : undefined}
                /* The highlight is a visual convenience; `aria-current` is what
                   says the same thing to a screen reader, which cannot see it. */
                aria-current={active === h.id ? "true" : undefined}
              >
                {h.text}
              </a>
            </li>
          ))}
        </ul>
      </details>
    </>
  );
}
