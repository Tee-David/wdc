"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import SelectField from "@/components/onboarding/select-field";
import { ENQUIRY_TOPICS } from "@/lib/contact";
import { CONTACT_EMAIL } from "@/lib/site";


const PhoneField = dynamic(() => import("@/components/onboarding/phone-field"), {
  ssr: false,
  /* Same height as the field it becomes, so the row does not jump when the
     picker arrives. */
  loading: () => <div className="ct-phone-ph" aria-hidden="true" />,
});

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
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  /* The number in international form. `PhoneField` is controlled, and the form
     is read with `FormData`, so the value rides along in a hidden input rather
     than the picker having to know about form names. */
  const [phone, setPhone] = useState("");
  /* The subject, held here for the same reason as the phone number: the picker
     below is our own control rather than a native `<select>`, so the value
     rides to `FormData` in a hidden input. */
  const [topic, setTopic] = useState<string>(ENQUIRY_TOPICS[0]);
  const form = useRef<HTMLFormElement | null>(null);

  const send = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const el = e.currentTarget;
    // Let the browser do the validating; `is-tried` only turns the styling on
    // AFTER a first attempt, so an untouched required field is never painted
    // red before anyone has typed in it.
    setTried(true);
    if (!el.reportValidity()) return;

    const d = new FormData(el);
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(d.entries())),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to send your message.");
      setSent(true);
      el.reset();
      /* `reset()` only reaches the native fields. The two controls that hold
         their value in React state -- the phone picker and the subject -- have
         to be put back by hand, or a sent form keeps showing the last
         enquiry's number and topic. */
      setPhone("");
      setTopic(ENQUIRY_TOPICS[0]);
      setTried(false);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Unable to send your message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <form
      ref={form}
      className={`ct-form${tried ? " is-tried" : ""}`}
      onSubmit={send}
      noValidate
    >
      <label className="ct-trap" aria-hidden="true">
        Company website
        <input name="company" type="text" tabIndex={-1} autoComplete="off" />
      </label>
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

      {/* A ROW EACH, NOT A PAIR. The phone control is a composite -- country
          button, dial code and number sharing one bar -- and its natural width
          is wider than half of this card, so beside the topic select it ran
          over the top of it. It gets the full width, and the select takes the
          line under it. */}
      <div className="ct-f">
        {/* Optional, and labelled so. Requiring a number for a reply that
            goes by email is a field that only costs submissions. */}
        <label htmlFor="ct-phone">Phone <i>(optional)</i></label>
        {/* THE SAME PICKER ONBOARDING USES, NOT A SECOND ONE. A bare `+234 …`
            placeholder asks a visitor to know and type their own dial code,
            and quietly assumes Nigeria for everyone who does not. The dial
            codes are already generated by `scripts/gen-dial-codes.mjs` and
            already driven by `components/onboarding/phone-field.tsx`, so this
            reuses that rather than growing a second control to maintain.

            `ssr: false` because the component reads a detached canvas during
            its first render to work out whether the platform can draw flag
            emoji, which has no meaning on a server. It also keeps the
            phone-number library off this page until the field is reached. */}
        <PhoneField id="ct-phone" value={phone} onChange={setPhone} />
        <input type="hidden" name="phone" value={phone} />
      </div>

      <div className="ct-f">
        <label htmlFor="ct-topic">What is it about?</label>
        {/* NOT A NATIVE `<select>`. Its popup is drawn by the operating system,
            so it is the one part of this form that cannot be made to match the
            rest of it: a bare rectangle with a blue bar through it, in the
            middle of a card that is otherwise entirely ours, and a white
            rectangle on a dark page in dark mode.

            `SelectField` is the control the onboarding form already uses, and
            it shares its panel with the country picker two fields up -- so the
            two menus on this page now open the same way, in the site's own
            type and colour, with arrow keys, Enter, Escape and
            `aria-activedescendant` already paid for. Seven options is under
            its search threshold, so it opens as a plain list. */}
        <SelectField id="ct-topic" options={[...ENQUIRY_TOPICS]} value={topic} onChange={setTopic} />
        <input type="hidden" name="topic" value={topic} />
      </div>

      <div className="ct-f">
        <label htmlFor="ct-msg">Message <b aria-hidden="true">*</b></label>
        <textarea id="ct-msg" name="message" required
                  placeholder="What are you trying to achieve? Tell us the outcome you want rather than the features you think you need." />
      </div>

      {error ? <p className="ct-error" role="alert">{error}</p> : null}

      <button className="pv-btn pv-btn--accent" type="submit" disabled={sending}>
        {sending ? "Sending…" : sent ? "Message sent" : "Send the details"}
      </button>

      {/* Says what the button does BEFORE it does it. A submit that quietly
          launches a mail client is a surprise; one that says so is a choice. */}
      <p className="ct-note" aria-live="polite">
        {sent ? (
          <>
            Your message is safely with our team and a receipt is on its way. You can also write to{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--accent-ink)", textDecoration: "underline", textUnderlineOffset: ".18em" }}>
              {CONTACT_EMAIL}
            </a>{" "}
            directly.
          </>
        ) : (
          <>Sent securely to our team. We normally reply within the same working day.</>
        )}
      </p>
    </form>
  );
}

export default ContactForm;
