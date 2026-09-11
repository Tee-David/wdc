"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

/**
 * A dropdown you can type into.
 *
 * WHY NOT A NATIVE `<select>`. A native select is genuinely good on a phone --
 * it opens the platform's own wheel, which everyone already knows how to use
 * -- and genuinely poor on a desktop for a list of any length: no search, no
 * keyboard jump beyond first-letter, and no way to show the option you have
 * chosen alongside the ones you have not. This one is a select where a select
 * is enough and a searchable list where it is not.
 *
 * THE THRESHOLD IS A REAL DECISION, not a default. Below `SEARCH_FROM` options
 * the search box is dead weight: it costs a tap, it costs a keyboard opening
 * over the list, and a reader can see every option at once anyway. Above it,
 * scanning becomes work and typing three letters beats scrolling. Twelve
 * industries do not need a search box; two hundred countries do.
 *
 * MULTI-SELECT USES THE SAME CONTROL, which matters because a form with two
 * different dropdown idioms teaches the reader nothing twice. Chosen values
 * become removable chips above the list, the list stays open while picking,
 * and a tick marks what is in.
 */

/** Search appears from this many options up. See the note above. */
const SEARCH_FROM = 9;

export default function SearchableSelect({
  id,
  options,
  value,
  onChange,
  multiple = false,
  placeholder = "Choose one",
  invalid,
  describedBy,
}: {
  id: string;
  options: string[];
  value: string | string[];
  onChange: (v: string | string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const picked = useMemo(
    () => (Array.isArray(value) ? value : value ? [value] : []),
    [value],
  );
  const searchable = options.length >= SEARCH_FROM;

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options;
    const starts = options.filter((o) => o.toLowerCase().startsWith(s));
    const has = options.filter(
      (o) => !o.toLowerCase().startsWith(s) && o.toLowerCase().includes(s),
    );
    return [...starts, ...has];
  }, [options, q]);

  useEffect(() => {
    if (!open) return;
    if (searchable) requestAnimationFrame(() => searchRef.current?.focus());
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open, searchable]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const choose = (o: string) => {
    if (multiple) {
      /* The list stays open. Picking three things from a list that shuts after
         each one means opening it three times, which is the single most
         irritating thing a multi-select can do. */
      onChange(picked.includes(o) ? picked.filter((x) => x !== o) : [...picked, o]);
      return;
    }
    onChange(o);
    setOpen(false);
    setQ("");
    btn.current?.focus();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((n) => Math.min(n + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((n) => Math.max(n - 1, 0)); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(results.length - 1); }
    else if (e.key === "Enter" && results[active]) { e.preventDefault(); choose(results[active]); }
    else if (e.key === "Escape") { e.preventDefault(); setOpen(false); btn.current?.focus(); }
  };

  const label = picked.length
    ? multiple
      ? `${picked.length} selected`
      : picked[0]
    : placeholder;

  return (
    <div className={`ss${invalid ? " is-bad" : ""}${open ? " is-open" : ""}`} ref={root}>
      <button
        ref={btn}
        id={id}
        type="button"
        className={`ss__btn${picked.length ? "" : " is-empty"}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        /* `aria-invalid` does NOT belong on a button -- the role does not
           support it and a screen reader will ignore it. The invalid state is
           carried by the error message this points at instead, which is what
           actually gets read out. */
        aria-describedby={describedBy}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          /* Down-arrow opens without a click, which is what a native select
             does and what anyone driving by keyboard will try first. */
          if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="ss__val">{label}</span>
        <ChevronDown aria-hidden="true" />
      </button>

      {/* Chips, so a multi-select says what is in it without being opened.
          "3 selected" on the button is a count, not an answer. */}
      {multiple && picked.length > 0 && (
        <ul className="ss__chips">
          {picked.map((o) => (
            <li key={o}>
              <button
                type="button"
                onClick={() => onChange(picked.filter((x) => x !== o))}
                aria-label={`Remove ${o}`}
              >
                {o} <X aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="ss__pop">
          {searchable && (
            <div className="ss__search">
              <Search aria-hidden="true" />
              <input
                ref={searchRef}
                type="text"
                value={q}
                placeholder="Type to filter"
                aria-label="Filter the list"
                aria-controls={listId}
                onChange={(e) => { setQ(e.target.value); setActive(0); }}
                onKeyDown={onKey}
              />
            </div>
          )}
          <ul
            className="ss__list"
            id={listId}
            role="listbox"
            aria-multiselectable={multiple || undefined}
            ref={listRef}
            tabIndex={searchable ? -1 : 0}
            onKeyDown={searchable ? undefined : onKey}
          >
            {results.map((o, n) => {
              const on = picked.includes(o);
              return (
                <li
                  key={o}
                  role="option"
                  aria-selected={on}
                  className={`ss__opt${n === active ? " is-active" : ""}${on ? " is-on" : ""}`}
                  onPointerEnter={() => setActive(n)}
                  onPointerDown={(e) => { e.preventDefault(); choose(o); }}
                >
                  <span className="ss__tick" aria-hidden="true">{on ? <Check /> : null}</span>
                  <Mark text={o} q={q} />
                </li>
              );
            })}
            {!results.length && <li className="ss__none">Nothing matches &ldquo;{q}&rdquo;.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Bolds the part of an option the filter actually matched. */
function Mark({ text, q }: { text: string; q: string }) {
  const s = q.trim();
  if (!s) return <>{text}</>;
  const at = text.toLowerCase().indexOf(s.toLowerCase());
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <b>{text.slice(at, at + s.length)}</b>
      {text.slice(at + s.length)}
    </>
  );
}
