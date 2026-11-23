"use client";

import { useEffect, useRef, useState } from "react";

export type Quote = { n: string; before: string; after: string };

/* Six cards on a wide screen, three on a phone, so every quote still comes
   round on a phone (hiding cards four to six would leave some never shown). */
const WIDE = 6;
const NARROW = 3;
const HOLD_MS = 8000;

/**
 * THE MGT PATTERN (owner, 2026-11-23): a still grid whose words cross over,
 * one card after the next, so the section never goes blank. Every quote for a
 * slot sits in the same grid cell, so a card is as tall as its longest quote
 * and nothing below it jumps.
 *
 * THE TIMER IS THE BAR. The set advances when the progress bar's animation
 * ends, so pausing the bar (Pause, hover, keyboard focus, off screen) pauses
 * the change too, and the two can never disagree. Under reduced motion there
 * is no animation and so no advance: the set buttons change it by hand.
 *
 * The highlight is each quote's last sentence, the change the client saw,
 * marked behind the same type colour (body text stays one colour).
 */
export default function Testimonials({ quotes }: { quotes: Quote[] }) {
  const [per, setPer] = useState(WIDE);
  const [set, setSet] = useState(0);
  const [paused, setPaused] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => { setPer(mq.matches ? NARROW : WIDE); setSet(0); };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const sets = Math.max(1, Math.ceil(quotes.length / per));
  const slots = Array.from({ length: per }, (_, slot) => quotes.filter((_, i) => i % per === slot));
  const current = set % sets;

  return (
    <div ref={ref} className={`pv-tq pv-reveal${paused || !onScreen ? " is-held" : ""}`}>
      <div className="pv-tq__grid">
        {slots.map((list, slot) => (
          <figure key={slot} className="pv-tq__card">
            <span className="pv-tq__mark" aria-hidden="true">
              <svg viewBox="0 0 32 24" fill="currentColor"><path d="M0 24V13C0 6 4 1.5 12 0l1.5 3.5C9.5 5 7.5 7.5 7.5 11H13v13H0Zm18 0V13c0-7 4-11.5 12-13l1.5 3.5c-4 1.5-6 4-6 7.5H31v13H18Z" /></svg>
            </span>
            <div className="pv-tq__stack">
              {list.map((t, n) => {
                /* A slot with fewer quotes than there are sets holds its last one, so no card goes blank. */
                const on = n === Math.min(current, list.length - 1);
                return (
                  <div
                    key={t.n}
                    className={`pv-tq__q${on ? " is-on" : ""}`}
                    aria-hidden={!on || undefined}
                    inert={!on || undefined}
                    style={{ transitionDelay: on ? `${350 + slot * 60}ms` : `${slot * 60}ms` }}
                  >
                    <blockquote>
                      <p>&ldquo;{t.before}<mark className={`pv-tq__hl pv-tq__hl--${slot % 3}`}>{t.after}</mark>&rdquo;</p>
                    </blockquote>
                    <figcaption>
                      <span className="pv-tq__av" aria-hidden="true">{initials(t.n)}</span>
                      <b>{t.n}</b>
                    </figcaption>
                  </div>
                );
              })}
            </div>
          </figure>
        ))}
      </div>

      <div className="pv-tq__bar">
        {sets > 1 ? (
          <div className="pv-tq__sets">
            {Array.from({ length: sets }, (_, n) => (
              <button key={n} type="button" aria-label={`Show testimonials, set ${n + 1} of ${sets}`} aria-current={n === current || undefined} onClick={() => setSet(n)}>
                <span className="pv-tq__track">
                  {n === current ? (
                    <span key={`${current}-${per}`} className="pv-tq__fill" style={{ animationDuration: `${HOLD_MS}ms` }}
                      onAnimationEnd={() => setSet((v) => (v % sets + 1) % sets)} />
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        ) : null}
        {sets > 1 ? (
          <button type="button" className="pv-tq__pause" aria-pressed={paused} onClick={() => setPaused((v) => !v)}>
            {paused
              ? <><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" /></svg> Play</>
              : <><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" /></svg> Pause</>}
            <span className="sr-only"> the changing testimonials</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* Two letters from words that start with a letter or digit, as before. */
function initials(name: string) {
  const words = name.split(/\s+/).filter((w) => /^[\p{L}\p{N}]/u.test(w));
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
