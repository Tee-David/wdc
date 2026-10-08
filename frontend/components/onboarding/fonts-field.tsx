"use client";

import { useEffect, useState } from "react";
import { Plus, Shuffle, X } from "lucide-react";
import { FONT_PAIRINGS, GOOGLE_FONTS, fontsHref, type FontPairing } from "@/lib/font-pairings";
import { UNSURE, isUnsure } from "@/lib/onboarding";
import SelectField from "./select-field";

/**
 * FONTS, THE SAME WAY AS COLOURS. Three ready pairings at a time with a
 * shuffle through the rest, or "I know my fonts" with a searchable list of
 * Google Fonts. A client picks two to five pairings and the studio decides
 * which agrees best, so the choice is a shortlist, not a verdict. Stored as
 * plain lines, "Primary: Lora | Secondary: Inter | Friendly editorial".
 *
 * The font files come from Google Fonts, but only when this screen is open,
 * which is the moment a client asked to see them (the CSP already allows it).
 */
const MAX_PICKS = 5;

type Pick = { heading: string; body: string; label: string };

const parse = (value: string): Pick[] =>
  isUnsure(value) ? [] : value.split("\n").map((line) => line.trim()).filter(Boolean).flatMap((line) => {
    const m = line.match(/^Primary: (.+?) \| Secondary: (.+?)(?: \| (.+))?$/);
    return m ? [{ heading: m[1], body: m[2], label: m[3] ?? "" }] : [];
  });
const join = (picks: Pick[]) => picks.map((p) => `Primary: ${p.heading} | Secondary: ${p.body}${p.label ? ` | ${p.label}` : ""}`).join("\n");
const same = (a: Pick, b: Pick) => a.heading === b.heading && a.body === b.body;
const weightOf = (name: string) => FONT_PAIRINGS.find((p) => p.heading === name)?.hw;

