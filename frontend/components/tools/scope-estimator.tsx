"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, Loader2, Printer, RotateCcw, Send } from "lucide-react";
import {
  QUESTIONS, RATE_CARD, estimate, isComplete, shortDollars, shortNaira,
  type Answers,
} from "@/lib/estimate";

/**
 * The scope and budget estimator at /tools/estimate.
 *
 * THE ORDER OF EVENTS IS THE WHOLE DESIGN, and it is the one thing in here
 * that is not negotiable: eight questions, then the number, THEN the offer to
 * send it. The checklist says the estimate appears before any email ask, and
 * the reason is not politeness. A tool that holds the answer hostage for an
 * address is a lead-capture form wearing a calculator's clothes, and every
 * visitor who has met one recognises it in about two seconds. Give the number
 * away and the email is worth having, because the person typing it has already
 * decided the number is worth keeping.
 *
 * NOTHING LEAVES THE BROWSER UNTIL THEY ASK. `lib/estimate.ts` is pure, so all
 * eight answers and the arithmetic stay on the device. The only request this
 * component can make is the one the reader presses "email it to me" for.
 *
 * ONE QUESTION AT A TIME WAS TRIED AND PUT BACK. A wizard hides how much is
 * left, which is the reason people abandon them; eight small cards in a column
 * show the whole ask at a glance and let somebody who knows their project
 * answer it in twenty seconds by tapping down the page.
 */

/* A radio group per question, so a keyboard gets arrow keys and a screen
   reader is told what has been chosen. Buttons with aria-checked, the same
   pattern the name checker's entity cards use, because a real <input
   type=radio> cannot be styled into a card without a wrapper anyway. */
