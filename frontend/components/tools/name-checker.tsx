"use client";

import { useState } from "react";
import { AlertCircle, Check, Copy, Info, Landmark, Search, ShieldQuestion, Store } from "lucide-react";
import Link from "next/link";
import { NewTab } from "@/components/ui/new-tab";
import { readName, looksLikeName, type EntityKind, type NameReading } from "@/lib/cac-name";

/**
 * The free business name checker.
 *
 * IT RUNS ENTIRELY IN THE BROWSER, and that is the design rather than a
 * shortcut. `lib/cac-name.ts` is pure and synchronous, so there is no route,
 * no key, no rate limit, no quota and no bill: the rules under CAMA 2020
 * section 852 are law, they are public, and checking a name against them is
 * arithmetic. Nothing is metered because nothing leaves the machine.
 *
 * WHICH IS ALSO THE BEST THING ABOUT IT. A business name is an idea somebody
 * has not registered yet, and people are rightly cagey about typing one into a
 * stranger's website. This one never sends it anywhere. We say so on the page,
 * because it is true and because no paid lookup can say it.
 *
 * WHAT IT WILL NOT DO IS PRETEND. There is no free way to search the CAC
 * register: the Commission publishes a search PAGE, not an interface a program
 * may use, and every third party selling one charges per lookup. So the tool
 * answers the half it can answer completely, says plainly that it has not
 * looked at the register, and hands the visitor both ways to close that gap:
 * the Commission's own public search, or us.
 *
 * "CLEAR" IS NEVER "AVAILABLE". Section 852(1) turns on names calculated to
 * deceive and on misleading the public as to the nature of a business, and no
 * function decides that. Everything here is something to know before filing,
 * never a verdict on whether the filing will succeed.
 */

/** The Commission's own public search. A page for people, which is the point:
    we send the visitor to it rather than reading it with a program. */
const CAC_SEARCH = "https://icrp.cac.gov.ng/public-search/";

/* AN ICON EACH, because the two choices are a fork the whole tool hangs on and
   they were two paragraphs of grey text telling them apart. A shopfront for the
   thing one person trades under, a bank for the thing that exists separately
   from whoever owns it -- which is precisely the distinction the hint spends a
   sentence making. */
const ENTITIES: { key: EntityKind; label: string; hint: string; Icon: typeof Store }[] = [
  {
    key: "business",
    label: "A business name",
    hint: "An enterprise or ventures. Simpler and cheaper to register, and not a separate legal person from you.",
    Icon: Store,
  },
  {
    key: "company",
    label: "A company",
    hint: "Limited by shares. A separate legal person, and usually what a bank or a larger client will ask for.",
    Icon: Landmark,
  },
];

/* Each finding's kind decides its colour and its icon, reusing the classes the
   email checker already established so the two tools do not look like they
   were built by different studios. */
const LOOK: Record<string, { tone: string; Icon: typeof Info; word: string }> = {
  consent: { tone: "weak", Icon: ShieldQuestion, word: "Needs consent" },
  suffix: { tone: "missing", Icon: AlertCircle, word: "Wrong ending" },
  form: { tone: "weak", Icon: Info, word: "Needs an ending" },
  note: { tone: "unknown", Icon: Info, word: "Worth knowing" },
};

