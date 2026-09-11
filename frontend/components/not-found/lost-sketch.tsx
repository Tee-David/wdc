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
/* One stroke icon for the three buttons, drawn in the same hairline language as
   everything else on this page rather than pulled from an icon package: three
   glyphs do not justify a dependency, and these have to inherit the button's
   colour through every one of its states. `currentColor` does that for free. */
function Icon({ d }: { d: string }) {
  return (
    <svg
      className="nf__btnIc" viewBox="0 0 24 24" aria-hidden="true"
      fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

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

        {/* THE WAYS OUT, in the order someone lost actually wants them.
            Home is the widest and the loudest because it is the answer that is
            right most often; the other two are the same size as each other
            because neither is the obvious second choice. On a phone that
            ordering is the layout itself -- home takes the full width, the
            pair share the row under it -- and on a desktop the three sit on
            one line, where a full-width button would just be a long bar. */}
        <div className="nf__acts">
          <Link className="nf__btn nf__btn--home" href="/">
            <Icon d="M3 10.7 12 3.5l9 7.2M5.4 9.3V20a.8.8 0 0 0 .8.8h11.6a.8.8 0 0 0 .8-.8V9.3M9.7 20.8v-6.1h4.6v6.1" />
            Go Home
          </Link>
          <Link className="nf__btn nf__btn--work" href="/work">
            <Icon d="M3.5 5.6h7v5.6h-7zM13.5 5.6h7v9.1h-7zM3.5 14.1h7v4.3h-7zM13.5 17.6h7v.8h-7z" />
            See our works
          </Link>
          <Link className="nf__btn nf__btn--broke" href="/contact">
            <Icon d="M20.5 13.4a2.2 2.2 0 0 1-2.2 2.2H7.9L3.5 20V5.6a2.2 2.2 0 0 1 2.2-2.2h12.6a2.2 2.2 0 0 1 2.2 2.2zM12 6.9v3.6M12 13.1h.01" />
            Tell us what broke
          </Link>
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
