"use client";

import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import StrokeNumber from "@/components/ui/stroke-number";
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
 * unfinished drawing on it: the 404 draws in with the site's own pen, the last
 * stroke trails off the edge of the board, and the caption says the page was
 * never drawn. It is the same joke told in our own hand.
 *
 * WHAT IT REUSES rather than reinvents: StrokeNumber (real Space Grotesk
 * outlines, real advance widths) and the `sk-draw` keyframes every other drawn
 * element on the site runs on. A 404 built from its own one-off animation
 * would be a page that looks like a different website, which is the opposite
 * of what a 404 should do when someone has just got lost.
 *
 * It is a full page rather than a band, and it carries the header's logo and
 * three ways out, because the one thing this page has to do is not be a dead
 * end.
 */
export default function LostSketch() {
  return (
    <section className="nf">
      {/* The artboard grid. Faint enough to read as paper rather than as a
          pattern competing with the drawing on it. */}
      <div className="nf__grid" aria-hidden="true" />

      <header className="nf__bar">
        <Link href="/" aria-label="We Dig Creativity home">
          <Logo markClassName="nf__logoMark" />
        </Link>
        <span className="nf__meta">Error 404</span>
      </header>

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
          {/* The trailing stroke: the pen carrying on past the last numeral and
              off the edge of the board, which is what makes it read as
              unfinished rather than as a number in a box. */}
          <svg className="nf__trail" viewBox="0 0 240 60" fill="none" preserveAspectRatio="none">
            <path
              d="M2 44C36 44 52 12 86 12s44 34 78 34 42-26 72-26"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              pathLength={1}
            />
          </svg>
        </div>

        <div className="nf__acts">
          <Link className="nf__btn nf__btn--solid" href="/">Back to the start</Link>
          <Link className="nf__btn" href="/work">See the work</Link>
          <Link className="nf__btn" href="/contact">Tell us what broke</Link>
        </div>
      </main>

      <p className="nf__foot">
        ...brilliant simplicity <b>of thought!</b>
      </p>
    </section>
  );
}
