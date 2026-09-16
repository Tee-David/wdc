"use client";

import { useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { usePickerOpen } from "@/components/onboarding/picker";
import "@/components/onboarding/picker.css";
import type { Option } from "@/lib/estimate";

/**
 * A single-choice dropdown for a tool wizard step: the same searchable-select
 * shell the contact form's own fields use (see components/onboarding/picker.tsx
 * and select-field.tsx), rather than a second control that looks close but not
 * quite the same. A step used to lay every option out as its own full-width
 * card, five of them stacked on a phone before the question could be
 * answered; collapsed into one control, the option and the line explaining it
 * still show, just inside the open list instead of down the page.
 *
 * NO SEARCH BOX. `select-field.tsx` only shows one past ten options, and
 * every question here tops out at five, so the box would be a fixed row
 * doing nothing above a five-row list.
 */
export default function OptionSelect({
  id,
  options,
  value,
  onChange,
  describedBy,
}: {
  id: string;
  options: Option[];
  value: string;
  onChange: (option: Option) => void;
  describedBy?: string;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const root = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const chosen = options.find((o) => o.key === value);

  const close = () => {
    setOpen(false);
    btnRef.current?.focus();
  };

  const pick = (option: Option) => {
    onChange(option);
    setOpen(false);
    /* Unlike select-field.tsx, focus does not need to return to the button:
       the wizard moves to the next question right after this, and a button
       about to leave the screen is not worth focusing. Left in anyway for
       the reader who picks and then reconsiders before the page turns. */
    btnRef.current?.focus();
  };

  usePickerOpen({ open, active, root, searchRef, listRef, onClose: close });

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((n) => Math.min(n + 1, options.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((n) => Math.max(n - 1, 0)); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(options.length - 1); }
    else if (e.key === "Enter") { e.preventDefault(); if (options[active]) pick(options[active]); }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
  };

  const openList = () => {
    const at = options.findIndex((o) => o.key === value);
    setActive(at < 0 ? 0 : at);
    setOpen(true);
  };

  return (
    <div className={`pk sf${open ? " is-open" : ""}`} ref={root}>
      <button
        ref={btnRef}
        type="button"
        id={id}
        className={`sf__btn${chosen ? "" : " is-empty"}`}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-describedby={describedBy}
        onClick={() => (open ? close() : openList())}
      >
        <span className="sf__val">{chosen?.label ?? "Choose one"}</span>
        <ChevronDown aria-hidden="true" />
      </button>

      {open && (
        <div className="pk__pop">
          {/* Below 560px this is the sheet's own grab handle; usePickerOpen
              attaches the drag-to-dismiss listener to it directly. Hidden
              above that width, where the panel is a dropdown with nothing
              to grab. */}
          <div className="pk__grab" aria-hidden="true" />
          <ul
            data-lenis-prevent
            className="pk__list"
            id={listId}
            role="listbox"
            ref={listRef}
            tabIndex={-1}
            aria-activedescendant={options[active] ? `${listId}-${options[active].key}` : undefined}
            onKeyDown={onListKey}
          >
            {options.map((o, n) => (
              <li
                key={o.key}
                id={`${listId}-${o.key}`}
                role="option"
                aria-selected={o.key === value}
                className={`pk__opt${n === active ? " is-active" : ""}${o.key === value ? " is-on" : ""}`}
                onPointerEnter={() => setActive(n)}
                /* Mouse only: see select-field.tsx's own note on why a touch
                   scroll must not be cancelled here. */
                onPointerDown={(e) => { if (e.pointerType === "mouse") e.preventDefault(); }}
                onClick={() => pick(o)}
              >
                <span className="pk__label">
                  <span className="pk__optT">{o.label}</span>
                  {o.note && <span className="pk__note">{o.note}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
