"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import "./pick.css";

/**
 * THE ADMIN'S OWN PICKERS, replacing the browser's select, date and time
 * inputs (the owner's call, AGENTS.md; the look is the design system
 * artifact's). A native popup is drawn by the operating system: a grey
 * Windows list on a navy dark theme, a date field that reads 09/14 on one
 * laptop and 14/09 on the next.
 *
 * Every picker is a button showing the choice, a popover under it (over it
 * near the foot of the window, a bottom sheet on a phone), and a hidden input
 * that posts exactly what the native control would have, so the server
 * actions and GET filter forms that read them do not change.
 *
 * THE POPOVER IS PORTALLED to the nearest dialog, else the admin root. Out of
 * a <label> so a click inside it is not re-routed to the trigger by the
 * label's own activation; out of a scrolling table or panel so nothing clips
 * it; but never out of a <dialog>, whose top layer would paint over it.
 */

export type PickOption = { value: string; label: string };
type Place = { top?: number; bottom?: number; left: number; width: number; up: boolean; host: Element; skin?: string };

function usePopover(open: boolean, close: () => void, trigger: React.RefObject<HTMLElement | null>, minWidth = 0, tall = 320, maxWidth = Infinity) {
  const pop = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<Place | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const t = trigger.current;
      if (!t) return;
      const r = t.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const width = Math.min(Math.max(Math.min(r.width, maxWidth), minWidth), vw - 16);
      const left = Math.max(8, Math.min(r.left, vw - width - 8));
      const below = window.innerHeight - r.bottom;
      const up = below < tall && r.top > below;
      const host = t.closest("dialog") ?? t.closest(".ad") ?? document.body;
      /* Outside the admin (a public form), the popover takes that page's skin. */
      const skin = t.closest("[data-pick-skin]")?.getAttribute("data-pick-skin") ?? undefined;
      setPlace(up ? { bottom: window.innerHeight - r.top + 6, left, width, up, host, skin } : { top: r.bottom + 6, left, width, up, host, skin });
    };
    measure();
    const later = () => { if (!frame) frame = requestAnimationFrame(measure); };
    window.addEventListener("resize", later);
    window.addEventListener("scroll", later, { capture: true, passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", later);
      window.removeEventListener("scroll", later, { capture: true } as EventListenerOptions);
    };
  }, [open, trigger, minWidth, tall, maxWidth]);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!trigger.current?.contains(t) && !pop.current?.contains(t)) close();
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open, close, trigger]);

  return { pop, place: open ? place : null };
}

/* Tell the form, as a native control would, so a watcher on "change" (the
   invoice builder's project list follows the client) hears the choice. The
   first render is not a change. */
function useChangeEvent(value: string) {
  const hidden = useRef<HTMLInputElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    hidden.current?.dispatchEvent(new Event("change", { bubbles: true }));
  }, [value]);
  return hidden;
}

function Popover({ place, pop, className, children, label }: {
  place: Place | null; pop: React.RefObject<HTMLDivElement | null>; className?: string; children: React.ReactNode; label?: string;
}) {
  if (!place) return null;
  return createPortal(
    <>
      <div className={`adPick__scrim${place.skin ? ` adPick--${place.skin}` : ""}`} aria-hidden="true" />
      <div ref={pop} className={`adPick__pop${place.up ? " is-up" : ""}${place.skin ? ` adPick--${place.skin}` : ""}${className ? ` ${className}` : ""}`}
           role={label ? "dialog" : undefined} aria-label={label}
           style={{ top: place.top, bottom: place.bottom, left: place.left, width: place.width }}>
        <div className="adPick__grab" aria-hidden="true" />
        {children}
      </div>
    </>,
    place.host,
  );
}

/* ------------------------------------------------------------------ select */

/**
 * A SELECT. Searchable above ten options (AGENTS.md), and wherever the
 * caller says the list can grow; otherwise a plain list that still takes
 * type-ahead, as a native one does.
 */
