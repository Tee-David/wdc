"use client";

import { useState } from "react";
import { Minus, Plus, HelpCircle } from "lucide-react";
import { COLOUR_ROLES, colourProblem, formatColours, hexShade, normalizeHex, parseColours, shadeHex, type ColourPreference } from "@/lib/brand-colours";
import { UNSURE } from "@/lib/onboarding";
import SelectField from "./select-field";
import "./brief-preferences.css";

const empty = (): ColourPreference => ({ name: "", hex: "", role: "Not decided" });
const PALETTE = ["#FFFFFF", "#181818", "#747474", "#D9CBB4", "#603A79", "#205D46", "#2867A0", "#C85353", "#DBA238", "#AB6476", "#704D32", "#6F9081"];

export default function ColourField({ id, value, onChange, describedBy }: {
  id: string; value: string; onChange: (value: string) => void; describedBy?: string;
}) {
  const [last, setLast] = useState(value);
  const [rows, setRows] = useState<ColourPreference[]>(() => parseColours(value) || []);
  const [panel, setPanel] = useState<number | null>(null);
  if (last !== value) { setLast(value); setRows(parseColours(value) || []); setPanel(null); }
  const legacy = value && value !== UNSURE && parseColours(value) === null;
  function write(next: ColourPreference[]) { setRows(next); const text = formatColours(next); setLast(text); onChange(text); }
  function update(index: number, patch: Partial<ColourPreference>) { write(rows.map((row, at) => at === index ? { ...row, ...patch } : row)); }
  const problem = colourProblem(formatColours(rows));
  return <div className="obColours" id={id} tabIndex={-1} aria-describedby={describedBy}>
    <p className="ob__hint">Names are enough. These are preferences; we will confirm the final palette with you.</p>
    {legacy ? <div className="obColours__legacy"><p>Your saved colour note</p><p className="obColours__note">{value}</p>
      <p className="ob__hint">Keep this note, or replace it with colour entries. We will not guess or remove any of its details.</p>
      <button className="ob__btn ob__btn--ghost" type="button" onClick={() => write([empty()])}>Replace note with colour entries</button></div>
      : <>
        {rows.map((row, index) => <div className="obColours__row" key={index}>
          <div className="obColours__fields">
            <button className="obColours__swatch" style={{ background: normalizeHex(row.hex) || "var(--paper-2)" }} type="button"
              aria-label={`Choose shade for ${row.name || `colour ${index + 1}`}`} aria-expanded={panel === index}
              aria-controls={`${id}-picker-${index}`} onClick={() => setPanel(panel === index ? null : index)}>{!normalizeHex(row.hex) ? "?" : null}</button>
            <label>Name<input maxLength={80} value={row.name} placeholder="e.g. Deep green" onChange={(event) => update(index, { name: event.target.value })} /></label>
            <label>Hex (optional)<input value={row.hex} maxLength={8} placeholder="#336699" aria-invalid={Boolean(row.hex && !normalizeHex(row.hex)) || undefined}
              onChange={(event) => update(index, { hex: event.target.value })} onBlur={() => { const hex = normalizeHex(row.hex); if (hex) update(index, { hex }); }} /></label>
            <button type="button" className="obColours__remove" aria-label={`Remove ${row.name || `colour ${index + 1}`}`} onClick={() => { setPanel(null); write(rows.filter((_, at) => at !== index)); }}><Minus aria-hidden="true" /></button>
          </div>
          <label className="obColours__role" htmlFor={`${id}-role-${index}`}>How might we use it? (optional)</label>
          <SelectField id={`${id}-role-${index}`} options={[...COLOUR_ROLES]} value={row.role} onChange={(role) => update(index, { role })} />
          <p className="ob__hint">{roleHelp(row.role)}</p>
          {panel === index ? <div id={`${id}-picker-${index}`} className="obColours__panel"><ShadePicker initialHex={row.hex} onPick={(hex) => update(index, { hex })} />
            <button className="ob__btn ob__btn--ghost" type="button" onClick={() => setPanel(null)}>Done choosing shade</button></div> : null}
          {!row.hex ? <p className="ob__hint">No exact shade chosen.</p> : null}
        </div>)}
        {problem ? <p className="ob__fErr" role="status">{problem}</p> : null}
        <div className="obColours__actions"><button className="ob__btn ob__btn--ghost" type="button" disabled={rows.length >= 5}
          onClick={() => write([...rows, empty()])}><Plus aria-hidden="true" /> Add a colour</button><span>{rows.length} of 5</span></div>
        {rows.length >= 5 ? <p className="ob__hint">You can add up to five. Remove a colour to add another.</p> : null}
        <button className={`ob__unsure${value === UNSURE ? " is-on" : ""}`} type="button" aria-pressed={value === UNSURE}
          onClick={() => { setRows([]); setLast(value === UNSURE ? "" : UNSURE); onChange(value === UNSURE ? "" : UNSURE); }}><HelpCircle aria-hidden="true" />{value === UNSURE ? "Let me choose colours" : "Please recommend colours"}</button>
      </>}
  </div>;
}

function roleHelp(role: string) {
  switch (role) {
    case "Main colour (primary)": return "The colour you imagine using most often.";
    case "Supporting colour (secondary)": return "A second colour that works beside the main colour.";
    case "Highlight (accent)": return "Used sparingly to draw attention.";
    case "Text": return "For words. We will check readability before using it.";
    case "Neutral / background": return "A quiet colour behind the content.";
    default: return "A preference, not a final design rule. You can leave this undecided.";
  }
}

function ShadePicker({ initialHex, onPick }: { initialHex: string; onPick: (hex: string) => void }) {
  const initial = hexShade(initialHex);
  const [hue, setHue] = useState(initial[0]), [sat, setSat] = useState(initial[1]), [light, setLight] = useState(initial[2]);
  function choose(h: number, s: number, l: number) { setHue(h); setSat(s); setLight(l); onPick(shadeHex(h, s, l)); }
  return <>
    <div className="obColours__palette" role="group" aria-label="Suggested shades">{PALETTE.map((hex) => <button key={hex} type="button" style={{ background: hex }} aria-label={`Choose ${hex}`} onClick={() => choose(...hexShade(hex))} />)}</div>
    <div className="obColours__shade" style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hue} 100% 50%))` }} aria-hidden="true"
      onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); const bounds = event.currentTarget.getBoundingClientRect(); choose(hue, Math.round(Math.max(0, Math.min(100, (event.clientX - bounds.left) / bounds.width * 100))), Math.round(Math.max(0, Math.min(100, (1 - (event.clientY - bounds.top) / bounds.height) * 100)))); }}
      onPointerMove={(event) => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) return; const bounds = event.currentTarget.getBoundingClientRect(); choose(hue, Math.round(Math.max(0, Math.min(100, (event.clientX - bounds.left) / bounds.width * 100))), Math.round(Math.max(0, Math.min(100, (1 - (event.clientY - bounds.top) / bounds.height) * 100)))); }}><span style={{ left: `${sat}%`, top: `${100 - light}%` }} /></div>
    <p className="ob__hint">Drag to explore, or use these sliders and the hex field.</p>
    <label>Hue<input type="range" min={0} max={359} value={hue} onChange={(event) => choose(Number(event.target.value), sat, light)} /></label>
    <label>Colour intensity<input type="range" min={0} max={100} value={sat} onChange={(event) => choose(hue, Number(event.target.value), light)} /></label>
    <label>Brightness<input type="range" min={0} max={100} value={light} onChange={(event) => choose(hue, sat, Number(event.target.value))} /></label>
  </>;
}
