"use client";

import {
  useCallback, useEffect, useId, useMemo, useRef, useState,
} from "react";
import { ChevronDown, Search } from "lucide-react";
import { DIAL_CODES, DIAL_BY_ISO } from "@/lib/dial-codes";
import { Mark, usePickerOpen } from "./picker";

/* THE CONTROL CARRIES ITS OWN LOOK, rather than trusting the page to remember.
   These were imported by the onboarding form and by nothing else, so the
   contact form rendered this field with its closed state styled and its panel
   completely unstyled: an in-flow list of 245 rows with no border, no
   background and no row padding, which pushed the page down and scrolled the
   whole site instead of the list. A component whose appearance depends on an
   import somewhere else will eventually be dropped somewhere else. Next
   deduplicates these, so importing them here costs nothing. */
import "./phone-field.css";
import "./picker.css";

/**
 * A phone number field: country picker, dial code, and the number.
 *
 * WHY THIS EXISTS RATHER THAN A PLAIN `type="tel"`. The old field was one text
 * input with "+234 802 123 4567" as placeholder text, which asks the client to
 * know and type their own country code correctly and gives us no way to tell a
 * real number from a typo. This is the number we actually reach them on after
 * they have paid, so a silently wrong one is expensive.
 *
 * WHERE THE DATA COMES FROM. Dialling codes are generated from
 * libphonenumber-js into lib/dial-codes.ts -- see the note at the top of
 * scripts/gen-dial-codes.mjs for why they are not hand-written. Country NAMES
 * come from `Intl.DisplayNames`, which every browser already carries, so no
 * list of 245 spellings ships in the bundle or has to be maintained. Flags are
 * computed from the ISO code as regional indicator pairs, so no images either:
 * the whole control costs about two kilobytes of data.
 *
 * THE LIBRARY IS LOADED LATE AND ONLY FOR ITS JUDGEMENT. Formatting as you
 * type and deciding whether a number is valid are the two things worth ~30KB
 * gzipped, and neither is needed until somebody has started typing. So it
 * arrives on first interaction, and until it does the field still works --
 * just without the spacing. Nothing here blocks on it.
 *
 * ACCESSIBILITY. The picker is a button opening a listbox, not a div soup:
 * arrow keys move, Enter picks, Escape closes and puts focus back, and the
 * active option is announced through `aria-activedescendant`. The search box
 * takes focus on open, because searching is what the control is for.
 */

/* The house default. WDC is a Nigerian studio and the great majority of these
   forms are filled in from Nigeria, so this is the answer that is right most
   often -- not a guess dressed up as one. Anyone else changes it in one tap,
   and the picker opens straight onto a search box. */
const DEFAULT_ISO = "NG";

