"use client";

import { useActiveHeading } from "@/components/ui/use-active-heading";

/**
 * The contents rail beside a case study.
 *
 * WHY IT IS ON THE RIGHT HERE AND ON THE LEFT ON THE BLOG. The prose column is
 * a measure -- 74ch -- and on a wide screen that leaves a column of nothing
 * beside it. On an article the rail is furniture you glance at before you
 * start, so it leads; on a case study the thing that has to lead is the work
 * itself, and the rail fills the space the measure was already leaving empty.
 * Same mechanism, same highlight, mirrored.
 *
 * IT IS FIRST IN THE DOM AND SECOND ON THE PAGE. On a phone there is no second
 * column, so the rail stacks -- and a contents list is only useful ABOVE the
 * thing it lists. Grid places it right on a wide screen without changing the
 * order a screen reader or a narrow viewport sees.
 *
 * THE HEADINGS ARE THE SECTIONS, and there are five or six of them rather than
 * an article's eight or ten. That is why there is no sub-level here: a case
 * study has one depth of heading and inventing a second would be a rail
 * describing a structure the page does not have.
 */
export default function WorkToc({
  outline,
}: {
  outline: { id: string; text: string }[];
}) {
  const active = useActiveHeading(outline.map((h) => h.id));

  return (
    <>
      <p className="wk-rail__k">On this page</p>
      {/* A <details> that cannot close on desktop, so one markup path serves
          both: collapsed above the work on a phone, always open beside it on a
          wide screen. The same shape the blog rail uses. */}
      <details className="wk-toc" open>
        <summary>On this page</summary>
        <ul className="wk-toc__list">
          {outline.map((h) => (
            <li key={h.id}>
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
