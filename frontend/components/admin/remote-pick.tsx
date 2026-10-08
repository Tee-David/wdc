"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Plus, Search, X } from "lucide-react";
import { searchOptions, type SearchKind, type SearchResult, type SearchScope } from "@/lib/admin/search-actions";
import type { SearchRow } from "@/lib/admin/search-rank";
import { SEARCH_LIMIT } from "@/lib/admin/search-rank";
import { Popover, useChangeEvent, usePopover } from "./pick";
import { Wrap, useKept, useKeptList } from "./form";
import "./pick.css";

/**
 * A PICKER OVER A LIST THAT GROWS (clients, projects, staff, contacts, tags,
 * invoices), asked of the server instead of shipped to the browser.
 *
 * It looks and behaves like `Pick` (components/admin/pick.tsx): a button that
 * shows the choice, a popover under it (a bottom sheet on a phone), a search
 * box that is a combobox, arrow / Home / End / Page keys, Enter to pick, Escape
 * to close, and a hidden input that posts the value under `name`.
 *
 * What differs is where the options come from:
 *  - The first twenty load when it opens; typing asks again after 200ms of quiet.
 *    An answer that arrives after a newer question is thrown away, so a slow
 *    request for "ac" can never overwrite the list for "acme". (A server action
 *    cannot be aborted once sent; its answer is simply ignored.)
 *  - Six rows or so show at a time; the twenty scroll inside the popover. More
 *    than twenty matches says so and asks the person to type more, so nobody is
 *    silently cut off the way a fixed LIMIT used to cut them off.
 *  - A chosen value always shows by name, even when it is not among the twenty:
 *    the server renders `defaultValue` + `defaultLabel` (no list shipped), a
 *    value with no label is resolved with one small request, and a label picked
 *    here is remembered.
 *  - Loading, empty, no-access and error states are written out, with a retry.
 *
 * The permission is checked in the server action (lib/admin/search-actions.ts),
 * not here: a hidden picker is a courtesy, the action is the lock.
 */

export type RemoteLead = { value: string; label: string };

type Remote = { rows: SearchRow[]; selected: SearchRow[]; more: boolean; loading: boolean; error: SearchResult["error"] | null; answered: boolean };
const QUIET: Remote = { rows: [], selected: [], more: false, loading: false, error: null, answered: false };

/** One live search: re-asked when the text, the kind or the scope change; stale answers are ignored. */
function useRemote(kind: SearchKind, scope: SearchScope | undefined, open: boolean, q: string, chosen: string[]) {
  const [state, setState] = useState<Remote>(QUIET);
  const [again, setAgain] = useState(0);
  /* The latest scope and choices are read inside the timer, so a new array each render does not restart the search. */
  const latest = useRef({ scope, chosen });
  useEffect(() => { latest.current = { scope, chosen }; });
  const scopeKey = JSON.stringify(scope ?? {});
  /* Closing forgets the last answer, so the next opening starts at "searching" rather than flashing the old list. */
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) { setWasOpen(open); if (!open) setState(QUIET); }

  useEffect(() => {
    if (!open) return;
    let stale = false;
    /* The first page is asked for at once; typing waits for 200ms of quiet. */
    const timer = window.setTimeout(() => {
      setState((s) => ({ ...s, loading: true, error: null }));
      searchOptions(kind, q, latest.current.chosen, latest.current.scope)
        .then((r) => { if (!stale) setState({ rows: r.rows, selected: r.selected, more: r.more, loading: false, error: r.error ?? null, answered: true }); })
        .catch(() => { if (!stale) setState((s) => ({ ...s, loading: false, error: "failed" })); });
    }, q ? 200 : 0);
    return () => { window.clearTimeout(timer); stale = true; };
  }, [open, q, kind, scopeKey, again]);

  return { ...(open ? { ...state, loading: state.loading || (!state.answered && !state.error) } : QUIET), retry: useCallback(() => setAgain((n) => n + 1), []) };
}

const ERRORS: Record<NonNullable<SearchResult["error"]>, string> = {
  denied: "You do not have access to this list.",
  busy: "That was a lot of searches at once. Wait a few seconds and try again.",
  failed: "The search is not available just now.",
};

/* ------------------------------------------------------------------- body */

type Choice = SearchRow & { none?: boolean };