export default function ScopeEstimator() {
  const [answers, setAnswers] = useState<Answers>({});
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);

  const result = useMemo(() => estimate(answers), [answers]);
  const done = isComplete(answers);
  const answered = QUESTIONS.filter((q) => answers[q.key]).length;

  /* THE ANSWER IS BROUGHT TO THE READER, ONCE.
     The eighth question is at the bottom of a long form and the range appears
     at the TOP of the column beside it, which on a desktop is a screen and a
     half above the tap that produced it -- the same fault `.tl--split` was
     built to fix for the short checkers, reappearing because this form is
     eight questions rather than one field. So the page moves to the figure the
     moment the set is complete.
     ONLY ON THE TRANSITION. Re-scrolling every time somebody changes an answer
     would drag the page out from under the question they are editing, which is
     worse than the problem. `settled` records that it has been done, and it is
     put back when the form is reset. */
  const settled = useRef(false);
  useEffect(() => {
    if (!done) { settled.current = false; return; }
    if (settled.current) return;
    settled.current = true;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [done]);

  const pick = (question: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [question]: option }));
    /* A changed answer invalidates a sent copy rather than leaving "sent"
       under a figure that is no longer the one they sent. */
    setSent(false);
    setError("");
  };

  const reset = () => {
    setAnswers({});
    setSent(false);
    setError("");
    setEmail("");
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!result || !email.trim()) return;
    setSending(true);
    setError("");
    try {
      /* THE ANSWERS GO, NOT THE FIGURES. The route recomputes the estimate
         from `lib/estimate.ts` on its own side, so a posted total cannot put a
         number we never produced into an email with our name on it. */
      const response = await fetch("/api/tools/estimate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, answers }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.error ?? "We could not send that just now.");
        return;
      }
      setSent(true);
    } catch {
      setError("We could not reach us just now. Your estimate is still on this page.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`tl${result ? " tl--split" : ""}`}>
      <form className="tl__form es__form" onSubmit={(e) => e.preventDefault()}>
        {QUESTIONS.map((question) => (
          <fieldset className="tl__kinds es__q" key={question.key}>
            <legend className="tl__label">{question.label}</legend>
            {question.hint && <p className="tl__hint es__qhint">{question.hint}</p>}
            <div className="es__opts" role="radiogroup" aria-label={question.label}>
              {question.options.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  role="radio"
                  aria-checked={answers[question.key] === option.key}
                  className={`es__opt${answers[question.key] === option.key ? " is-on" : ""}`}
                  onClick={() => pick(question.key, option.key)}
                >
                  <span className="es__optT">{option.label}</span>
                  {option.note && <span className="es__optN">{option.note}</span>}
                </button>
              ))}
            </div>
          </fieldset>
        ))}

        {!done && (
          /* THE COUNT, NOT A PROGRESS BAR. A bar animating towards a number
             nobody asked for is decoration; "three of eight" is the fact, and
             it is the fact that decides whether somebody keeps going. */
          <p className="tl__hint es__count" aria-live="polite">
            {answered} of {QUESTIONS.length} answered. The range appears as soon as
            the last one is.
          </p>
        )}
      </form>

      {/* `aria-live` so the figure is announced when it arrives, because a
          reader who cannot see it appear has no other way to know the form is
          finished doing its job. */}
      <div className="tl__out" ref={resultRef} aria-live="polite">
        {result && (
          <>
            <div className="es__range">
              <p className="tl__stepK">Indicative range</p>
              <p className="es__ngn">
                {shortNaira(result.ngn.low)} <i aria-hidden="true">to</i>{" "}
                {shortNaira(result.ngn.high)}
              </p>
              <p className="es__usd">
                {shortDollars(result.usd.low)} to {shortDollars(result.usd.high)}, at the
                rate we reviewed in {RATE_CARD.reviewed}
              </p>
              {/* SAID ONCE, PLAINLY, WHERE THE NUMBER IS. A range like this
                  gets screenshotted and sent to somebody who will never see
                  the rest of the page, so the sentence that stops it being
                  read as a quote has to travel with it. */}
              <p className="es__caveat">
                A range, not a quote. It is what work of this shape usually costs us
                to do properly; the real figure comes from one conversation about
                what you actually need.
              </p>
            </div>

            <div className="es__phases">
              <h3 className="es__h">Where it goes</h3>
              <ul className="es__list">
                {result.phases.map((phase) => (
                  <li key={phase.key}>
                    <span className="es__pT">{phase.label}</span>
                    <span className="es__pM">
                      {shortNaira(phase.ngn.low)}–{shortNaira(phase.ngn.high)}
                    </span>
                    <span className="es__pB">{phase.blurb}</span>
                  </li>
                ))}
              </ul>
              <p className="tl__note">
                About {result.days} days of the team&rsquo;s time, which is the honest
                answer to &ldquo;how long&rdquo;. Calendar time is longer, because your
                review and ours both take days that nobody is building on.
              </p>
            </div>

            <div className="es__assume">
              <h3 className="es__h">What this assumes</h3>
              <ul className="es__bullets">
                {result.assumptions.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>

            {/* THE ASK, AFTER THE ANSWER. Two ways to keep it, and the free one
                is first: the print button costs the reader nothing and asks
                for nothing, which is the whole reason they will trust the
                second one enough to use it. */}
            <div className="tl__step es__keep">
              <p className="tl__stepK">Keep it</p>
              <h3>Take this with you</h3>
              <p>
                Print or save it as a PDF right now, or we will email it to you with
                the answers you gave, so the next conversation starts from the same
                page.
              </p>

              <div className="tl__stepActs">
                <button type="button" className="pv-btn pv-btn--light" onClick={() => window.print()}>
                  <Printer aria-hidden="true" /> Print or save as PDF
                </button>
                <button type="button" className="tl__again" onClick={reset}>
                  <RotateCcw aria-hidden="true" /> Start again
                </button>
              </div>

              {sent ? (
                <p className="es__sent" role="status">
                  <Check aria-hidden="true" /> Sent. It is on its way to {email}.
                </p>
              ) : (
                <form className="es__mail" onSubmit={send}>
                  <label className="tl__label" htmlFor="es-email">
                    Email it to me
                  </label>
                  <div className="tl__row">
                    <input
                      id="es-email"
                      className="tl__input"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="you@yourbusiness.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(""); }}
                      aria-describedby="es-mail-hint"
                    />
                    <button className="tl__go" type="submit" disabled={sending || !email.trim()}>
                      {sending
                        ? <><Loader2 className="tl__spin" aria-hidden="true" /> Sending</>
                        : <><Send aria-hidden="true" /> Send it</>}
                    </button>
                  </div>
                  <p className="tl__hint" id="es-mail-hint">
                    One email with this estimate in it. We do not add you to anything,
                    and you already have the number either way.
                  </p>
                </form>
              )}

              {error && <p className="tl__err" role="alert">{error}</p>}

              <p className="tl__stepAlt">
                Rather talk it through? <Link href="/contact">Tell us about the project</Link>.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