export default function NameChecker() {
  const [entity, setEntity] = useState<EntityKind>("business");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [reading, setReading] = useState<NameReading | null>(null);
  /* What was actually checked, so the results never describe a name the
     visitor has since edited in the box above them. */
  const [checked, setChecked] = useState("");
  const [copied, setCopied] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!looksLikeName(name)) {
      setError("Enter the name you want, like Wendi Loveee Ventures.");
      setReading(null);
      return;
    }
    setError("");
    setChecked(name.trim());
    setReading(readName(name, entity));
  };

  /* Editing anything invalidates the answer rather than leaving a stale one on
     screen under a different name. */
  const reset = () => { setReading(null); setError(""); setCopied(false); };

  /* Copy, then say so for two seconds. A copy button that gives no feedback
     gets pressed three times and the reader still does not know it worked. */
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(checked);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* A browser that refuses the clipboard is not an error worth a message:
         the name is still in the box above, ready to be selected by hand. */
    }
  };

  return (
    <div className={`tl${reading ? " tl--split" : ""}`}>
      <form className="tl__form" onSubmit={submit}>
        {/* THE ENTITY FIRST, because it changes the answer. "Ltd" on the end of
            a business name is a rejection; on a company it is required. Asking
            afterwards would mean checking the wrong rules. */}
        <fieldset className="tl__kinds">
          <legend className="tl__label">What are you registering?</legend>
          <div className="tl__kindrow" role="radiogroup" aria-label="What are you registering?">
            {ENTITIES.map((o) => (
              <button
                key={o.key}
                type="button"
                role="radio"
                aria-checked={entity === o.key}
                className={`tl__kind${entity === o.key ? " is-on" : ""}`}
                onClick={() => { setEntity(o.key); reset(); }}
              >
                <span className="tl__kindIc" aria-hidden="true"><o.Icon /></span>
                <span className="tl__kindT">{o.label}</span>
                <span className="tl__kindH">{o.hint}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="tl__label" htmlFor="nm-name">The name you want</label>
        <div className="tl__row">
          <input
            id="nm-name"
            className="tl__input"
            type="text"
            autoComplete="organization"
            spellCheck={false}
            placeholder={entity === "company" ? "Wendi Loveee Limited" : "Wendi Loveee Ventures"}
            value={name}
            onChange={(e) => { setName(e.target.value); reset(); }}
            aria-describedby="nm-hint"
          />
          <button className="tl__go" type="submit" disabled={!name.trim()}>
            <Search aria-hidden="true" /> Check it
          </button>
        </div>
        <p className="tl__hint" id="nm-hint">
          Type it exactly as you want it registered, ending and all. It is checked
          on your own device and never sent anywhere.
        </p>
      </form>

      {error && <p className="tl__err" role="alert">{error}</p>}

      {reading && (
        <div className="tl__out" role="status">
          {/* THE WORDS IN ONE SPAN, not loose beside the icon. A grid makes a
              separate item of every element AND every run of bare text, so an
              icon, a text run and a <b> were three items in a two-column grid:
              the name broke onto its own row and sat outside the column the
              rest of the sentence was in. Two children, two columns. */}
          <p className="tl__verdict">
            {reading.clear ? <Check aria-hidden="true" /> : <Info aria-hidden="true" />}
            <span>
              {reading.clear ? (
                <>Nothing in <b>{checked}</b> breaks the rules</>
              ) : (
                <>
                  {reading.findings.length} thing{reading.findings.length === 1 ? "" : "s"}
                  {" "}to know about <b>{checked}</b>
                </>
              )}
            </span>
          </p>

          {reading.clear ? (
            <p className="tl__note">
              No restricted words, and the ending is right for what you are
              registering.
            </p>
          ) : (
            <ul className="tl__list">
              {reading.findings.map((f, i) => {
                const look = LOOK[f.kind] ?? LOOK.note;
                const Icon = look.Icon;
                return (
                  <li className={`tl__find tl__find--${look.tone}`} key={`${f.kind}-${f.match ?? i}`}>
                    <span className="tl__findhead" aria-hidden="true"><Icon /></span>
                    <span className="tl__findtop">
                      <span className="tl__findname">{f.title}</span>
                      <span className="tl__findverdict">{look.word}</span>
                    </span>
                    <p className="tl__finddetail">{f.detail}</p>
                  </li>
                );
              })}
            </ul>
          )}

          {/* STEP TWO, NOT A DISCLAIMER.

              This was three paragraphs headed "What this has not told you",
              explaining at length why we had not checked the register. All
              true, and it read like a solicitor's letter on a page whose whole
              job is to answer one question. The limitation has not changed;
              the FRAMING has. "Here is the second step and here is the button"
              is the same fact as "we did not do this", and it is the version
              somebody can act on.

              The copy button is the point of it. CAC's search takes a pasted
              name, so two taps gets the reader a real answer rather than
              leaving them to retype what they just typed. */}
          <div className="tl__step">
            <p className="tl__stepK">Step 2</p>
            <h3>Is it already taken?</h3>
            <p>Only CAC&rsquo;s register can say. Copy the name and search it there.</p>
            <div className="tl__stepActs">
              <button type="button" className="pv-btn pv-btn--accent" onClick={copy}>
                {copied ? <><Check aria-hidden="true" /> Copied</> : <><Copy aria-hidden="true" /> Copy name</>}
              </button>
              <a
                className="pv-btn pv-btn--light"
                href={CAC_SEARCH}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open CAC register
                <NewTab />
              </a>
            </div>
            <p className="tl__stepAlt">
              Rather we did it? <Link href="/contact">We check it and file it for you</Link>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
