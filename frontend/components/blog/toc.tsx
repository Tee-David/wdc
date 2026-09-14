"use client";

import { useActiveHeading } from "@/components/ui/use-active-heading";

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
 * HOW IT KNOWS is `useActiveHeading`, which the legal rail and the case study
 * rail share -- one observer with one band rather than three copies of it. See
 * the note there for why it is an observer and not a scroll handler.
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
  const active = useActiveHeading(outline.map((h) => h.id));

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