/** Loads the Google Fonts stylesheet for what is on screen, once per distinct request. */
function useGoogleFonts(families: { name: string; weight?: number }[]) {
  const href = fontsHref(families);
  useEffect(() => {
    if (!href || document.head.querySelector(`link[data-wdc-fonts="${CSS.escape(href)}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.wdcFonts = href;
    document.head.appendChild(link);
  }, [href]);
}

const stack = (name: string) => `"${name}", system-ui, sans-serif`;

function Sample({ heading, body, hw }: { heading: string; body: string; hw?: number }) {
  return (
    <span className="obFont__sample" aria-hidden="true">
      <span className="obFont__head" style={{ fontFamily: stack(heading), fontWeight: hw ?? 400 }}>Your brand, set properly</span>
      <span className="obFont__body" style={{ fontFamily: stack(body) }}>Clear words, good rhythm, easy to read on any screen.</span>
    </span>
  );
}

export default function FontsField({ id, value, onChange, describedBy }: {
  id: string; value: string; onChange: (value: string) => void; describedBy?: string;
}) {
  const picks = parse(value);
  const notSure = isUnsure(value);
  const [shown, setShown] = useState<number[]>([0, 1, 2]);
  const [deck, setDeck] = useState<number[]>([]);
  const [own, setOwn] = useState(false);
  const [draft, setDraft] = useState<{ heading: string; body: string }>({ heading: "", body: "" });

  const wanted = [
    ...shown.map((i) => ({ name: FONT_PAIRINGS[i].heading, weight: FONT_PAIRINGS[i].hw })),
    ...shown.map((i) => ({ name: FONT_PAIRINGS[i].body })),
    ...picks.flatMap((p) => [{ name: p.heading, weight: weightOf(p.heading) }, { name: p.body }]),
    { name: draft.heading }, { name: draft.body },
  ];
  useGoogleFonts(wanted);

  function shuffle() {
    let next = deck;
    if (next.length < 3) {
      next = FONT_PAIRINGS.map((_, i) => i).filter((i) => !shown.includes(i));
      for (let at = next.length - 1; at > 0; at -= 1) {
        const swap = Math.floor(Math.random() * (at + 1));
        [next[at], next[swap]] = [next[swap], next[at]];
      }
    }
    setShown(next.slice(0, 3));
    setDeck(next.slice(3));
  }

  const toPick = (p: FontPairing): Pick => ({ heading: p.heading, body: p.body, label: p.title });
  function toggle(p: FontPairing) {
    const pick = toPick(p);
    if (picks.some((x) => same(x, pick))) return onChange(join(picks.filter((x) => !same(x, pick))));
    if (picks.length >= MAX_PICKS) return;
    onChange(join([...picks, pick]));
  }
  function addOwn() {
    if (!draft.heading || !draft.body || picks.length >= MAX_PICKS) return;
    const pick = { ...draft, label: "My own choice" };
    if (!picks.some((x) => same(x, pick))) onChange(join([...picks, pick]));
    setDraft({ heading: "", body: "" });
    setOwn(false);
  }

  return (
    <div className="obCol obFont" id={id} aria-describedby={describedBy}>
      {!own ? (
        <fieldset className="obCol__group">
          <legend className="obCol__q">Pick two to five pairings you like</legend>
          <p className="ob__hint">Tap to add, tap again to remove. We choose the one that agrees best with your brand, and tell you why.</p>
          <div className="obCol__cards">
            {shown.map((index) => {
              const item = FONT_PAIRINGS[index];
              const on = picks.some((x) => same(x, toPick(item)));
              return (
                <button key={item.id} type="button" role="checkbox" aria-checked={on}
                  className={`obCol__card obFont__card${on ? " is-on" : ""}`} onClick={() => toggle(item)}>
                  <Sample heading={item.heading} body={item.body} hw={item.hw} />
                  <strong className="obCol__cardName">{item.title}</strong>
                  <span className="obCol__cardLine">{item.line}</span>
                  <span className="obCol__cardNames">{item.heading} with {item.body}</span>
                  {on ? <span className="obCol__badge">Picked</span> : null}
                </button>
              );
            })}
          </div>
          <button type="button" className="ob__btn ob__btn--ghost obCol__shuffle" onClick={shuffle}>
            <Shuffle aria-hidden="true" /> Shuffle for more pairings
          </button>
          <div className="obCol__options">
            <button type="button" className="obCol__opt" onClick={() => setOwn(true)}>I know my fonts</button>
            <button type="button" className={`obCol__opt${notSure ? " is-on" : ""}`}
              onClick={() => onChange(notSure ? "" : UNSURE)}>Choose for me</button>
          </div>
        </fieldset>
      ) : (
        <section className="obCol__panel" aria-labelledby={`${id}-own`}>
          <h3 id={`${id}-own`} className="obCol__h">Your fonts</h3>
          <p className="ob__hint">Search Google Fonts. Pick the one for headlines, then the one for reading.</p>
          <div className="obFont__own">
            <label className="obCol__codeLabel"><span>Primary (headlines)</span>
              <SelectField id={`${id}-h`} options={GOOGLE_FONTS} value={draft.heading} placeholder="Search a font" onChange={(heading) => setDraft({ ...draft, heading })} />
            </label>
            <label className="obCol__codeLabel"><span>Secondary (reading)</span>
              <SelectField id={`${id}-b`} options={GOOGLE_FONTS} value={draft.body} placeholder="Search a font" onChange={(body) => setDraft({ ...draft, body })} />
            </label>
          </div>
          {draft.heading && draft.body ? <Sample heading={draft.heading} body={draft.body} /> : null}
          <div className="obCol__actions">
            <button type="button" className="ob__btn ob__btn--go" disabled={!draft.heading || !draft.body || picks.length >= MAX_PICKS} onClick={addOwn}>
              <Plus aria-hidden="true" /> Add this pairing
            </button>
            <button type="button" className="ob__btn ob__btn--ghost" onClick={() => setOwn(false)}>Back to the pairings</button>
          </div>
        </section>
      )}

      {picks.length ? (
        <div className="obCol__saved" aria-label="Your picks">
          <p className="obCol__savedHead">Your picks ({picks.length} of {MAX_PICKS}){picks.length < 2 ? ", add one more if you can" : ""}</p>
          <ul className="obFont__picks">
            {picks.map((p, i) => (
              <li key={`${p.heading}-${p.body}-${i}`} className="obFont__pick">
                <span className="obFont__pickText">
                  <span style={{ fontFamily: stack(p.heading), fontWeight: weightOf(p.heading) ?? 400 }}>{p.heading}</span>
                  <small> with {p.body}{p.label ? `, ${p.label}` : ""}</small>
                </span>
                <button type="button" className="obCol__remove" aria-label={`Remove ${p.heading} with ${p.body}`}
                  onClick={() => onChange(join(picks.filter((_, at) => at !== i)))}><X aria-hidden="true" /></button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {notSure ? <p className="obCol__words">Good. We will choose fonts that fit your business and show you before we use them.</p> : null}
    </div>
  );
}
