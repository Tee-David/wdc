"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2, Printer, RotateCcw, Send } from "lucide-react";
import {
  QUESTIONS, RATE_CARD, estimate, shortDollars, shortNaira,
  type Answers, type Option,
} from "@/lib/estimate";
import OptionSelect from "@/components/tools/option-select";

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
 * ONE QUESTION AT A TIME, REVISITED. An earlier version tried this and put it
 * back, on the theory that a wizard hides how much is left and that is how
 * people abandon them. What that version was missing was the wizard's own
 * answer to its own objection: a progress bar and a running "question 3 of 8"
 * tell a reader exactly how much is left, the same way the onboarding form
 * already does for a longer set of questions than this one. Eight cards in a
 * column is a wall of text to scan before answering any of it; one question,
 * full width, with the previous and next ones out of sight, is what the
 * conversational form pattern gets right and is what was asked for here.
 *
 * CHOOSING AN ANSWER IS THE ONLY ACTION. There is no separate "Next" to press:
 * picking a card both answers the question and turns the page, after a short
 * pause so the choice is seen before the page moves. A keyboard visitor gets
 * the same thing for free, because Enter and Space already "click" a focused
 * button; nothing here has to intercept the key to fake it. Every step keeps a
 * Back arrow, and the result screen keeps a way to reopen the answers, so the
 * one-way door a wizard usually is never actually is one here.
 */

/* Each question is a single dropdown, not a stack of full-width cards: five
   options used to mean five boxes to scroll past before the question could
   be answered at all, on a step that already asks for nothing else on
   screen. OptionSelect is the same searchable-select shell the contact
   form's own fields open (components/onboarding/picker.tsx), so a reader who
   has met it there meets it again here rather than a second control that
   looks close but not quite the same. */
export default function ScopeEstimator() {
  const [answers, setAnswers] = useState<Answers>({});
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);
  const advanceTimer = useRef<number | undefined>(undefined);

  const question = QUESTIONS[index];
  const result = useMemo(() => estimate(answers), [answers]);

  const clearAdvanceTimer = () => {
    window.clearTimeout(advanceTimer.current);
    advanceTimer.current = undefined;
  };
  useEffect(() => clearAdvanceTimer, []);

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
    if (!revealed) { settled.current = false; return; }
    if (settled.current) return;
    settled.current = true;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [revealed]);

  /* Picking a card sets the answer and, after a short pause long enough to see
     what was chosen, moves on. The pause is skipped under reduced motion,
     which is not a courtesy to animation -- it is the faster path for a reader
     who has already said they do not want to wait for one. */
  const choose = (option: Option) => {
    setAnswers((prev) => ({ ...prev, [question.key]: option.key }));
    setSent(false);
    setError("");
    clearAdvanceTimer();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const atLast = index === QUESTIONS.length - 1;
    advanceTimer.current = window.setTimeout(() => {
      if (atLast) setRevealed(true);
      else setIndex((i) => i + 1);
    }, reduce ? 0 : 380);
  };

  const back = () => {
    clearAdvanceTimer();
    if (revealed) { setRevealed(false); return; }
    setIndex((i) => Math.max(0, i - 1));
  };

  /* Reopens the last question without touching what was already answered, for
     a reader who wants to change one thing rather than start over. */
  const editAnswers = () => {
    clearAdvanceTimer();
    settled.current = false;
    setRevealed(false);
    setIndex(QUESTIONS.length - 1);
  };

  const reset = () => {
    clearAdvanceTimer();
    setAnswers({});
    setIndex(0);
    setRevealed(false);
    settled.current = false;
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

  const progress = Math.round((index / QUESTIONS.length) * 100);

  return (
    <div className="tl">
      <form className="tl__form es__form" onSubmit={(e) => e.preventDefault()}>
        {!revealed && (
          <div className="es__wiz">
            <div className="es__wizTop">
              <div
                className="es__prog"
                role="progressbar"
                aria-label="Estimator progress"
                aria-valuemin={0}
                aria-valuemax={QUESTIONS.length}
                aria-valuenow={index + 1}
              >
                <span style={{ width: `${progress}%` }} />
              </div>
              <p className="tl__hint es__count" aria-live="polite">
                Question {index + 1} of {QUESTIONS.length}
              </p>
            </div>

            <div className="es__q" key={question.key}>
              <label className="tl__label es__stepLabel" htmlFor={`es-q-${question.key}`}>
                {question.label}
              </label>
              {question.hint && (
                <p className="tl__hint es__qhint" id={`es-q-${question.key}-hint`}>
                  {question.hint}
                </p>
              )}
              <div className="es__stepSelect">
                <OptionSelect
                  id={`es-q-${question.key}`}
                  options={question.options}
                  value={answers[question.key] ?? ""}
                  onChange={choose}
                  describedBy={question.hint ? `es-q-${question.key}-hint` : undefined}
                />
              </div>
              <p className="tl__hint es__advanceHint">
                Choosing an answer moves you to the next question.
              </p>
            </div>

            {index > 0 && (
              <button type="button" className="tl__again es__back" onClick={back}>
                <ArrowLeft aria-hidden="true" /> Back
              </button>
            )}
          </div>
        )}
      </form>

      {/* `aria-live` so the figure is announced when it arrives, because a
          reader who cannot see it appear has no other way to know the form is
          finished doing its job. */}
      <div className="tl__out" ref={resultRef} aria-live="polite">
        {revealed && result && (
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
              <p className="tl__stepAlt">
                Not quite right? <button type="button" onClick={editAnswers}>Change an answer</button>.
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
