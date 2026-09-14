"use client";

import Link from "next/link";
import { useActiveHeading } from "@/components/ui/use-active-heading";

/**
 * The contents rail beside a legal document.
 *
 * A privacy policy is read by someone looking for one thing: what you do with
 * their data, or how to get it deleted. The rail is how they find it without
 * reading nine sections to get there, and the highlight tells them where they
 * are once they have jumped.
 *
 * HOW IT KNOWS is `useActiveHeading`, which this rail wrote first and the blog
 * and case study rails now share -- one observer with one band rather than
 * three copies of it. See the note there.
 */
export default function LegalToc({
  sections,
  others,
}: {
  sections: { id: string; heading: string }[];
  others: { slug: string; title: string }[];
}) {
  const active = useActiveHeading(sections.map((s) => s.id));

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