/** 🇳🇬 from "NG": two regional indicator symbols, computed rather than stored. */
function flagOf(iso: string) {
  return String.fromCodePoint(
    ...[...iso.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

/**
 * Does this platform actually draw flag emoji?
 *
 * WINDOWS DOES NOT, and never has: it renders the two regional indicator
 * letters instead, so a list of 245 countries becomes a list of 245 identical
 * grey letter pairs and the flag column is worse than no column. Rather than
 * ship an image sprite for every flag, the check is done once and the code
 * itself is shown instead, set as a small caps chip -- which is legible,
 * honest, and costs nothing.
 *
 * The test: draw one flag and draw one letter, and compare widths. A platform
 * that composes the pair into a flag produces something wider than a single
 * character and narrower than two.
 */
function supportsFlagEmoji() {
  try {
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    if (!ctx) return false;
    ctx.font = "16px sans-serif";
    const flag = ctx.measureText(flagOf("NG")).width;
    const letters = ctx.measureText("NG").width;
    /* Composed: one glyph, clearly narrower than the two letters side by side.
       Not composed: the two letters, so the widths match. */
    return flag < letters * 0.95;
  } catch {
    return false;
  }
}

/**
 * The national part, grouped the way that country groups it: "8021234567"
 * under +234 becomes "802 123 4567".
 *
 * IT FORMATS THE INTERNATIONAL STRING AND THEN TAKES THE PREFIX OFF, which
 * looks roundabout and is the only thing that works. `AsYouType(iso)` formats
 * the NATIONAL form, and a national form usually includes the trunk prefix --
 * so it produces nothing at all for a number typed without the leading zero,
 * which is exactly how someone types into a field that already shows +234.
 * Measured: "8021234567" through `AsYouType("NG")` comes back untouched, while
 * the same digits as "+2348021234567" come back as "+234 802 123 4567".
 *
 * It is also progressive, which is the whole point of an as-you-type
 * formatter: "80212" becomes "802 12" mid-word rather than waiting for a
 * complete number.
 */
function formatNational(
  m: typeof import("libphonenumber-js/max"),
  dial: string,
  digits: string,
) {
  if (!digits) return "";
  const full = new m.AsYouType().input(`+${dial}${digits}`);
  const prefix = `+${dial}`;
  return full.startsWith(prefix) ? full.slice(prefix.length).trim() : digits;
}

type Country = { iso: string; code: string; name: string };

export default function PhoneField({
  id,
  value,
  onChange,
  onValidity,
  invalid,
  describedBy,
}: {
  id: string;
  /** The whole number in international form, e.g. "+234 802 123 4567". */
  value: string;
  onChange: (v: string) => void;
  /** Told whether what is in the box is a real, dialable number. */
  onValidity?: (ok: boolean) => void;
  invalid?: boolean;
  describedBy?: string;
}) {
  const listId = useId();
  const [iso, setIso] = useState(DEFAULT_ISO);
  /* The national part only. The dial code is the picker's job and is never
     inside the text input, so it cannot be half-deleted by a backspace. */
  const [national, setNational] = useState("");
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  /* A LAZY INITIALISER, NOT AN EFFECT. Setting this from an effect paints the
     list once with emoji and then again with codes a frame later, which on
     Windows is a visible flicker of 245 rows -- and React now flags the
     cascading render. Reading it during the first render is safe here because
     this component never renders on the server (see the `ssr: false` mount in
     onboarding-mount.tsx), so there is no server HTML for it to disagree with,
     and the probe only touches a detached canvas it throws away. */
  const [flags] = useState(supportsFlagEmoji);

  const root = useRef<HTMLDivElement>(null);
  const numRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  /* The library, once it has arrived. A ref rather than state: it is a tool,
     not something the view renders, and swapping it should not re-render. */
  const lib = useRef<typeof import("libphonenumber-js/max") | null>(null);

  /* Names are resolved once, not per render: building 245 of them on every
     keystroke in the search box is work for nothing. */
  const countries = useMemo<Country[]>(() => {
    let name: (iso: string) => string;
    try {
      const dn = new Intl.DisplayNames(["en"], { type: "region" });
      name = (i) => dn.of(i) ?? i;
    } catch {
      name = (i) => i;
    }
    return DIAL_CODES.map((d) => ({ ...d, name: name(d.iso) }))
      .sort((x, y) => x.name.localeCompare(y.name));
  }, []);

  const current = useMemo(
    () => countries.find((c) => c.iso === iso) ?? countries[0],
    [countries, iso],
  );

  /* ------------------------------------------------------------ the library */

  /* The current pieces, readable from an async callback that resolved after
     the render it started in. */
  const live = useRef({ iso, national });
  /* Written in an effect, not during render: a ref assignment in the render
     body is a side effect on every render and React flags it. This one only
     mirrors state for an async callback to read, so the effect writes it and
     nothing sets state. */
  useEffect(() => { live.current = { iso, national }; }, [iso, national]);

  const loadLib = useCallback(async () => {
    if (lib.current) return lib.current;
    try {
      /* `/max`, NOT THE DEFAULT ENTRY POINT, AND THE DIFFERENCE IS A REAL
         BUG RATHER THAN A PREFERENCE.

         The default export ships the "min" metadata, which carries length
         ranges but not the per-country national number PATTERNS. It therefore
         accepts a number that is simply too long: measured on this machine,
         `parsePhoneNumber("70870412611", "NG").isValid()` returns TRUE on min
         and produces +23470870412611 -- fourteen digits, where a Nigerian
         number is thirteen. Somebody typing one digit too many was told their
         number was fine and we stored a number that cannot be called.

         `/mobile` also catches it and is only 24KB gzipped against max's 39,
         but it rejects LANDLINES -- a London 020 number fails it -- and this
         field is labelled "Phone", not "Mobile". 20KB more than min, paid only
         by somebody who has actually reached this field, is the right trade
         for not lying to them about their own number. */
      const m = await import("libphonenumber-js/max");
      lib.current = m;
      /* REFORMAT WHAT IS ALREADY IN THE BOX. The library arrives a moment
         after the field does, and a fast typist -- or anything that fills the
         form programmatically -- can get a whole number in before it lands.
         Without this the spacing simply never appears for that first number,
         which looks like the formatting is broken rather than late. */
      const { iso: i0, national: n0 } = live.current;
      const digits = n0.replace(/\D/g, "");
      if (digits) {
        const shown = formatNational(m, DIAL_BY_ISO.get(i0)?.code ?? "", digits);
        setNational(shown);
      }
      return m;
    } catch {
      /* A failed chunk is not a reason to break the field. Without the library
         the number is taken as typed and validated as "has enough digits",
         which is the behaviour this field had before it existed. */
      return null;
    }
  }, []);

  /* --------------------------------------------------- value in and out */

  /* HYDRATE ONCE, AT MOUNT, FROM A RESTORED DRAFT.
     The empty dependency list is deliberate and the eslint disable below says
     so. `value` changes on every keystroke -- it is this field's own output --
     so re-running on it would mean the component parsing and overwriting what
     the user is in the middle of typing.

     The one external change that is not ours is "Start over", and that unmounts
     this field on its way back to the welcome screen, so it remounts clean.
     There is nothing left for a watching effect to catch. */
  const lastPushed = useRef<string | null>(null);
  useEffect(() => {
    if (!value) return;
    let gone = false;
    (async () => {
      const m = await loadLib();
      if (!m || gone) return;
      try {
        const p = m.parsePhoneNumber(value);
        /* In a callback, not in the effect body: this is the answer coming
           back from an async load, which is exactly what effects are for. */
        if (p?.country) {
          setIso(p.country);
          setNational(formatNational(m, p.countryCallingCode as string, p.nationalNumber));
        }
      } catch { /* not parseable; leave the raw value in place */ }
    })();
    return () => { gone = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* One place where the pieces become the answer, so the stored value and the
     validity verdict can never disagree about what is in the box. */
  const push = useCallback(
    (nextIso: string, nextNational: string) => {
      const digits = nextNational.replace(/\D/g, "");
      const dial = DIAL_BY_ISO.get(nextIso)?.code ?? "";
      if (!digits) {
        lastPushed.current = "";
        onChange("");
        onValidity?.(false);
        return;
      }
      const m = lib.current;
      let out = `+${dial} ${nextNational}`;
      /* Without the library: E.164 says a number is between 4 and 15 digits.
         It is a weak test and it is the honest one -- anything stricter
         invented here would reject real numbers. */
      let ok = digits.length >= 4 && digits.length <= 15;
      if (m) {
        out = `+${dial} ${formatNational(m, dial, digits)}`.trim();
        try {
          ok = m.parsePhoneNumber(digits, nextIso as never)?.isValid() ?? false;
        } catch { ok = false; }
      }
      lastPushed.current = out;
      onChange(out);
      onValidity?.(ok);
    },
    [onChange, onValidity],
  );

  const setNumber = (raw: string) => {
    /* PASTING A FULL INTERNATIONAL NUMBER SHOULD JUST WORK. People copy
       "+44 20 7946 0958" out of an email; making them strip the country code
       by hand to satisfy a picker is the kind of small rudeness that makes
       forms feel hostile. If it starts with +, the country comes from the
       number and the picker follows it. */
    if (raw.trim().startsWith("+") && lib.current) {
      try {
        const p = lib.current.parsePhoneNumber(raw.trim());
        if (p?.country) {
          setIso(p.country);
          const nat = p.formatNational();
          setNational(nat);
          push(p.country, nat);
          return;
        }
      } catch { /* keep typing; it may not be a whole number yet */ }
    }
    const m = lib.current;
    const dial = DIAL_BY_ISO.get(iso)?.code ?? "";
    const shown = m ? formatNational(m, dial, raw.replace(/\D/g, "")) : raw;
    setNational(shown);
    push(iso, shown);
  };

  const pick = (nextIso: string) => {
    setIso(nextIso);
    setOpen(false);
    setQ("");
    push(nextIso, national);
    /* Straight into the number, because choosing a country is never the goal
       -- it is the step before typing the number. */
    requestAnimationFrame(() => numRef.current?.focus());
  };

  /* ------------------------------------------------------------- the list */
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return countries;
    const digits = s.replace(/\D/g, "");
    const starts: Country[] = [];
    const has: Country[] = [];
    const byCode: Country[] = [];
    for (const c of countries) {
      const n = c.name.toLowerCase();
      if (n.startsWith(s)) starts.push(c);
      else if (n.includes(s)) has.push(c);
      else if (digits && c.code.startsWith(digits)) byCode.push(c);
    }
    /* Prefix matches first: someone typing "ne" wants Nepal and the
       Netherlands at the top, not Benin and Senegal, even though those contain
       the letters too. */
    return [...starts, ...has, ...byCode];
  }, [countries, q]);

  /* Focus into the search box, keep the highlighted row in view while arrowing
     through 245 of them, and close on a click outside -- all shared with the
     select, so the two panels behave identically. */
  const close = useCallback(() => {
    setOpen(false);
    root.current?.querySelector("button")?.focus();
  }, []);
  usePickerOpen({ open, active, root, searchRef, listRef, onClose: close });

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((n) => Math.min(n + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((n) => Math.max(n - 1, 0)); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(results.length - 1); }
    else if (e.key === "Enter") { e.preventDefault(); if (results[active]) pick(results[active].iso); }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
  };

  return (
    <div className={`pk ph${invalid ? " is-bad" : ""}${open ? " is-open" : ""}`} ref={root}>
      <div className="ph__bar">
        <button
          type="button"
          className="ph__cc"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-label={`Country: ${current.name}, +${current.code}. Change`}
          onClick={() => { setOpen((o) => !o); void loadLib(); }}
        >
          <Flag c={current} flags={flags} />
          <ChevronDown aria-hidden="true" />
        </button>

        {/* The dial code sits OUTSIDE the text input on purpose. Inside it, it
            is one backspace away from being half-deleted into "+23", and every
            keystroke has to defend it. Out here it is the picker's output and
            cannot be damaged by typing. */}
        <span className="ph__dial" aria-hidden="true">+{current.code}</span>

        <input
          ref={numRef}
          id={id}
          className="ph__num"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          /* NO PLACEHOLDER. An example number is only ever right for one
             country, and the moment somebody picks another one it is quietly
             lying about the shape their number should take. The label above
             and the dial code beside it already say what goes here. */
          value={national}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          onFocus={() => void loadLib()}
          onChange={(e) => setNumber(e.target.value)}
        />
      </div>

      {open && (
        <div className="pk__pop">
          <div className="pk__search">
            <Search aria-hidden="true" />
            <input
              ref={searchRef}
              type="text"
              value={q}
              placeholder="Search for country"
              aria-label="Search for a country"
              aria-controls={listId}
              aria-activedescendant={results[active] ? `${listId}-${results[active].iso}` : undefined}
              /* The highlight resets HERE rather than in an effect watching
                 `q`. Same outcome, one render instead of two: typing a letter
                 and moving the highlight back to the top are one event, and
                 React flags the effect version as a cascading render. */
              onChange={(e) => { setQ(e.target.value); setActive(0); }}
              onKeyDown={onListKey}
            />
          </div>
          <ul data-lenis-prevent className="pk__list" id={listId} role="listbox" ref={listRef} aria-label="Countries">
            {results.map((c, n) => (
              <li
                key={c.iso}
                id={`${listId}-${c.iso}`}
                role="option"
                aria-selected={c.iso === iso}
                className={`pk__opt${n === active ? " is-active" : ""}${c.iso === iso ? " is-on" : ""}`}
                onPointerEnter={() => setActive(n)}
                /* MOUSE ONLY, AND THAT IS THE WHOLE BUG THIS FIXES.

                   `preventDefault` on pointerdown stops the press moving
                   focus out of the search box before the choice lands, which
                   is what it is here for. On a touch screen the same call
                   cancels the browser's pan gesture for that pointer -- so a
                   finger put down on a row to scroll the list could not scroll
                   it, and the page underneath took the swipe instead. That is
                   the "the dropdown will not scroll" fault exactly.

                   Touch does not need it: a tap does not steal focus the way a
                   mouse press does. The choice moved to `onClick`, which fires
                   for both and which a scroll gesture correctly cancels. */
                onPointerDown={(e) => { if (e.pointerType === "mouse") e.preventDefault(); }}
                onClick={() => pick(c.iso)}
              >
                <Flag c={c} flags={flags} />
                <span className="pk__label"><Mark name={c.name} q={q} /></span>
                <span className="pk__meta">(+{c.code})</span>
              </li>
            ))}
            {!results.length && (
              <li className="pk__none">No country matches &ldquo;{q}&rdquo;.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * A flag, or the country code where flags are not drawn.
 *
 * Declared out here rather than inside the field: a component defined during
 * render is a NEW component type on every render, so React unmounts and
 * remounts every one of its instances each time -- 245 of them in this list.
 */
function Flag({ c, flags }: { c: Country; flags: boolean }) {
  return flags
    ? <span className="ph__flag" aria-hidden="true">{flagOf(c.iso)}</span>
    : <span className="ph__iso" aria-hidden="true">{c.iso}</span>;
}
