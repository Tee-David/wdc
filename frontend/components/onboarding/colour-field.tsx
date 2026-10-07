"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, HelpCircle, Plus, Undo2, Upload, X } from "lucide-react";
import {
  MAIN_COLOUR_ROLE, OTHER_COLOUR_ROLE, formatColours, normalizeHex, parseColours, rgbOf,
} from "@/lib/brand-colours";
import { CHIPS, FEELINGS, nameColour, type Feeling } from "@/lib/colour-palettes";
import { dominantColors } from "@/lib/color-quantize";
import { UNSURE, isUnsure } from "@/lib/onboarding";

/**
 * The colour question in the onboarding form (decision 21, plans/onboarding-ux-research.md section D).
 *
 * ONE QUESTION, FIVE SCREENS, ONE STORED VALUE.
 *   feel      six feeling cards, "I already have my colours", "Choose for me",
 *             "I'm not sure", "Skip for now". The summary of saved colours sits here.
 *   suggest   the three ready palettes for the card tapped, "Yes, use these".
 *   have      one question with three ways: a picture read on the phone, codes, or words.
 *   studio    "Choose for me": a confirmation only.
 *   deep      the optional path: change a swatch from eleven named chips or a code.
 *
 * WHAT IS STORED. `brand_colours` holds `Name | #HEX | Role` lines under the
 * heading `Colour preferences:`, the lead colour as the main colour. The words
 * path stores the client's own text in the same key (it reads back as the
 * words box, the same way an older free-text note does), and in
 * `brand_colours_words`. `brand_vibe` and `brand_colour_source` go through
 * `setOther`. Nothing the component knows is kept anywhere but the form.
 *
 * WHAT IT CANNOT KNOW. It only sees its own value. Which feeling was tapped
 * is worked out from the saved hex codes when they still match a palette. The
 * source of colours that were saved earlier, and the vibe, are only written
 * again when this mounted screen saw them chosen, so a remount never blanks
 * an answer it did not touch.
 */

type Row = { name: string; hex: string };
type View = "feel" | "suggest" | "have" | "studio" | "deep";
type Mode = "upload" | "codes" | "words";
type Source = "vibe" | "logo" | "picture" | "codes" | "words" | "studio" | "skipped";

const MAX_COLOURS = 5;
const CODE_ERROR = "That code needs 6 letters or numbers, like 1A5C3A. Check it and try again.";
const PICTURE_SIZE = 64;

/* Distance between two colours in red, green and blue. Only used to drop a
   near duplicate from a picture, so a rough measure is enough. */
const rgbGap = (a: string, b: string) => {
  const x = rgbOf(a), y = rgbOf(b);
  if (!x || !y) return Infinity;
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
};

const sameHexes = (left: string[], right: string[]) =>
  left.length === right.length && [...left].sort().join() === [...right].sort().join();

