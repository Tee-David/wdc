"use client";

import { useRef, useState } from "react";
import { ENQUIRY_TOPICS } from "@/lib/contact";
import { CONTACT_EMAIL } from "@/lib/site";

/**
 * The enquiry form.
 *
 * WHERE IT SENDS, AND WHY. There is no backend on this site and no mail
 * credentials, so there are two honest options and one dishonest one. The
 * dishonest one is what was here before: `onSubmit={(e) => e.preventDefault()}`
 * on the homepage — a form that accepts a message, shows nothing, and drops it.
 * Every enquiry typed into it was lost, silently.
 *
 * So this composes the message and hands it to the visitor's mail client with
 * everything already filled in. It works today, with no infrastructure, and
 * nothing is ever swallowed. The button says what will happen before it
 * happens, and the address is shown in full beside the form for anyone who
 * would rather copy it.
 *
 * TO SWAP IN A REAL ENDPOINT: replace the body of `send` with a fetch to it.
 * The validation, the states and the markup do not change.
 */
export function ContactForm() {
  const [tried, setTried] = useState(false);
  const [sent, setSent] = useState(false);
  const form = useRef<HTMLFormElement | null>(null);

  const send = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const el = e.currentTarget;
    // Let the browser do the validating; `is-tried` only turns the styling on
    // AFTER a first attempt, so an untouched required field is never painted
    // red before anyone has typed in it.
    setTried(true);
    if (!el.reportValidity()) return;

    const d = new FormData(el);
    const g = (k: string) => String(d.get(k) ?? "").trim();
    const name = [g("first"), g("last")].filter(Boolean).join(" ");

    const body = [
      `Name: ${name}`,
      `Email: ${g("email")}`,
      g("phone") ? `Phone: ${g("phone")}` : null,
      `About: ${g("topic")}`,
      "",
      g("message"),
    ].filter((l) => l !== null).join("\n");

    window.location.href =
      `mailto:${CONTACT_EMAIL}` +
      `?subject=${encodeURIComponent(`Enquiry — ${g("topic")}`)}` +
      `&body=${encodeURIComponent(body)}`;

    setSent(true);
  };

  return (
    <form
      ref={form}
      className={`ct-form${tried ? " is-tried" : ""}`}
      onSubmit={send}
      noValidate
    >
      <div className="ct-row ct-row--2">
        <div className="ct-f">
          <label htmlFor="ct-first">First name <b aria-hidden="true">*</b></label>
          <input id="ct-first" name="first" type="text" autoComplete="given-name"
                 placeholder="Your first name" required />
        </div>
        <div className="ct-f">
          <label htmlFor="ct-last">Last name <b aria-hidden="true">*</b></label>
          <input id="ct-last" name="last" type="text" autoComplete="family-name"
                 placeholder="Your last name" required />
        </div>
      </div>

      <div className="ct-f">
        <label htmlFor="ct-email">Work email <b aria-hidden="true">*</b></label>
        <input id="ct-email" name="email" type="email" autoComplete="email"
               placeholder="you@business.com" required />
      </div>

      <div className="ct-row ct-row--2">
        <div className="ct-f">
          {/* Optional, and labelled so. Requiring a number for a reply that
              goes by email is a field that only costs submissions. */}
          <label htmlFor="ct-phone">Phone <i>(optional)</i></label>
          <input id="ct-phone" name="phone" type="tel" autoComplete="tel"
                 placeholder="+234 …" />
        </div>
        <div className="ct-f">
          <label htmlFor="ct-topic">What is it about?</label>
          <select id="ct-topic" name="topic" defaultValue={ENQUIRY_TOPICS[0]}>
            {ENQUIRY_TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="ct-f">
        <label htmlFor="ct-msg">Message <b aria-hidden="true">*</b></label>
        <textarea id="ct-msg" name="message" required
                  placeholder="What are you trying to achieve? Tell us the outcome you want rather than the features you think you need." />
      </div>

      <button className="pv-btn pv-btn--accent" type="submit">
        {sent ? "Opened in your mail app" : "Send the details"}
      </button>

      {/* Says what the button does BEFORE it does it. A submit that quietly
          launches a mail client is a surprise; one that says so is a choice. */}
      <p className="ct-note" aria-live="polite">
        {sent ? (
          <>
            Your mail app should have opened with everything filled in. If nothing
            happened, write to{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--accent-ink)", textDecoration: "underline", textUnderlineOffset: ".18em" }}>
              {CONTACT_EMAIL}
            </a>{" "}
            directly.
          </>
        ) : (
          <>This opens your mail app with the message ready to send, so nothing is
          lost on the way to us.</>
        )}
      </p>
    </form>
  );
}

export default ContactForm;
