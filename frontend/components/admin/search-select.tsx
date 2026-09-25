"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

type Option = { value: string; label: string };

/**
 * A SEARCHABLE PICKER for a long or growing list (a client, a project, an
 * invoice): the owner's rule is that anything that can become long is
 * searchable, and AGENTS.md says the same above ten options.
 *
 * A button shows the choice; it opens a list with a search box on top. Type
 * to narrow, arrows to move, Enter to choose, Escape to close. The list is
 * capped in height and scrolls (and Lenis is told to stand aside). On a phone
 * it is a bottom sheet with the search at the top. The value travels in a
 * hidden input, so the form posts exactly what a native select would.
 *
 * Fixed-positioned against the trigger rather than inside the field, so a
 * dialog's own scrolling body cannot clip it.
 */
export function SearchSelect({ id, name, options, defaultValue = "", placeholder = "Pick one", invalid, describedBy }: {
  id: string; name: string; options: Option[]; defaultValue?: string; placeholder?: string;
  invalid?: boolean; describedBy?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [place, setPlace] = useState<{ top?: number; bottom?: number; left: number; width: number; up: boolean } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const listId = useId();

  const all = useMemo(() => (placeholder ? [{ value: "", label: placeholder }, ...options] : options), [options, placeholder]);
  const shown = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase();
    return needle ? all.filter((o) => o.value && o.label.toLocaleLowerCase().includes(needle)) : all;
  }, [all, q]);
  /* A choice the list no longer offers (a project of the client who was
     picked before) is not posted; the field reads as unset instead. */
  const chosen = all.find((o) => o.value === value);
  const posted = chosen ? value : "";
  const hidden = useRef<HTMLInputElement>(null);
  const first = useRef(true);
  /* Tell the form, as a native select would, so a watcher on "change" (the
     invoice builder's project list follows the client) hears the choice. */
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    hidden.current?.dispatchEvent(new Event("change", { bubbles: true }));
  }, [posted]);

  /* Where the panel goes: under the trigger, or over it near the foot of the
     window. Measured on open and whenever the page or a scroller moves. */
  useLayoutEffect(() => {
    if (!open) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const r = trigger.current?.getBoundingClientRect();
      if (!r) return;
      const up = window.innerHeight - r.bottom < 320 && r.top > window.innerHeight - r.bottom;
      setPlace(up ? { bottom: window.innerHeight - r.top + 6, left: r.left, width: r.width, up } : { top: r.bottom + 6, left: r.left, width: r.width, up });
    };
    measure();
    const later = () => { if (!frame) frame = requestAnimationFrame(measure); };
    window.addEventListener("resize", later);
    window.addEventListener("scroll", later, { capture: true, passive: true });
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", later); window.removeEventListener("scroll", later, { capture: true } as EventListenerOptions); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => search.current?.focus({ preventScroll: true }));
    const away = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!trigger.current?.contains(t) && !list.current?.parentElement?.contains(t)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  useEffect(() => {
    if (open) list.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const pick = (v: string) => { setValue(v); setOpen(false); setQ(""); trigger.current?.focus(); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, shown.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(shown.length - 1); }
    else if (e.key === "Enter") { e.preventDefault(); if (shown[active]) pick(shown[active].value); }
    else if (e.key === "Escape") { e.preventDefault(); setOpen(false); trigger.current?.focus(); }
    else if (e.key === "Tab") setOpen(false);
  };

  return (
    <div className={`adPick${open ? " is-open" : ""}`}>
      <input ref={hidden} type="hidden" name={name} value={posted} />
      <button
        ref={trigger} id={id} type="button" className="adPick__btn"
        aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined}
        data-invalid={invalid || undefined} aria-describedby={[`${id}-value`, describedBy].filter(Boolean).join(" ")}
        onClick={() => { setOpen((o) => !o); setActive(Math.max(0, shown.findIndex((o) => o.value === value))); }}
        onKeyDown={(e) => { if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) { e.preventDefault(); setOpen(true); } }}
      >
        {/* The label names the field; this says what is chosen. */}
        <span id={`${id}-value`} className={chosen?.value ? undefined : "adPick__ph"}>{chosen?.label ?? placeholder}</span>
        <ChevronDown aria-hidden="true" />
      </button>
      {open ? (
        <div className={`adPick__pop${place?.up ? " is-up" : ""}`}
             style={place ? { top: place.top, bottom: place.bottom, left: place.left, width: place.width } : undefined}>
          <div className="adPick__grab" aria-hidden="true" />
          <label className="adPick__search">
            <Search aria-hidden="true" />
            <span className="ad__sr">Search</span>
            <input
              ref={search} value={q} placeholder="Type to search"
              role="combobox" aria-expanded="true" aria-controls={listId} aria-autocomplete="list"
              aria-activedescendant={shown[active] ? `${listId}-${active}` : undefined}
              onChange={(e) => { setQ(e.target.value); setActive(0); }} onKeyDown={onKey}
            />
          </label>
          <ul ref={list} id={listId} role="listbox" className="adPick__list" data-lenis-prevent aria-label="Choices">
            {shown.map((o, n) => (
              <li key={o.value || "none"} id={`${listId}-${n}`} role="option" aria-selected={o.value === value}
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
        </div>
      ) : null}
    </div>
  );
}