export function Pick({
  id, name, options, value: held, defaultValue = "", onChange, placeholder, search, invalid, describedBy, className, label, labelledBy,
}: {
  id?: string;
  /** Posted under this name. Leave it out for a control whose caller posts. */
  name?: string;
  options: PickOption[];
  /** Controlled, when the caller holds the value. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Offered as the empty choice, unless an option already has the value "". */
  placeholder?: string;
  search?: boolean;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
  /** A name for a picker with no <label> of its own. */
  label?: string;
  /** The id of the element that names it, when that is not a <label for>. */
  labelledBy?: string;
}) {
  const auto = useId();
  const tid = id ?? auto;
  const [own, setOwn] = useState(defaultValue);
  const value = held ?? own;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ s: "", at: 0 });
  const listId = useId();
  const searchable = search ?? options.length > 10;

  const all = useMemo(
    () => (placeholder !== undefined && !options.some((o) => o.value === "") ? [{ value: "", label: placeholder }, ...options] : options),
    [options, placeholder],
  );
  const shown = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase();
    return needle ? all.filter((o) => o.value && o.label.toLocaleLowerCase().includes(needle)) : all;
  }, [all, q]);
  /* A choice the list no longer offers (a project of the client who was
     picked before) is not posted; the field reads as unset instead. */
  const chosen = all.find((o) => o.value === value);
  const posted = chosen ? value : "";
  const hidden = useChangeEvent(posted);

  const close = useCallback(() => { setOpen(false); setQ(""); }, []);
  const { pop, place } = usePopover(open, close, trigger, 208, 300);

  useEffect(() => {
    if (!place) return;
    (searchable ? field.current : list.current)?.focus({ preventScroll: true });
  }, [place, searchable]);
  useEffect(() => {
    if (open) list.current?.querySelector(`[data-n="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open, place]);

  const show = () => { setActive(Math.max(0, all.findIndex((o) => o.value === value))); setOpen(true); };
  const pick = (v: string) => {
    if (held === undefined) setOwn(v);
    if (v !== value) onChange?.(v);
    close();
    trigger.current?.focus();
  };
  /* Type-ahead, as a native list has: letters typed within a moment of each
     other are one word, and a lone repeated letter walks through the matches. */
  const jump = (key: string, from: number) => {
    const now = Date.now();
    const t = typed.current;
    t.s = now - t.at < 700 ? t.s + key.toLowerCase() : key.toLowerCase();
    t.at = now;
    const same = t.s.split("").every((c) => c === t.s[0]);
    const needle = same ? t.s[0] : t.s;
    const order = [...shown.slice(from + (same ? 1 : 0)), ...shown.slice(0, from + (same ? 1 : 0))];
    const hit = order.find((o) => o.label.toLowerCase().startsWith(needle));
    return hit ? shown.indexOf(hit) : -1;
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, shown.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(shown.length - 1); }
    else if (e.key === "PageDown") { e.preventDefault(); setActive((a) => Math.min(a + 8, shown.length - 1)); }
    else if (e.key === "PageUp") { e.preventDefault(); setActive((a) => Math.max(a - 8, 0)); }
    else if (e.key === "Enter" || (e.key === " " && !searchable)) { e.preventDefault(); if (shown[active]) pick(shown[active].value); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); trigger.current?.focus(); }
    else if (e.key === "Tab") close();
    else if (!searchable && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const n = jump(e.key, active);
      if (n >= 0) setActive(n);
    }
  };

  return (
    <div className={`adPick${open ? " is-open" : ""}${className ? ` ${className}` : ""}`}>
      {name ? <input ref={hidden} type="hidden" name={name} value={posted} /> : null}
      <button
        ref={trigger} id={tid} type="button" className="adPick__btn"
        aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined}
        aria-label={label} aria-labelledby={labelledBy}
        data-invalid={invalid || undefined}
        aria-describedby={[`${tid}-value`, describedBy].filter(Boolean).join(" ")}
        onClick={() => (open ? close() : show())}
        onKeyDown={(e) => {
          if (open) return;
          if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") { e.preventDefault(); show(); }
          else if (!searchable && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const n = jump(e.key, Math.max(0, all.findIndex((o) => o.value === value)));
            show();
            if (n >= 0) setActive(n);
          }
        }}
      >
        {/* The label names the field; this says what is chosen. */}
        <span id={`${tid}-value`} className={chosen?.value ? undefined : "adPick__ph"}>{chosen?.label ?? placeholder ?? "Pick one"}</span>
        <ChevronDown aria-hidden="true" />
      </button>
      <Popover place={place} pop={pop}>
        {searchable ? (
          <label className="adPick__search">
            <Search aria-hidden="true" />
            <span className="ad__sr">Search</span>
            <input
              ref={field} value={q} placeholder="Type to search"
              role="combobox" aria-expanded="true" aria-controls={listId} aria-autocomplete="list"
              aria-activedescendant={shown[active] ? `${listId}-${active}` : undefined}
              onChange={(e) => { setQ(e.target.value); setActive(0); }} onKeyDown={onKey}
            />
          </label>
        ) : null}
        <ul ref={list} id={listId} role="listbox" className="adPick__list" data-lenis-prevent
            aria-labelledby={tid} tabIndex={searchable ? undefined : -1}
            aria-activedescendant={!searchable && shown[active] ? `${listId}-${active}` : undefined}
            onKeyDown={searchable ? undefined : onKey}>
          {shown.map((o, n) => (
            <li key={o.value || "none"} id={`${listId}-${n}`} data-n={n} data-value={o.value} role="option" aria-selected={o.value === value}
                className={`adPick__opt${n === active ? " is-active" : ""}${o.value ? "" : " adPick__opt--none"}`}
                onPointerEnter={() => setActive(n)}
                onPointerDown={(e) => { if (e.pointerType === "mouse") e.preventDefault(); }}
                onClick={() => pick(o.value)}>
              <span>{o.label}</span>
              {o.value === value ? <Check aria-hidden="true" /> : null}
            </li>
          ))}
          {!shown.length ? <li className="adPick__none">No matches for &ldquo;{q}&rdquo;.</li> : null}
        </ul>
      </Popover>
    </div>
  );
}

/**
 * A picker in a list's GET filter row, which the pages render from the server.
 * Still a <label>, so the rows' layout rules hold, but the button is named by
 * the label's words alone rather than by them plus whatever is chosen.
 */
export function FilterPick({ label, hideLabel, className, name, defaultValue, options, placeholder, search }: {
  label: string; hideLabel?: boolean; className?: string;
  name: string; defaultValue?: string; options: PickOption[]; placeholder?: string; search?: boolean;
}) {
  const id = useId();
  return (
    <label className={className}>
      <span id={`${id}-l`} className={hideLabel ? "ad__sr" : undefined}>{label}</span>
      <Pick name={name} defaultValue={defaultValue} options={options} placeholder={placeholder} search={search} labelledBy={`${id}-l`} />
    </label>
  );
}

/* -------------------------------------------------------------------- date */

/* Written from fixed tables, not toLocaleDateString: Node's ICU and Chrome's
   disagree on en-GB punctuation, and a server and client that render
   different text for one date is a hydration failure (see form.tsx). */
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ISO = /^\d{4}-\d{2}-\d{2}$/;

const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (y: number, m: number, d: number) => {
  const t = new Date(Date.UTC(y, m, d));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
};
const at = (iso: string) => new Date(`${iso}T12:00:00Z`);
const addDays = (iso: string, n: number) => { const d = at(iso); return isoOf(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n); };
/** Same day of the month, clamped: 31 January plus a month is 28 or 29 February. */
const addMonths = (iso: string, n: number) => {
  const d = at(iso);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n + 1, 0)).getUTCDate();
  return isoOf(d.getUTCFullYear(), d.getUTCMonth() + n, Math.min(d.getUTCDate(), last));
};
/** The studio's calendar day (UTC+1, no daylight saving), which is what every admin date means. */
const studioToday = () => new Date(Date.now() + 3_600_000).toISOString().slice(0, 10);

/** "Mon, 14 Sep 2026": one reading for everybody, where 09/14 and 14/09 are not. */
export function shortDate(iso: string) {
  if (!ISO.test(iso)) return "";
  const d = at(iso);
  return `${DAYS[d.getUTCDay()].slice(0, 3)}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCFullYear()}`;
}
const longDate = (iso: string) => { const d = at(iso); return `${DAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };

/**
 * A DATE, from a month calendar. Arrows move a day or a week, Page Up and
 * Page Down a month (with Shift, a year), Home and End the ends of the week,
 * Enter picks, Escape closes. Weeks start on Monday. Posts YYYY-MM-DD.
 */
export function DateInput({
  id, name, value: held, defaultValue = "", onChange, min, max, invalid, describedBy, required, placeholder = "Pick a date", clearable = true, label,
}: {
  id?: string; name?: string;
  value?: string; defaultValue?: string; onChange?: (iso: string) => void;
  min?: string; max?: string;
  invalid?: boolean; describedBy?: string; required?: boolean;
  placeholder?: string;
  /** Offer "Clear". Off for a date the form cannot be without. */
  clearable?: boolean;
  /** A name, where no <label for> can point at it. */
  label?: string;
}) {
  const auto = useId();
  const tid = id ?? auto;
  const [own, setOwn] = useState(ISO.test(defaultValue) ? defaultValue : "");
  const value = held ?? own;
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState("");
  /* Days to pick a date; months and years to get there fast. The title is the
     way up (a month, then a decade of years); a choice is the way back down. */
  const [mode, setMode] = useState<"days" | "months" | "years">("days");
  const trigger = useRef<HTMLButtonElement>(null);
  const hidden = useChangeEvent(value);
  const titleId = useId();

  const close = useCallback(() => setOpen(false), []);
  /* A month is seven columns: wider than about 22rem it only spreads out. */
  const { pop, place } = usePopover(open, close, trigger, 300, 420, 352);

  const allowed = (iso: string) => (!min || iso >= min) && (!max || iso <= max);
  const show = () => { setCursor(value || studioToday()); setMode("days"); setOpen(true); };
  /* The same day in another month or year, clamped (31 March to February is the 28th or 29th). */
  const jumpTo = (y: number, m: number) => {
    const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    setCursor(isoOf(y, m, Math.min(at(cursor).getUTCDate(), last)));
  };
  const pick = (iso: string) => {
    if (iso && !allowed(iso)) return;
    if (held === undefined) setOwn(iso);
    if (iso !== value) onChange?.(iso);
    close();
    trigger.current?.focus();
  };

  /* The focused day (or month, or year) follows the cursor, including across a
     month change and a change of view. */
  useEffect(() => {
    if (!place || !cursor) return;
    const d = at(cursor);
    const sel = mode === "days" ? `[data-iso="${cursor}"]` : mode === "months" ? `[data-m="${d.getUTCMonth()}"]` : `[data-y="${d.getUTCFullYear()}"]`;
    pop.current?.querySelector<HTMLButtonElement>(sel)?.focus({ preventScroll: true });
  }, [cursor, place, pop, mode]);

  /* Arrows in the month and year grids: four across. */
  const onPicks = (e: React.KeyboardEvent) => {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -4, ArrowDown: 4 };
    if (!(e.key in step)) return;
    e.preventDefault();
    const d = at(cursor);
    if (mode === "months") {
      const n = d.getUTCMonth() + step[e.key];
      jumpTo(d.getUTCFullYear() + Math.floor(n / 12), ((n % 12) + 12) % 12);
    } else jumpTo(d.getUTCFullYear() + step[e.key], d.getUTCMonth());
  };

  const onGrid = (e: React.KeyboardEvent) => {
    const moves: Record<string, () => string> = {
      ArrowLeft: () => addDays(cursor, -1),
      ArrowRight: () => addDays(cursor, 1),
      ArrowUp: () => addDays(cursor, -7),
      ArrowDown: () => addDays(cursor, 7),
      PageUp: () => addMonths(cursor, e.shiftKey ? -12 : -1),
      PageDown: () => addMonths(cursor, e.shiftKey ? 12 : 1),
      Home: () => addDays(cursor, -((at(cursor).getUTCDay() + 6) % 7)),
      End: () => addDays(cursor, 6 - ((at(cursor).getUTCDay() + 6) % 7)),
    };
    if (moves[e.key]) { e.preventDefault(); setCursor(moves[e.key]()); }
  };
  const onPop = (e: React.KeyboardEvent) => {
    /* Escape backs out of the month or year view first, then closes. */
    if (e.key === "Escape" && mode !== "days") { e.preventDefault(); e.stopPropagation(); setMode(mode === "years" ? "months" : "days"); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); trigger.current?.focus(); }
    /* Tab stays inside while it is open, like a small dialog. */
    else if (e.key === "Tab") {
      const stops = [...(pop.current?.querySelectorAll<HTMLElement>("button:not([disabled]):not([tabindex='-1'])") ?? [])];
      const i = stops.indexOf(document.activeElement as HTMLElement);
      if (stops.length && (e.shiftKey ? i <= 0 : i === stops.length - 1)) {
        e.preventDefault();
        stops[e.shiftKey ? stops.length - 1 : 0].focus();
      }
    }
  };

  const today = open ? studioToday() : "";
  const view = cursor ? at(cursor) : null;
  const weeks: string[][] = [];
  if (view) {
    const y = view.getUTCFullYear(), m = view.getUTCMonth();
    const lead = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7;
    const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const cells = [...Array(lead).fill(""), ...Array.from({ length: days }, (_, i) => isoOf(y, m, i + 1))];
    while (cells.length % 7) cells.push("");
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div className={`adPick adDate${open ? " is-open" : ""}`}>
      {name ? <input ref={hidden} type="hidden" name={name} value={value} /> : null}
      <button
        ref={trigger} id={tid} type="button" className="adPick__btn"
        aria-haspopup="dialog" aria-expanded={open} aria-label={label}
        data-invalid={invalid || undefined}
        aria-describedby={[`${tid}-value`, describedBy].filter(Boolean).join(" ")}
        onClick={() => (open ? close() : show())}
        onKeyDown={(e) => { if (!open && e.key === "ArrowDown") { e.preventDefault(); show(); } }}
      >
        <span id={`${tid}-value`} className={value ? undefined : "adPick__ph"}>
          {value ? shortDate(value) : placeholder}
        </span>
        <CalendarDays aria-hidden="true" />
      </button>
      <Popover place={place} pop={pop} className="adCal" label="Choose a date">
        {view ? (
          <div onKeyDown={onPop}>
            {mode === "days" ? (
              <>
                <div className="adCal__head">
                  <button type="button" className="adCal__nav" aria-label="Previous month" onClick={() => setCursor(addMonths(cursor, -1))}>
                    <ChevronLeft aria-hidden="true" />
                  </button>
                  <button type="button" className="adCal__title" id={titleId} aria-live="polite"
                          aria-label={`${MONTHS[view.getUTCMonth()]} ${view.getUTCFullYear()}. Choose a month or year`}
                          onClick={() => setMode("months")}>
                    {MONTHS[view.getUTCMonth()]} {view.getUTCFullYear()} <ChevronDown aria-hidden="true" />
                  </button>
                  <button type="button" className="adCal__nav" aria-label="Next month" onClick={() => setCursor(addMonths(cursor, 1))}>
                    <ChevronRight aria-hidden="true" />
                  </button>
                </div>
                <table className="adCal__grid" role="grid" aria-labelledby={titleId} onKeyDown={onGrid}>
                  <thead>
                    <tr>{["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d, i) => <th key={d} scope="col" abbr={DAYS[(i + 1) % 7]}>{d}</th>)}</tr>
                  </thead>
                  <tbody>
                    {weeks.map((w, r) => (
                      <tr key={r}>
                        {w.map((iso, c) => iso ? (
                          <td key={iso} aria-selected={iso === value}>
                            <button
                              type="button" data-iso={iso} tabIndex={iso === cursor ? 0 : -1}
                              className={`adCal__day${iso === value ? " is-on" : ""}${iso === today ? " is-today" : ""}`}
                              aria-label={longDate(iso)} aria-current={iso === today ? "date" : undefined}
                              aria-disabled={!allowed(iso) || undefined}
                              onClick={() => pick(iso)} onFocus={() => iso !== cursor && setCursor(iso)}
                            >
                              {Number(iso.slice(8))}
                            </button>
                          </td>
                        ) : <td key={`b${c}`} />)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : mode === "months" ? (
              <>
                <div className="adCal__head">
                  <button type="button" className="adCal__nav" aria-label="Previous year" onClick={() => jumpTo(view.getUTCFullYear() - 1, view.getUTCMonth())}>
                    <ChevronLeft aria-hidden="true" />
                  </button>
                  <button type="button" className="adCal__title" aria-live="polite" aria-label={`${view.getUTCFullYear()}. Choose a year`} onClick={() => setMode("years")}>
                    {view.getUTCFullYear()} <ChevronDown aria-hidden="true" />
                  </button>
                  <button type="button" className="adCal__nav" aria-label="Next year" onClick={() => jumpTo(view.getUTCFullYear() + 1, view.getUTCMonth())}>
                    <ChevronRight aria-hidden="true" />
                  </button>
                </div>
                <div className="adCal__picks" role="group" aria-label={`Months of ${view.getUTCFullYear()}`} onKeyDown={onPicks}>
                  {MONTHS.map((name, m) => {
                    const on = Boolean(value) && at(value).getUTCFullYear() === view.getUTCFullYear() && at(value).getUTCMonth() === m;
                    return (
                      <button key={name} type="button" data-m={m} tabIndex={m === view.getUTCMonth() ? 0 : -1}
                              className={`adCal__pick${on ? " is-on" : ""}${m === view.getUTCMonth() ? " is-here" : ""}`}
                              aria-label={`${name} ${view.getUTCFullYear()}`} aria-pressed={on}
                              onClick={() => { jumpTo(view.getUTCFullYear(), m); setMode("days"); }}>
                        {name.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (() => {
              const start = view.getUTCFullYear() - (view.getUTCFullYear() % 12);
              return (
                <>
                  <div className="adCal__head">
                    <button type="button" className="adCal__nav" aria-label="Earlier years" onClick={() => jumpTo(view.getUTCFullYear() - 12, view.getUTCMonth())}>
                      <ChevronLeft aria-hidden="true" />
                    </button>
                    <b className="adCal__range" aria-live="polite">{start} – {start + 11}</b>
                    <button type="button" className="adCal__nav" aria-label="Later years" onClick={() => jumpTo(view.getUTCFullYear() + 12, view.getUTCMonth())}>
                      <ChevronRight aria-hidden="true" />
                    </button>
                  </div>
                  <div className="adCal__picks" role="group" aria-label="Years" onKeyDown={onPicks}>
                    {Array.from({ length: 12 }, (_, i) => start + i).map((y) => {
                      const on = Boolean(value) && at(value).getUTCFullYear() === y;
                      return (
                        <button key={y} type="button" data-y={y} tabIndex={y === view.getUTCFullYear() ? 0 : -1}
                                className={`adCal__pick${on ? " is-on" : ""}${y === view.getUTCFullYear() ? " is-here" : ""}`}
                                aria-pressed={on}
                                onClick={() => { jumpTo(y, view.getUTCMonth()); setMode("months"); }}>
                          {y}
                        </button>
                      );
                    })}
                  </div>
                </>
              );
            })()}
            <div className="adCal__foot">
              <button type="button" className="ad__btn ad__btn--plain" disabled={!allowed(studioToday())} onClick={() => pick(studioToday())}>Today</button>
              {clearable && !required && value ? (
                <button type="button" className="ad__btn ad__btn--plain" onClick={() => pick("")}>Clear</button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Popover>
    </div>
  );
}

/* -------------------------------------------------------------- date + time */

const TIMES: PickOption[] = Array.from({ length: 96 }, (_, i) => {
  const v = `${pad(Math.floor(i / 4))}:${pad((i % 4) * 15)}`;
  return { value: v, label: v };
});

/**
 * A DATE AND A TIME, posted as one YYYY-MM-DDTHH:MM, which is what a native
 * datetime-local posts. The time is in quarter hours, searchable ("14" finds
 * the afternoon); a date picked with no time yet takes nine in the morning.
 */
export function DateTimeInput({ id, name, defaultValue = "", min, invalid, describedBy }: {
  id?: string; name: string; defaultValue?: string; min?: string; invalid?: boolean; describedBy?: string;
}) {
  const auto = useId();
  const tid = id ?? auto;
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(defaultValue);
  const [day, setDay] = useState(m?.[1] ?? "");
  const [time, setTime] = useState(m?.[2] ?? "");
  const posted = day ? `${day}T${time || "09:00"}` : "";
  const hidden = useChangeEvent(posted);
  const times = useMemo(() => (TIMES.some((t) => t.value === time) || !time ? TIMES : [{ value: time, label: time }, ...TIMES]), [time]);
  return (
    <div className="adDT">
      <input ref={hidden} type="hidden" name={name} value={posted} />
      <DateInput id={tid} value={day} min={min?.slice(0, 10)} invalid={invalid} describedBy={describedBy}
                 onChange={(d) => { setDay(d); if (d && !time) setTime("09:00"); if (!d) setTime(""); }} />
      <Pick className="adDT__time" options={times} value={time} placeholder="Time" search label="Time"
            onChange={(t) => setTime(t)} />
    </div>
  );
}
