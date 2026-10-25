"use client";

import { useCallback, useId, useRef, useState } from "react";
import { Check, ChevronDown, Plus, Search, X } from "lucide-react";
import { Popover, usePopover } from "@/components/admin/pick";

/**
 * SEVERAL CHOICES FROM A LIST WE ALREADY HAVE, as chips with a dropdown.
 *
 * Five options or more get a search box, because the list only grows (more
 * clients, more people, more departments) and a wall of chips stops being
 * usable on a phone. It posts one hidden input per value under `name`, so the
 * filter sheet stays a plain GET form. The list is local: the remote picker in
 * `remote-pick.tsx` is for sets too big to send to the browser.
 */
type Opt = { value: string; label: string };
const SEARCH_FROM = 5;

export function ChecklistPick({ name, legend, options, checked, placeholder = "Any", hideLegend = false }: {
  name: string; legend: string; options: Opt[]; checked: string[]; placeholder?: string;
  /** For a form field that already shows its own label above. */
  hideLegend?: boolean;
}) {
  const listId = useId();
  const [values, setValues] = useState(checked);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => { setOpen(false); setQ(""); }, []);
  const { pop, place } = usePopover(open, close, trigger, 224, 340);
  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? v;
  const shown = options.filter((o) => !q || o.label.toLowerCase().includes(q.toLowerCase()));
  const toggle = (v: string) => setValues((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));
  const searchable = options.length >= SEARCH_FROM;

  return (
    <fieldset className="rp__fs">
      <legend className={hideLegend ? "ad__sr" : undefined}>{legend}{values.length ? <span className="ad__num rp__fsN">{values.length}</span> : null}</legend>
      {values.map((v) => <input key={v} type="hidden" name={name} value={v} />)}
      {values.length ? (
        <ul className="ad__ownerChips" aria-label={`${legend}, chosen`}>
          {values.map((v) => (
            <li key={v}>
              <span>{labelOf(v)}</span>
              <button type="button" onClick={() => toggle(v)} aria-label={`Remove ${labelOf(v)}`}><X aria-hidden="true" /></button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className={`adPick${open ? " is-open" : ""}`}>
        <button ref={trigger} type="button" className="adPick__btn" aria-haspopup="listbox" aria-expanded={open}
          aria-controls={open ? listId : undefined} aria-label={`${legend}: ${values.length ? "add another" : placeholder}`}
          onClick={() => (open ? close() : setOpen(true))}>
          <span className="adPick__ph">{values.length ? "Add another" : placeholder}</span>
          {values.length ? <Plus aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
        </button>
        <Popover place={place} pop={pop} className="adPick__pop--remote">
          {searchable ? (
            <label className="adPick__search">
              <Search aria-hidden="true" />
              <span className="ad__sr">Search {legend}</span>
              <input autoFocus value={q} placeholder="Type to search" autoComplete="off" maxLength={80} onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); trigger.current?.focus(); } }} />
            </label>
          ) : null}
          <ul id={listId} role="listbox" aria-multiselectable="true" className="adPick__list adPick__list--remote" data-lenis-prevent>
            {shown.map((o) => {
              const on = values.includes(o.value);
              return (
                <li key={o.value} role="option" aria-selected={on} tabIndex={0} className="adPick__opt"
                    onPointerDown={(e) => { if (e.pointerType === "mouse") e.preventDefault(); }}
                    onClick={() => toggle(o.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(o.value); } else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); trigger.current?.focus(); } }}>
                  <span className="adPick__optText"><span>{o.label}</span></span>
                  {on ? <Check aria-hidden="true" /> : null}
                </li>
              );
            })}
            {!shown.length ? <li className="adPick__none">No matches for &ldquo;{q}&rdquo;.</li> : null}
          </ul>
        </Popover>
      </div>
    </fieldset>
  );
}