/** The search box and the rows, shared by the single and the several picker. */
function Body({ remote, q, setQ, lead, empty, chosenFirst, isOn, onPick, onClose, listId }: {
  remote: ReturnType<typeof useRemote>;
  q: string; setQ: (q: string) => void;
  lead: RemoteLead[];
  /** The empty choice ("No client"), offered while nothing is typed. */
  empty?: string;
  /** The current choice, put on top when the twenty do not include it. */
  chosenFirst?: SearchRow | null;
  isOn: (value: string) => boolean;
  onPick: (row: SearchRow) => void;
  onClose: () => void;
  listId: string;
}) {
  const [active, setActive] = useState(0);
  const field = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const choices: Choice[] = [
    ...(!q && empty !== undefined && !lead.some((l) => l.value === "") ? [{ value: "", label: empty, none: true }] : []),
    ...lead,
    ...(!q && chosenFirst && !remote.rows.some((r) => r.value === chosenFirst.value) && !lead.some((l) => l.value === chosenFirst.value) ? [chosenFirst] : []),
    ...remote.rows,
  ];
  const at = Math.min(active, Math.max(0, choices.length - 1));

  useEffect(() => { field.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => { list.current?.querySelector(`[data-n="${at}"]`)?.scrollIntoView({ block: "nearest" }); }, [at, remote.rows]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(Math.min(at + 1, choices.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(Math.max(at - 1, 0)); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(choices.length - 1); }
    else if (e.key === "PageDown") { e.preventDefault(); setActive(Math.min(at + 6, choices.length - 1)); }
    else if (e.key === "PageUp") { e.preventDefault(); setActive(Math.max(at - 6, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (choices[at]) onPick(choices[at]); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); }
    else if (e.key === "Tab") onClose();
  };

  const status = remote.loading ? "Searching…" : remote.error ? "" : remote.more ? `Showing the first ${SEARCH_LIMIT}. Type more to narrow it.` : "";
  return (
    <>
      <label className="adPick__search">
        {remote.loading ? <Loader2 className="ad__spin" aria-hidden="true" /> : <Search aria-hidden="true" />}
        <span className="ad__sr">Search</span>
        <input ref={field} value={q} placeholder="Type to search" autoComplete="off" maxLength={80}
          role="combobox" aria-expanded="true" aria-controls={listId} aria-autocomplete="list"
          aria-activedescendant={choices[at] ? `${listId}-${at}` : undefined}
          onChange={(e) => { setQ(e.target.value); setActive(0); }} onKeyDown={onKey} />
      </label>
      <ul ref={list} id={listId} role="listbox" className={`adPick__list adPick__list--remote${remote.loading && remote.rows.length ? " is-loading" : ""}`}
          data-lenis-prevent aria-busy={remote.loading}>
        {choices.map((o, n) => (
          <li key={`${o.value || "none"}-${n}`} id={`${listId}-${n}`} data-n={n} data-value={o.value} role="option" aria-selected={isOn(o.value)}
              className={`adPick__opt${n === at ? " is-active" : ""}${o.none ? " adPick__opt--none" : ""}`}
              onPointerEnter={(e) => { if (e.pointerType === "mouse") setActive(n); }}
              onPointerDown={(e) => { if (e.pointerType === "mouse") e.preventDefault(); }}
              onClick={() => onPick(o)}>
            <span className="adPick__optText">
              <span>{o.label}</span>
              {o.hint ? <small>{o.hint}</small> : null}
            </span>
            {isOn(o.value) ? <Check aria-hidden="true" /> : null}
          </li>
        ))}
        {remote.error ? (
          <li className="adPick__none" role="alert">
            {ERRORS[remote.error]}
            {remote.error !== "denied" ? <> <button type="button" className="adPick__retry" onClick={remote.retry}>Try again</button></> : null}
          </li>
        ) : !remote.rows.length ? (
          <li className="adPick__none">{remote.loading ? "Searching…" : q ? <>No matches for &ldquo;{q}&rdquo;.</> : "Nothing to pick yet."}</li>
        ) : null}
      </ul>
      <p className="adPick__more" role="status" aria-live="polite">{status}</p>
    </>
  );
}

/* ----------------------------------------------------------------- single */

/** One choice. Same props as `Pick` where they overlap; `kind` names the list. */
export function RemotePick({
  kind, scope, id, name, value: held, defaultValue = "", defaultLabel, onChange, placeholder, lead = [], invalid, describedBy, className, label, labelledBy, disabled,
}: {
  kind: SearchKind;
  scope?: SearchScope;
  id?: string;
  /** Posted under this name. Leave it out for a control whose caller posts. */
  name?: string;
  value?: string;
  defaultValue?: string;
  /** What the server already knows `defaultValue` is called, so the list is not needed to read it. */
  defaultLabel?: string;
  onChange?: (value: string, label: string) => void;
  /** The empty choice's words ("No client"); it is the field's words while nothing is chosen. */
  placeholder?: string;
  /** Fixed rows above the results, like "+ Add a new client" (their value is yours to handle). */
  lead?: RemoteLead[];
  invalid?: boolean;
  describedBy?: string;
  className?: string;
  label?: string;
  labelledBy?: string;
  disabled?: boolean;
}) {
  const auto = useId();
  const tid = id ?? auto;
  const listId = useId();
  const [own, setOwn] = useState(defaultValue);
  const value = held ?? own;
  const [names, setNames] = useState<Record<string, string>>(() => ((held ?? defaultValue) && defaultLabel ? { [held ?? defaultValue]: defaultLabel } : {}));
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const hidden = useChangeEvent(value);

  const remote = useRemote(kind, scope, open, q, value ? [value] : []);
  const close = useCallback(() => { setOpen(false); setQ(""); }, []);
  const { pop, place } = usePopover(open, close, trigger, 208, 330);

  const named = lead.find((l) => l.value === value)?.label ?? names[value] ?? remote.selected.find((s) => s.value === value)?.label ?? (kind === "tags" ? value : undefined);
  /* A value with no name yet (restored after a failed save, or set by the page) is looked up once. */
  const asked = useRef(new Set<string>());
  useEffect(() => {
    if (!value || named || asked.current.has(value)) return;
    asked.current.add(value);
    let on = true;
    searchOptions(kind, "", [value], scope).then((r) => {
      const hit = r.selected.find((s) => s.value === value);
      if (on && hit) setNames((m) => ({ ...m, [value]: hit.label }));
    }).catch(() => {});
    return () => { on = false; };
  }, [value, named, kind, scope]);

  const pick = (row: SearchRow) => {
    if (row.value) setNames((m) => ({ ...m, [row.value]: row.label }));
    if (held === undefined) setOwn(row.value);
    if (row.value !== value) onChange?.(row.value, row.label);
    close();
    trigger.current?.focus();
  };
  const shown = value ? named : undefined;
  const chosenRow: SearchRow | null = value && named ? { value, label: named } : null;

  return (
    <div className={`adPick adRemote${open ? " is-open" : ""}${className ? ` ${className}` : ""}`}>
      {name ? <input ref={hidden} type="hidden" name={name} value={value} /> : null}
      <button
        ref={trigger} id={tid} type="button" className="adPick__btn" disabled={disabled}
        aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined}
        aria-label={label} aria-labelledby={labelledBy}
        data-invalid={invalid || undefined}
        aria-describedby={[`${tid}-value`, describedBy].filter(Boolean).join(" ")}
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={(e) => { if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ")) { e.preventDefault(); setOpen(true); } }}
      >
        <span id={`${tid}-value`} className={shown ? undefined : "adPick__ph"}>{shown ?? (value ? "…" : placeholder ?? "Pick one")}</span>
        <ChevronDown aria-hidden="true" />
      </button>
      <Popover place={place} pop={pop} className="adPick__pop--remote">
        <Body remote={remote} q={q} setQ={setQ} lead={lead} empty={placeholder} chosenFirst={chosenRow}
          isOn={(v) => v === value} onPick={pick} onClose={() => { close(); trigger.current?.focus(); }} listId={listId} />
      </Popover>
    </div>
  );
}

/* ------------------------------------------------------------------ several */

/**
 * SEVERAL CHOICES as chips (tags, staff). Each chip has its own remove button;
 * the picker adds, and stays open so a few can be added in a row. Posts one
 * hidden input per value under `name`.
 */
export function RemoteMultiPick({
  kind, scope, id, name, defaultValue = [], defaultLabels = {}, onChange, placeholder = "Search", addLabel, invalid, describedBy, className, label, labelledBy, max = 200,
}: {
  kind: SearchKind;
  scope?: SearchScope;
  id?: string;
  name?: string;
  defaultValue?: string[];
  /** Names for the values the server already knows, by value. */
  defaultLabels?: Record<string, string>;
  onChange?: (values: string[]) => void;
  placeholder?: string;
  /** The button's words once something is chosen ("Add another tag"). */
  addLabel?: string;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
  label?: string;
  labelledBy?: string;
  max?: number;
}) {
  const auto = useId();
  const tid = id ?? auto;
  const listId = useId();
  const [values, setValues] = useState<string[]>(defaultValue);
  const [names, setNames] = useState<Record<string, string>>(defaultLabels);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);

  const remote = useRemote(kind, scope, open, q, values);
  const close = useCallback(() => { setOpen(false); setQ(""); }, []);
  const { pop, place } = usePopover(open, close, trigger, 208, 330);

  const nameOf = (v: string) => names[v] ?? remote.selected.find((s) => s.value === v)?.label ?? (kind === "tags" ? v : undefined);
  const asked = useRef(new Set<string>());
  useEffect(() => {
    const missing = values.filter((v) => !names[v] && kind !== "tags" && !asked.current.has(v));
    if (!missing.length) return;
    missing.forEach((v) => asked.current.add(v));
    let on = true;
    searchOptions(kind, "", missing, scope).then((r) => {
      if (on && r.selected.length) setNames((m) => ({ ...m, ...Object.fromEntries(r.selected.map((s) => [s.value, s.label])) }));
    }).catch(() => {});
    return () => { on = false; };
  }, [values, names, kind, scope]);

  const set = (next: string[]) => { setValues(next); onChange?.(next); };
  const toggle = (row: SearchRow) => {
    if (!row.value) return;
    setNames((m) => ({ ...m, [row.value]: row.label }));
    if (values.includes(row.value)) set(values.filter((v) => v !== row.value));
    else if (values.length < max) set([...values, row.value]);
  };

  return (
    <div className={`adRemote adRemote--many${className ? ` ${className}` : ""}`}>
      {name ? values.map((v) => <input key={v} type="hidden" name={name} value={v} />) : null}
      {values.length ? (
        <ul className="ad__ownerChips" aria-label={label ?? "Chosen"}>
          {values.map((v) => (
            <li key={v}>
              <span>{nameOf(v) ?? "…"}</span>
              <button type="button" onClick={() => set(values.filter((x) => x !== v))} aria-label={`Remove ${nameOf(v) ?? "this one"}`}><X aria-hidden="true" /></button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className={`adPick${open ? " is-open" : ""}`}>
        <button
          ref={trigger} id={tid} type="button" className="adPick__btn"
          aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined}
          aria-label={label} aria-labelledby={labelledBy} data-invalid={invalid || undefined} aria-describedby={describedBy}
          onClick={() => (open ? close() : setOpen(true))}
          onKeyDown={(e) => { if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ")) { e.preventDefault(); setOpen(true); } }}
        >
          <span className="adPick__ph">{values.length ? addLabel ?? "Add another" : placeholder}</span>
          {values.length ? <Plus aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
        </button>
        <Popover place={place} pop={pop} className="adPick__pop--remote">
          <Body remote={remote} q={q} setQ={setQ} lead={[]} isOn={(v) => values.includes(v)} onPick={toggle}
            onClose={() => { close(); trigger.current?.focus(); }} listId={listId} />
        </Popover>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- the form kit */

/** `RemotePick` in the form kit's field: label, hint, error, and the typed value restored after a refused save. */
export function RemoteSelect({ name, label, hint, required, half, defaultValue = "", defaultLabel, ...rest }: {
  name: string; label: string; hint?: string; required?: boolean; half?: boolean;
  kind: SearchKind; scope?: SearchScope; defaultValue?: string; defaultLabel?: string;
  placeholder?: string; lead?: RemoteLead[]; onChange?: (value: string, label: string) => void;
}) {
  const kept = String(useKept(name, defaultValue) ?? "");
  return (
    <Wrap name={name} label={label} hint={hint} required={required} half={half}>
      {(id, invalid, describedBy) => (
        <RemotePick id={id} name={name} defaultValue={kept} defaultLabel={kept === defaultValue ? defaultLabel : undefined}
          invalid={invalid} describedBy={describedBy} {...rest} />
      )}
    </Wrap>
  );
}

/** `RemoteMultiPick` as a form field (the place a checkbox list used to be). */
export function RemoteChecks({ name, label, hint, defaultValue = [], defaultLabels, ...rest }: {
  name: string; label: string; hint?: string;
  kind: SearchKind; scope?: SearchScope; defaultValue?: string[]; defaultLabels?: Record<string, string>;
  placeholder?: string; addLabel?: string; onChange?: (values: string[]) => void;
}) {
  const id = useId();
  const kept = useKeptList(name, defaultValue);
  return (
    <div className="ad__f" role="group" aria-labelledby={`${id}-l`}>
      <span className="ad__flRow"><span className="ad__fl" id={`${id}-l`}>{label}</span></span>
      {hint ? <small className="ad__dim" id={`${id}-h`}>{hint}</small> : null}
      {/* Remounted when a refused save puts the typed values back. */}
      <RemoteMultiPick key={kept.join("\u0001")} name={name} defaultValue={kept} defaultLabels={defaultLabels} label={label} labelledBy={`${id}-l`} describedBy={hint ? `${id}-h` : undefined} {...rest} />
    </div>
  );
}