/** Reads the colours of a picture on the phone. The file is never uploaded. */
async function readPicture(file: File): Promise<{ rows: Row[]; ignoredWhite: boolean }> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("The picture could not be read."));
      image.src = url;
    });
    const scale = Math.min(1, PICTURE_SIZE / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("This browser cannot read the picture.");
    context.drawImage(image, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    const rows: Row[] = [];
    let ignoredWhite = false;
    for (const swatch of dominantColors(pixels, 4, 12)) {
      /* A flat white background is the commonest thing a logo sits on, and
         it is not one of the brand's colours. Dropped only when it is most of
         the picture, so a white letter on a coloured logo stays. */
      if (swatch.r >= 240 && swatch.g >= 240 && swatch.b >= 240 && swatch.share >= 0.25) {
        ignoredWhite = true;
        continue;
      }
      const hex = `#${[swatch.r, swatch.g, swatch.b].map((value) => value.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
      if (rows.some((row) => rgbGap(row.hex, hex) < 40)) continue;
      rows.push({ name: nameColour(hex), hex });
      if (rows.length === MAX_COLOURS) break;
    }
    return { rows, ignoredWhite };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function ColourField({ id, value, onChange, setOther, describedBy }: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Writes one of the extra keys: brand_vibe, brand_colour_source, brand_colours_words. */
  setOther?: (key: string, value: string | string[]) => void;
  describedBy?: string;
}) {
  /* What the saved value says. "Not sure" is the UNSURE sentence (or its old
     semicolon form). Readable colour lines parse to rows. Anything else that
     is not empty is the client's own words, the same as an older note. */
  const notSure = isUnsure(value);
  const parsed = notSure || !value ? [] : parseColours(value);
  const rows: Row[] = parsed ?? [];
  const words = !notSure && parsed === null ? value : "";
  const matched = FEELINGS.find((feeling) => feeling.palettes.some((palette) => sameHexes(palette.map((c) => c.hex), rows.map((row) => normalizeHex(row.hex) ?? ""))));

  const [view, setView] = useState<View>(() => (words ? "have" : "feel"));
  const [mode, setMode] = useState<Mode>(() => (words ? "words" : "upload"));
  const [status, setStatus] = useState("");
  /* The card tapped, and the palette and main colour shown for it. */
  const [feelingId, setFeelingId] = useState("");
  const [paletteAt, setPaletteAt] = useState(0);
  const [main, setMain] = useState(0);
  /* Where the colours on screen came from, for the write. null means this
     screen did not see them chosen, so the source is not written again. */
  const [origin, setOrigin] = useState<Source | null>(null);
  const [vibe, setVibe] = useState<string | null>(null);
  /* The deeper path, and the sheet that changes one swatch in it. */
  const [deep, setDeep] = useState<Row[]>([]);
  const [sheetAt, setSheetAt] = useState<number | null>(null);
  const [sheetCode, setSheetCode] = useState("");
  const sheetRef = useRef<HTMLDivElement | null>(null);
  /* Picture and codes state. Kept on this screen only; the saved colours are
     the source of truth once a choice is made. */
  const [picture, setPicture] = useState<{ rows: Row[]; ignoredWhite: boolean } | null>(null);
  const [pictureError, setPictureError] = useState("");
  const [logoBox, setLogoBox] = useState(false);
  const [codes, setCodes] = useState<string[]>([""]);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const feeling: Feeling | undefined = FEELINGS.find((item) => item.id === feelingId);
  const palette = feeling ? feeling.palettes[paletteAt] : null;
  /* The main colour first, then the other three in the order the palette lists them. */
  const order = [main, ...[0, 1, 2, 3].filter((index) => index !== main)];
  const suggestion: Row[] = palette ? order.map((index) => palette[index]) : [];

  function other(key: string, text: string | string[]) { setOther?.(key, text); }

  /* A real choice replaces "not sure" rather than sitting beside it. */
  function clearDeferral() {
    if (!notSure) return;
    onChange("");
    other("brand_colour_source", "");
    other("brand_vibe", "");
  }

  function commit(list: Row[], source: Source | null, vibeName: string | null) {
    const chosen = list.filter((row) => row.hex).slice(0, MAX_COLOURS);
    if (!chosen.length) return false;
    onChange(formatColours(chosen.map((row, index) => ({ name: row.name, hex: row.hex, role: index === 0 ? MAIN_COLOUR_ROLE : OTHER_COLOUR_ROLE }))));
    if (source !== null) other("brand_colour_source", source);
    if (vibeName !== null) other("brand_vibe", vibeName);
    other("brand_colours_words", "");
    setOrigin(source);
    setVibe(vibeName);
    setStatus(`Saved. Main colour: ${chosen[0].name}.`);
    return true;
  }

  function pickFeeling(next: Feeling) {
    clearDeferral();
    setFeelingId(next.id);
    setPaletteAt(0);
    setMain(0);
    setStatus("");
    setView("suggest");
  }

  function chooseHave() {
    clearDeferral();
    setStatus("");
    setView("have");
  }

  function chooseStudio() {
    onChange(UNSURE);
    other("brand_colour_source", "studio");
    other("brand_vibe", "Not sure");
    setStatus("");
    setView("studio");
  }

  function toggleNotSure() {
    if (notSure) {
      clearDeferral();
      setView("feel");
      setStatus("");
      return;
    }
    onChange(UNSURE);
    other("brand_colour_source", "studio");
    other("brand_vibe", "Not sure");
    setStatus("");
  }

  function skip() {
    onChange("");
    other("brand_colour_source", "skipped");
    other("brand_vibe", "");
    other("brand_colours_words", "");
    setView("feel");
    setStatus("Skipped for now. You can pick colours any time before you send.");
  }

  function openDeep(list: Row[], source: Source | null, vibeName: string | null) {
    setDeep(list.map((row) => ({ ...row })));
    setOrigin(source);
    setVibe(vibeName);
    setStatus("");
    setView("deep");
  }

  function openSheet(index: number) {
    setSheetCode("");
    setSheetAt(index);
  }

  function closeSheet() {
    const at = sheetAt;
    setSheetAt(null);
    if (at !== null) window.setTimeout(() => document.getElementById(`${id}-sw-${at}`)?.focus(), 0);
  }

  useEffect(() => {
    if (sheetAt !== null) sheetRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [sheetAt]);

  function setSheetColour(hex: string, name: string) {
    setDeep((list) => list.map((row, index) => (index === sheetAt ? { name, hex } : row)));
  }

  async function onPicture(file: File | undefined) {
    if (!file) return;
    setPictureError("");
    try {
      const read = await readPicture(file);
      if (!read.rows.length) {
        setPicture(null);
        setPictureError("We could not find colours in that picture. Try another one.");
        return;
      }
      setPicture(read);
      setStatus("");
    } catch {
      setPicture(null);
      setPictureError("We could not read that file. Try a different picture.");
    }
  }

  function tryAnother() {
    setPicture(null);
    setPictureError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  const validCodes = codes.map((code) => normalizeHex(code)).filter((hex): hex is string => Boolean(hex));
  const badCode = codes.some((code) => code.trim() && !normalizeHex(code));

  function useCodes() {
    const list = [...new Set(validCodes)].map((hex) => ({ name: nameColour(hex), hex }));
    if (!list.length) { setStatus(""); setPictureError("Type at least one colour code, like 1A5C3A."); return; }
    setPictureError("");
    commit(list, "codes", "");
  }

  function setWords(text: string) {
    onChange(text);
    other("brand_colours_words", text);
    other("brand_colour_source", text.trim() ? "words" : "");
    other("brand_vibe", "");
  }

  return (
    <div className="obCol" id={id}>
      {view === "feel" ? (
        <fieldset className="obCol__group" aria-describedby={describedBy}>
          <legend className="obCol__q">What should your brand feel like?</legend>
          <p className="ob__hint">Tap the one that is closest. We will suggest colours to match. You can change them later.</p>
          <div className="obCol__cards">
            {FEELINGS.map((item) => {
              const on = matched?.id === item.id;
              return (
                <label key={item.id} className={`obCol__card${on ? " is-on" : ""}`}>
                  <input className="obCol__radio" type="radio" name={`${id}-feel`} value={item.id} checked={on}
                    onChange={() => pickFeeling(item)} />
                  <span className="obCol__strip" aria-hidden="true">
                    {item.palettes[0].map((colour) => <span key={colour.hex} style={{ background: colour.hex }} />)}
                  </span>
                  <strong className="obCol__cardName">{item.name}</strong>
                  <span className="obCol__cardLine">{item.line}</span>
                  <span className="obCol__cardNames">Colours: {item.palettes[0].map((colour) => colour.name).join(", ")}</span>
                </label>
              );
            })}
          </div>
          <div className="obCol__options">
            <label className="obCol__opt">
              <input className="obCol__radio" type="radio" name={`${id}-feel`} checked={false} onChange={chooseHave} />
              I already have my colours
            </label>
            <label className={`obCol__opt${notSure ? " is-on" : ""}`}>
              <input className="obCol__radio" type="radio" name={`${id}-feel`} checked={notSure} onChange={chooseStudio} />
              Choose for me
            </label>
          </div>
        </fieldset>
      ) : null}

      {view === "feel" && rows.length ? (
        <div className="obCol__saved" aria-label="Your colours">
          <p className="obCol__savedHead">Your colours</p>
          <ul className="obCol__savedList">
            {rows.map((row, index) => (
              <li key={`${row.name}-${index}`}>
                <span className="obCol__dot" style={{ background: normalizeHex(row.hex) ?? "transparent" }} aria-hidden="true" />
                <span>{row.name}{row.hex ? <small> {normalizeHex(row.hex) ?? row.hex}</small> : null}</span>
                {index === 0 ? <span className="obCol__badge">Main colour</span> : null}
              </li>
            ))}
          </ul>
          <button type="button" className="ob__btn ob__btn--ghost" onClick={() => openDeep(rows, origin, vibe)}>Change a colour or add my own</button>
        </div>
      ) : null}

      {view === "feel" && words ? (
        <div className="obCol__saved">
          <p className="obCol__savedHead">Your colours, in your words</p>
          <p className="obCol__words">{words}</p>
          <button type="button" className="ob__btn ob__btn--ghost" onClick={() => { setMode("words"); setView("have"); }}>Change these words</button>
        </div>
      ) : null}

      {view === "suggest" && palette && feeling ? (
        <section className="obCol__panel" aria-labelledby={`${id}-sug`}>
          <button type="button" className="obCol__back" onClick={() => setView("feel")}><ArrowLeft aria-hidden="true" /> Back to the feelings</button>
          <h3 id={`${id}-sug`} className="obCol__h">A palette for &ldquo;{feeling.name}&rdquo;</h3>
          <p className="obCol__count" aria-live="polite">{paletteAt + 1} of 3</p>
          <p className="ob__hint">The main colour is the one people will remember you by. Tap any colour to make it the main one.</p>
          <ul className="obCol__big">
            {suggestion.map((colour, index) => (
              <li key={colour.hex}>
                <button type="button" className="obCol__bigBtn" aria-label={index === 0 ? `${colour.name}, main colour` : `Make ${colour.name} the main colour`}
                  onClick={() => setMain(order[index])}>
                  <span className="obCol__bigSwatch" style={{ background: colour.hex }} aria-hidden="true" />
                  <span className="obCol__bigText">
                    <strong>{colour.name}</strong>
                    <small>{colour.hex}</small>
                  </span>
                  {index === 0 ? <span className="obCol__badge">Main colour</span> : null}
                </button>
              </li>
            ))}
          </ul>
          <div className="obCol__actions">
            <button type="button" className="ob__btn ob__btn--go" onClick={() => commit(suggestion, "vibe", feeling.name)}>Yes, use these</button>
            <button type="button" className="ob__btn ob__btn--ghost" onClick={() => { setPaletteAt((paletteAt + 1) % 3); setMain(0); }}>Show me another</button>
          </div>
          <button type="button" className="obCol__quiet" onClick={() => openDeep(suggestion, "vibe", feeling.name)}>Change a colour or add my own</button>
          <p className="ob__hint">These are starting points. Your designer will fine tune them with you.</p>
        </section>
      ) : null}

      {view === "have" ? (
        <section className="obCol__panel" aria-labelledby={`${id}-have`}>
          <button type="button" className="obCol__back" onClick={() => setView("feel")}><ArrowLeft aria-hidden="true" /> Back to the feelings</button>
          <h3 id={`${id}-have`} className="obCol__h">Show us your colours</h3>
          <div className="obCol__options" role="radiogroup" aria-label="How do you want to show us">
            <label className={`obCol__opt${mode === "upload" ? " is-on" : ""}`}>
              <input className="obCol__radio" type="radio" name={`${id}-have`} checked={mode === "upload"} onChange={() => setMode("upload")} />
              Upload my logo or a picture
            </label>
            <label className={`obCol__opt${mode === "codes" ? " is-on" : ""}`}>
              <input className="obCol__radio" type="radio" name={`${id}-have`} checked={mode === "codes"} onChange={() => setMode("codes")} />
              I know my colour codes
            </label>
            <label className={`obCol__opt${mode === "words" ? " is-on" : ""}`}>
              <input className="obCol__radio" type="radio" name={`${id}-have`} checked={mode === "words"} onChange={() => setMode("words")} />
              Describe them in words
            </label>
          </div>

          {mode === "upload" ? (
            <div className="obCol__mode">
              <p className="ob__hint">We read the colours from it. We read them on your phone, and the picture is not sent to us.</p>
              <label className="obCol__file">
                <Upload aria-hidden="true" />
                <span>Choose a picture</span>
                <input ref={fileRef} type="file" accept="image/*" onChange={(event) => { void onPicture(event.target.files?.[0]); }} />
              </label>
              {pictureError ? <p className="ob__fErr" role="status">{pictureError}</p> : null}
              {picture ? (
                <>
                  <p className="obCol__found" id={`${id}-found`}>We found these colours</p>
                  {picture.ignoredWhite ? <p className="ob__hint">We ignored the white background.</p> : null}
                  <ul className="obCol__big obCol__big--list">
                    {picture.rows.map((row, index) => (
                      <li key={row.hex} className="obCol__pickRow">
                        <button type="button" className="obCol__bigBtn" aria-label={index === 0 ? `${row.name}, main colour` : `Make ${row.name} the main colour`}
                          onClick={() => setPicture({ ...picture, rows: [row, ...picture.rows.filter((_, at) => at !== index)] })}>
                          <span className="obCol__bigSwatch" style={{ background: row.hex }} aria-hidden="true" />
                          <span className="obCol__bigText"><strong>{row.name}</strong><small>{row.hex}</small></span>
                          {index === 0 ? <span className="obCol__badge">Main colour</span> : null}
                        </button>
                        <button type="button" className="obCol__remove" aria-label={`Remove ${row.name}`}
                          onClick={() => setPicture({ ...picture, rows: picture.rows.filter((_, at) => at !== index) })}><X aria-hidden="true" /></button>
                      </li>
                    ))}
                  </ul>
                  <label className="obCol__check">
                    <input type="checkbox" checked={logoBox} onChange={(event) => setLogoBox(event.target.checked)} />
                    This picture is my logo
                  </label>
                  <div className="obCol__actions">
                    <button type="button" className="ob__btn ob__btn--go" disabled={!picture.rows.length}
                      onClick={() => commit(picture.rows, logoBox ? "logo" : "picture", "")}>Use these colours</button>
                    <button type="button" className="ob__btn ob__btn--ghost" onClick={tryAnother}>Try another picture</button>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {mode === "codes" ? (
            <div className="obCol__mode">
              <p className="ob__hint">A code looks like #1A5C3A.</p>
              <ul className="obCol__codes">
                {codes.map((code, index) => {
                  const hex = normalizeHex(code);
                  const bad = Boolean(code.trim() && !hex);
                  return (
                    <li key={index} className="obCol__codeRow">
                      <label className="obCol__codeLabel">
                        <span>Colour {index + 1}</span>
                        <input type="text" value={code} placeholder="#1A5C3A" maxLength={8} autoComplete="off" spellCheck={false}
                          aria-invalid={bad || undefined} aria-describedby={bad ? `${id}-code-err-${index}` : undefined}
                          onChange={(event) => setCodes(codes.map((item, at) => (at === index ? event.target.value : item)))} />
                      </label>
                      <span className="obCol__codeSw" style={{ background: hex ?? "transparent" }} aria-hidden="true" />
                      <button type="button" className="obCol__remove" aria-label={`Remove colour ${index + 1}`}
                        onClick={() => setCodes(codes.length > 1 ? codes.filter((_, at) => at !== index) : [""])}><X aria-hidden="true" /></button>
                      {bad ? <p className="ob__fErr obCol__codeErr" id={`${id}-code-err-${index}`}>{CODE_ERROR}</p> : null}
                    </li>
                  );
                })}
              </ul>
              {codes.length < MAX_COLOURS ? (
                <button type="button" className="ob__btn ob__btn--ghost" onClick={() => setCodes([...codes, ""])}><Plus aria-hidden="true" /> Add another colour</button>
              ) : <p className="ob__hint">You can add up to five colours.</p>}
              {pictureError ? <p className="ob__fErr" role="status">{pictureError}</p> : null}
              <div className="obCol__actions">
                <button type="button" className="ob__btn ob__btn--go" disabled={badCode} onClick={useCodes}>Use these colours</button>
              </div>
            </div>
          ) : null}

          {mode === "words" ? (
            <div className="obCol__mode">
              <label className="obCol__wordsLabel" htmlFor={`${id}-words`}>Describe them in words</label>
              <textarea id={`${id}-words`} rows={3} maxLength={500} value={words} placeholder="For example: dark green, gold and white"
                onChange={(event) => setWords(event.target.value)} />
              <p className="ob__hint">We will turn these into exact colours and show you before we use them.</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {view === "studio" ? (
        <section className="obCol__panel">
          <button type="button" className="obCol__back" onClick={() => setView("feel")}><ArrowLeft aria-hidden="true" /> Back to the feelings</button>
          <p className="obCol__confirm">Good. We will choose colours that fit your business and show you before we use them.</p>
        </section>
      ) : null}

      {view === "deep" ? (
        <section className="obCol__panel" aria-labelledby={`${id}-deep`}>
          <button type="button" className="obCol__back" onClick={() => setView("feel")}><ArrowLeft aria-hidden="true" /> Back to the feelings</button>
          <h3 id={`${id}-deep`} className="obCol__h">Change your colours</h3>
          <ul className="obCol__edit">
            {deep.map((row, index) => (
              <li key={`${index}-${row.hex}`} className="obCol__editRow">
                <button type="button" id={`${id}-sw-${index}`} className="obCol__sw" style={{ background: row.hex }}
                  aria-label={`Change ${row.name}`} onClick={() => openSheet(index)} />
                <span className="obCol__editText"><strong>{row.name}</strong><small>{row.hex}</small></span>
                {index === 0 ? <span className="obCol__badge">Main colour</span> : (
                  <button type="button" className="ob__btn ob__btn--ghost obCol__small"
                    onClick={() => setDeep((list) => [list[index], ...list.filter((_, at) => at !== index)])}>Make this the main colour</button>
                )}
                {deep.length > 1 ? (
                  <button type="button" className="obCol__remove" aria-label={`Remove ${row.name}`}
                    onClick={() => setDeep((list) => list.filter((_, at) => at !== index))}><X aria-hidden="true" /></button>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="obCol__actions">
            {deep.length < MAX_COLOURS ? (
              <button type="button" className="ob__btn ob__btn--ghost" onClick={() => { setDeep([...deep, { name: "Grey", hex: "#808080" }]); openSheet(deep.length); }}>
                <Plus aria-hidden="true" /> Add a colour
              </button>
            ) : <p className="ob__hint">You can add up to five colours.</p>}
            <button type="button" className="ob__btn ob__btn--go" onClick={() => commit(deep, origin, vibe)}>Use these colours</button>
          </div>
          <p className="obCol__ideas">Need ideas? <a href="https://www.pinterest.com" target="_blank" rel="noopener noreferrer">Pinterest<span className="obCol__sr"> (opens in a new tab)</span></a>, <a href="https://dribbble.com" target="_blank" rel="noopener noreferrer">Dribbble<span className="obCol__sr"> (opens in a new tab)</span></a> and <a href="https://coolors.co" target="_blank" rel="noopener noreferrer">Coolors<span className="obCol__sr"> (opens in a new tab)</span></a> are good places to look.</p>
        </section>
      ) : null}

      {view === "feel" || view === "have" ? (
        <div className="obCol__foot">
          <button type="button" className={`ob__unsure${notSure ? " is-on" : ""}`} aria-pressed={notSure} onClick={toggleNotSure}>
            {notSure ? <Undo2 aria-hidden="true" /> : <HelpCircle aria-hidden="true" />}
            {notSure ? "Actually, let me answer this" : UNSURE}
          </button>
          {notSure ? <p className="ob__unsureNote">Noted. We will come to this with a recommendation rather than a blank.</p> : null}
          {view === "feel" ? <button type="button" className="obCol__skip" onClick={skip}>Skip for now</button> : null}
        </div>
      ) : null}

      {status ? <p className="obCol__status" role="status">{status}</p> : null}

      {sheetAt !== null && deep[sheetAt] && typeof document !== "undefined" ? createPortal(
        <div className="obCol__sheetWrap">
          <div className="obCol__scrim" aria-hidden="true" onClick={closeSheet} />
          <div ref={sheetRef} className="obCol__sheet" role="dialog" aria-modal="true" aria-labelledby={`${id}-sheet`}
            onKeyDown={(event) => { if (event.key === "Escape") closeSheet(); }}>
            <div className="obCol__sheetHead">
              <h4 id={`${id}-sheet`}>Change {deep[sheetAt].name}</h4>
              <button type="button" className="obCol__remove" aria-label="Close" onClick={closeSheet}><X aria-hidden="true" /></button>
            </div>
            <p className="ob__hint">Pick a named colour, or type an exact code.</p>
            <div className="obCol__chips">
              {CHIPS.map((chip) => (
                <button key={chip.hex} type="button" className="obCol__chip" aria-label={chip.name}
                  onClick={() => { setSheetColour(chip.hex, chip.name); closeSheet(); }}>
                  <span className="obCol__chipSw" style={{ background: chip.hex }} aria-hidden="true" />
                  {chip.name}
                </button>
              ))}
            </div>
            <label className="obCol__code">
              Or type an exact code
              <input type="text" value={sheetCode} placeholder="#1A5C3A" maxLength={8} autoComplete="off" spellCheck={false}
                aria-invalid={Boolean(sheetCode.trim() && !normalizeHex(sheetCode)) || undefined}
                onChange={(event) => {
                  setSheetCode(event.target.value);
                  const hex = normalizeHex(event.target.value);
                  if (hex) setSheetColour(hex, nameColour(hex));
                }} />
            </label>
            {sheetCode.trim() && !normalizeHex(sheetCode) ? <p className="ob__fErr">{CODE_ERROR}</p> : null}
            <button type="button" className="ob__btn ob__btn--go" onClick={closeSheet}>Done</button>
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
