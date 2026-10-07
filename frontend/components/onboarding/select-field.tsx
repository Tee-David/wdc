"use client";

import { useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Mark, usePickerOpen } from "./picker";

/* Its own look, not the page's to remember -- see the note in phone-field.tsx. */
import "./picker.css";

/**
 * A single-choice field: a button that opens a searchable list.
 *
 * WHY NOT THE NATIVE `<select>` IT REPLACES. The native popup is drawn by the
 * operating system, so it is the one part of this form that cannot be made to
 * match the rest of it -- on Windows it arrives as a bare white rectangle with
 * a blue bar through it, in the middle of a page that is otherwise entirely
 * ours, and in dark mode it is a white rectangle on a dark page. It also could
 * not be searched: twelve industries is already more than a list you read, and
 * the answer is usually one the client can name before they can find it.
 *
 * The old comment in onboarding.css said a custom listbox was "a lot of
 * keyboard and screen-reader work to own", which was true and is now paid for:
 * the phone field's country picker owns exactly this, so the work is done and
 * the two controls share it (see picker.tsx and picker.css). This is the same
 * control with a different list in it.
 *
 * ACCESSIBILITY. A button opening a listbox, not a div soup: arrow keys move,
 * Enter picks, Escape closes and puts focus back on the button, and the active
 * option is announced through `aria-activedescendant`. The search box takes
 * focus on open, because searching is what the control is for.
 */
export default function SelectField({
  id,
  options,
  value,
  onChange,
  invalid,
  describedBy,
  /** What the button says when nothing has been chosen yet. */
  placeholder = "Pick the closest",
  unavailable = {},
  renderOption,
}: {
  id: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  describedBy?: string;
  placeholder?: string;
  unavailable?: Record<string, string>;
  renderOption?: (value: string) => React.ReactNode;
}) {
  const listId = useId();
  const searchable = options.length > 10;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  const root = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => {
    const s = searchable ? q.trim().toLowerCase() : "";
    if (!s) return options;
    const starts: string[] = [];
    const has: string[] = [];
    for (const o of options) {
      const n = o.toLowerCase();
      if (n.startsWith(s)) starts.push(o);
      else if (n.includes(s)) has.push(o);
    }
    /* Prefix matches first, for the same reason the country list does it:
       someone typing "fa" wants "Fashion and apparel" at the top, not
       "Professional services" because it happens to contain the letters. */
    return [...starts, ...has];
  }, [options, q, searchable]);

  const close = () => {
    setOpen(false);
    setQ("");
    btnRef.current?.focus();
  };

  const pick = (o: string) => {
    if (unavailable[o]) return;
    onChange(o);
    setOpen(false);
    setQ("");
    /* Focus goes back to the button, not onward to the next field: this is one
       answer in a form, and deciding for someone that they are finished with
       the question they just answered is how you skip people past a mistake. */
    btnRef.current?.focus();
  };

  usePickerOpen({ open, active, root, searchRef, listRef, onClose: close });

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((n) => Math.min(n + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((n) => Math.max(n - 1, 0)); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(results.length - 1); }
    else if (e.key === "Enter") { e.preventDefault(); if (results[active]) pick(results[active]); }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
  };

  const openList = () => {
    /* The highlight starts on the current answer rather than at the top, so
       opening a field that is already answered shows you where you are. */
    const at = results.indexOf(value);
    setActive(at < 0 ? 0 : at);
    setOpen(true);
  };

  return (
    <div className={`pk sf${open ? " is-open" : ""}`} ref={root}>
      <button
        ref={btnRef}
        type="button"
        id={id}
        className={`sf__btn${value ? "" : " is-empty"}`}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onClick={() => (open ? close() : openList())}
      >
        <span className="sf__val">{value || placeholder}</span>
        <ChevronDown aria-hidden="true" />
      </button>

      {open && (
        <div className="pk__pop">
          {/* Below 560px this is the sheet's own grab handle; usePickerOpen
              attaches the drag-to-dismiss listener to it directly. Hidden
              above that width, where the panel is a dropdown with nothing
              to grab. */}
          <div className="pk__grab" aria-hidden="true" />
          {searchable ? <div className="pk__search">
            <Search aria-hidden="true" />
            <input
              ref={searchRef}
              type="text"
              value={q}
              placeholder="Search"
              aria-label="Search the options"
              aria-controls={listId}
              aria-activedescendant={
                results[active] ? `${listId}-${slug(results[active])}` : undefined
              }
              /* The highlight resets HERE rather than in an effect watching
                 `q`: same outcome, one render instead of two, and React flags
                 the effect version as a cascading render. */
              onChange={(e) => { setQ(e.target.value); setActive(0); }}
              onKeyDown={onListKey}
            />
          </div> : null}
          {/* data-lenis-prevent: Lenis calls preventDefault on EVERY wheel
              event while it owns the page, so a wheel over a nested panel like
              this one is cancelled and the panel never moves. The attribute is
              how Lenis is told to keep its hands off a subtree. It is inert
              when Lenis is not running (touch, reduced motion, narrow
              windows), so it costs nothing to leave in. */}
          <ul
            data-lenis-prevent
            className="pk__list"
            id={listId}
            role="listbox"
            ref={listRef}
            tabIndex={-1}
            aria-activedescendant={results[active] ? `${listId}-${slug(results[active])}` : undefined}
            onKeyDown={onListKey}
          >
            {results.map((o, n) => (
              <li
                key={o}
                id={`${listId}-${slug(o)}`}
                role="option"
                aria-selected={o === value}
                aria-disabled={Boolean(unavailable[o]) || undefined}
                className={`pk__opt${n === active ? " is-active" : ""}${o === value ? " is-on" : ""}`}
                onPointerEnter={(e) => { if (e.pointerType === "mouse") setActive(n); }}
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
                onClick={() => pick(o)}
              >
                <span className="pk__label">{renderOption ? renderOption(o) : <Mark name={o} q={q} />}</span>
              </li>
            ))}
            {!results.length && (
              <li className="pk__none">Nothing matches &ldquo;{q}&rdquo;.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/** An option's text, made safe to put in an id. */
function slug(o: string) {
  return o.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
