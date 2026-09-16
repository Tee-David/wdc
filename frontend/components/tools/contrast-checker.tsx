"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, Check, X } from "lucide-react";
import { contrastRatio, formatRatio, parseColor, toHex, verdicts } from "@/lib/contrast";

/**
 * The contrast checker at /tools/contrast.
 *
 * ANSWERS AS YOU TYPE, LIKE THE AI COST CALCULATOR. There is nothing to send
 * and nothing to wait for: `lib/contrast.ts` is pure arithmetic on two colours
 * already in the browser, so the ratio and all six verdicts update on every
 * keystroke rather than behind a button.
 *
 * INVALID INPUT IS NOT AN ERROR STATE. Somebody mid-way through typing a hex
 * code has a string that does not parse yet, which is normal and not worth a
 * red box for. The result column simply holds its last good answer -- set
 * once, on mount, from the two starting colours -- until both fields parse
 * again.
 */

const DEFAULT_FG = "#0e0e2c";
const DEFAULT_BG = "#ffffff";

function ColorField({
  id, label, value, onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const parsed = parseColor(value);
  return (
    <div className="cc__field">
      <label className="tl__label" htmlFor={id}>{label}</label>
      <div className="cc__fieldRow">
        {/* The native swatch is the easy path -- pick a colour, never type a
            code -- and it only ever WRITES a clean hex back, so it can't be
            the reason a field stops parsing. Falls back to the last good
            colour while the text field holds something invalid, rather than
            going blank. */}
        <input
          type="color"
          className="cc__swatch"
          aria-label={`${label} swatch`}
          value={parsed ? toHex(parsed) : "#000000"}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          id={id}
          className="tl__input cc__hex"
          type="text"
          inputMode="text"
          spellCheck={false}
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!parsed || undefined}
        />
      </div>
    </div>
  );
}

export default function ContrastChecker() {
  const [fg, setFg] = useState(DEFAULT_FG);
  const [bg, setBg] = useState(DEFAULT_BG);

  const fgColor = parseColor(fg);
  const bgColor = parseColor(bg);
  const bothValid = fgColor !== null && bgColor !== null;

  /* Held rather than recomputed to null on a half-typed hex code, so the
     verdict column does not flicker to "enter a colour" every time the reader
     deletes a character to fix a typo. */
  const [lastGood, setLastGood] = useState({ fg: DEFAULT_FG, bg: DEFAULT_BG });
  const shown = bothValid ? { fg, bg } : lastGood;
  if (bothValid && (lastGood.fg !== fg || lastGood.bg !== bg)) {
    setLastGood({ fg, bg });
  }

  const ratio = useMemo(() => {
    const a = parseColor(shown.fg)!, b = parseColor(shown.bg)!;
    return contrastRatio(a, b);
  }, [shown.fg, shown.bg]);
  const rows = useMemo(() => verdicts(ratio), [ratio]);
  const passCount = rows.filter((r) => r.pass).length;

  const swap = () => { setFg(bg); setBg(fg); };

  return (
    <div className="tl cc">
      <div className="tl__form">
        <div className="cc__fields">
          <ColorField id="cc-fg" label="Text colour" value={fg} onChange={setFg} />
          <button
            type="button"
            className="cc__swap"
            onClick={swap}
            aria-label="Swap the two colours"
          >
            <ArrowLeftRight aria-hidden="true" />
          </button>
          <ColorField id="cc-bg" label="Background colour" value={bg} onChange={setBg} />
        </div>
        {!bothValid && (
          <p className="tl__hint" role="status">
            That does not read as a colour yet -- a hex code like #ff6500, or
            rgb(255, 101, 0). Showing the last one that did.
          </p>
        )}
      </div>

      <div className="cc__out">
        <div className="cc__preview" style={{ color: shown.fg, background: shown.bg }}>
          <p className="cc__previewLg">Large text, 24px and up</p>
          <p className="cc__previewSm">
            Normal text. The quick brown fox jumps over the lazy dog.
          </p>
        </div>

        <div className="cc__ratio">
          <span className="cc__ratioNum">{formatRatio(ratio)}</span>
          <span className="tl__hint">
            {passCount} of {rows.length} WCAG checks pass
          </span>
        </div>

        <ul className="cc__list">
          {rows.map((r) => (
            <li key={r.key} className={r.pass ? "is-pass" : "is-fail"}>
              <span className="cc__mark" aria-hidden="true">
                {r.pass ? <Check /> : <X />}
              </span>
              <span className="cc__rowT">
                <b>{r.label}</b>
                <em>{r.scope}, needs {r.minRatio}:1</em>
              </span>
              <span className="cc__rowV">{r.pass ? "Passes" : "Fails"}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
