"use client";

import { useEffect, useState } from "react";
import { TESTIMONIALS } from "@/lib/testimonials";

/**
 * The words on the brand side of the sign-in page.
 *
 * REAL CLIENTS, ATTRIBUTED THE WAY lib/testimonials.ts INSISTS. The reference
 * design puts a person's name and job title under the quote. We do not have
 * those: these were given as the organisation's words, and the file that holds
 * them says in as many words that inventing "Founder" to fill a line would put
 * a fabricated endorsement back in a smaller font. So the second line is the
 * client, which is a fact, and there is no third.
 *
 * The shortest three, because this is a column beside a form and a long quote
 * would push the dots off a laptop screen.
 */
const QUOTES = [...TESTIMONIALS]
  .sort((a, b) => a.text.length - b.text.length)
  .slice(0, 3);

const EVERY = 7000;

export default function AuthQuote() {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (QUOTES.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let timer = 0;
    const tick = () => setI((n) => (n + 1) % QUOTES.length);
    const start = () => { timer = window.setInterval(tick, EVERY); };
    const stop = () => { window.clearInterval(timer); timer = 0; };

    /* A timer running against a tab nobody is looking at is work done for
       nothing, and on a phone it is battery. Same rule the stage demos follow. */
    const visibility = () => (document.hidden ? stop() : start());
    start();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  const quote = QUOTES[i];
  if (!quote) return null;

  return (
    <div className="au__quote">
      {/* `aria-live` off on purpose: a screen reader does not need to be
          interrupted every seven seconds by decorative marketing copy while
          someone is trying to type a password. */}
      <blockquote key={quote.slug}>
        <p>&ldquo;{quote.text}&rdquo;</p>
        <footer>{quote.client}</footer>
      </blockquote>

      {QUOTES.length > 1 ? (
        <div className="au__dots" role="tablist" aria-label="Client quotes">
          {QUOTES.map((q, n) => (
            <button
              key={q.slug}
              type="button"
              role="tab"
              className={`au__dot${n === i ? " is-on" : ""}`}
              aria-selected={n === i}
              aria-label={`Quote from ${q.client}`}
              onClick={() => setI(n)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
