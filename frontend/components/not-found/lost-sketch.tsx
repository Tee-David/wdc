"use client";

import Link from "next/link";
import StrokeNumber from "@/components/ui/stroke-number";
import { WORK_CATEGORIES } from "@/lib/work";
import "./lost-sketch.css";

/**
 * The 404.
 *
 * THE CONCEPT. Litch Consulting's 404 is a market chart that rallies and then
 * crashes to the number, which works because a crashing line is what that
 * business looks at all day. Borrowing the chart would have been borrowing
 * their subject, not their idea. The idea is: say it in the thing you make.
 *
 * WDC makes marks. The studio's own logo is a pen nib, its process section is
 * drawn with a stroke that draws itself, and its numerals are Space Grotesk
 * outlines traced by the same animation. So this page is an artboard with one
 * unfinished drawing on it: the 404 draws itself in with the site's own pen
 * when the page arrives, and the caption says the page was never drawn. It is
 * the same joke told in our own hand.
 *
 * There used to be a stroke trailing off the right edge of the board, meant to
 * read as the pen carrying on. It did not: at that scale it read as a stray
 * rule sitting under the number, and it was the last looping animation left on
 * the site. The numeral drawing itself already says "unfinished" without it.
 *
 * WHAT IT REUSES rather than reinvents: StrokeNumber (real Space Grotesk
 * outlines, real advance widths) and the `sk-draw` keyframes every other drawn
 * element on the site runs on. A 404 built from its own one-off animation
 * would be a page that looks like a different website, which is the opposite
 * of what a 404 should do when someone has just got lost.
 *
 * THE ONE THING THIS PAGE HAS TO DO IS NOT BE A DEAD END, so it carries the
 * real header and the real footer rather than a bespoke bar with a logo in it.
 * Someone who has just got lost wants the actual navigation -- every section,
 * the contact link, the legal links -- not three buttons a designer guessed at.
 * The three buttons stay as well, because a guess made from the top three
 * destinations is still worth offering before someone has to read a menu, and
 * under them the six kinds of work are listed by name: the commonest reason to
 * land here is a stale link to a case study, and the category it lived in is
 * the nearest thing to what was being looked for.
 */
export default function LostSketch() {
  return (
    <section className="nf">
      {/* The artboard grid. Faint enough to read as paper rather than as a
          pattern competing with the drawing on it. */}
      <div className="nf__grid" aria-hidden="true" />

      <main className="nf__main">
        <p className="nf__eyebrow">
          404 <i aria-hidden="true">·</i> Nothing drawn here
        </p>

        <h1 className="nf__h">
          This page never made it <span>off the artboard</span>.
        </h1>

        <p className="nf__p">
          The address you followed does not point at anything we have built. It
          may have moved, or it may never have existed. Either way, the work is
          two clicks away.
        </p>

        {/* The drawing. `aria-hidden` because the heading above already says
            what it says, and a screen reader announcing "404" twice is noise;
            the number is also in StrokeNumber's own text node, which is why
            that one is hidden too rather than removed. */}
        <div className="nf__board" aria-hidden="true">
          <StrokeNumber className="nf__num" value="404" />
        </div>

        <div className="nf__acts">
          <Link className="nf__btn nf__btn--solid" href="/">Back to the start</Link>
          <Link className="nf__btn" href="/work">See the work</Link>
          <Link className="nf__btn" href="/contact">Tell us what broke</Link>
        </div>

        {/* Built from WORK_CATEGORIES rather than typed out, so a service added
            to lib/services.ts appears here too and this list cannot go stale
            while the rest of the site moves on. */}
        <nav className="nf__cats" aria-label="Kinds of work">
          <p className="nf__catsK">Or were you looking for</p>
          <ul>
            {WORK_CATEGORIES.map((c) => (
              <li key={c.slug}>
                <Link href={`/work/${c.slug}`}>{c.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>
    </section>
  );
}
