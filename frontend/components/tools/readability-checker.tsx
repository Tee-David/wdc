"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { advice, bandFor, score } from "@/lib/readability";

const SAMPLE =
  "We build websites, apps and software for Nigerian businesses. Tell us " +
  "what you need, and we will tell you plainly what it costs and how long " +
  "it takes.";

/**
 * The readability checker at /tools/readability.
 *
 * ANSWERS AS YOU TYPE, THE SAME PATTERN AS EVERY OTHER CALCULATOR HERE. There
 * is no submit button because there is nothing to send anywhere: the whole
 * score comes from `lib/readability.ts`, which runs on the words already in
 * the box.
 *
 * STARTS WITH REAL COPY, NOT A BLANK BOX. An empty textarea answers nothing
 * and looks broken before anyone has typed a word; the sample is our own
 * homepage copy, so the first thing a visitor sees is the tool proving itself
 * on a sentence we are willing to be judged by.
 */
export default function ReadabilityChecker() {
  const [text, setText] = useState(SAMPLE);
  const result = useMemo(() => score(text), [text]);
  const band = result ? bandFor(result.readingEase) : null;

  return (
    <div className="tl">
      <div className="tl__form">
        <label className="tl__label" htmlFor="rd-text">Paste or write your copy</label>
        <textarea
          id="rd-text"
          className="tl__input rd__area"
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-describedby="rd-hint"
        />
        <p className="tl__hint" id="rd-hint">
          A paragraph is enough; a whole page works too. Nothing here leaves your
          device.
        </p>
      </div>

      <div className="tl__out" aria-live="polite">
        {result && band ? (
          <>
            <div className="es__range">
              <p className="tl__stepK">Flesch Reading Ease</p>
              <p className="es__ngn rd__score">
                {Math.round(result.readingEase)}
                <i aria-hidden="true"> &middot; </i>
                <span className="rd__band">{band.label}</span>
              </p>
              <p className="es__usd">
                Reads at roughly Grade {Math.max(0, Math.round(result.gradeLevel))} level -- a US
                school grade is the unit this formula was built to answer in.
              </p>
              <p className="es__caveat">{advice(result)}</p>
            </div>

            <ul className="rd__stats">
              <li><b>{result.words}</b><span>words</span></li>
              <li><b>{result.sentences}</b><span>sentences</span></li>
              <li><b>{(result.words / result.sentences).toFixed(1)}</b><span>words a sentence</span></li>
              <li><b>{(result.syllables / result.words).toFixed(2)}</b><span>syllables a word</span></li>
            </ul>
          </>
        ) : (
          <p className="tl__hint">Write or paste something above to see the score.</p>
        )}

        <div className="es__assume">
          <h3 className="es__h">What moves the number</h3>
          <ul className="es__bullets">
            <li>
              <b>Sentence length, more than word choice.</b> Splitting one 30-word
              sentence into two usually moves the score more than swapping a few
              words for simpler ones.
            </li>
            <li>
              <b>It counts syllables, not meaning.</b> A short jargon word and a
              long plain one can score the same; read the advice line, not just
              the number.
            </li>
            <li>
              <b>There is no single right target.</b> A landing page usually wants
              Standard or easier; a technical page for a specialist audience is
              allowed to sit lower.
            </li>
          </ul>
        </div>

        <div className="tl__step">
          <p className="tl__stepK">Worth saying plainly</p>
          <h3>This scores sentences, not whether the copy sells</h3>
          <p>
            Short and simple is not automatically good copy, and a low score is
            not automatically bad -- some of the most persuasive writing uses
            longer, more considered sentences on purpose. This is one input to a
            copywriting decision, not the decision itself.
          </p>
          <div className="tl__stepActs">
            <Link className="pv-btn pv-btn--accent" href="/contact">
              Talk about your copy
            </Link>
            <Link className="pv-btn pv-btn--light" href="/services/seo">
              See our SEO & content work
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
