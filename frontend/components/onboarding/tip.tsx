"use client";

import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";

/**
 * A question mark in a circle. Press it, read the note, carry on.
 *
 * WHY THE HINTS MOVED BEHIND IT. Every hint used to sit under its label,
 * always open. A few of them earn that -- a question nobody can answer without
 * the explanation is not a question with a hint, it is a badly worded question
 * -- but most were three lines of useful background that the reader has to
 * scroll past on every single question whether they wanted it or not. On a
 * phone that turned a six-question step into a page of prose.
 *
 * So the schema now says which is which: `hint` stays visible because the
 * question needs it, and `tip` hides behind this because it is background.
 *
 * PRESS, NOT HOVER. A hover tooltip does not exist on a phone, and this form
 * is filled in on phones. It is a real button that toggles a real panel, which
 * also means it works by keyboard and is announced properly.
 *
 * IT CLOSES ON ESCAPE AND ON AN OUTSIDE PRESS, and nothing else on the page
 * moves when it opens: the panel is absolutely positioned, so a question does
 * not jump down the screen while somebody is reading the one above it.
 */
export default function Tip({ text }: { text: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  return (
    <span className="tip" ref={root}>
      <button
        type="button"
        className={`tip__b${open ? " is-on" : ""}`}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label="What does this mean?"
        onClick={() => setOpen((o) => !o)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9.2" />
          <path d="M9.6 9.3a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.7-.9 1.3v.5" />
          <path d="M12 16.9h.01" />
        </svg>
      </button>
      {open && (
        <span className="tip__p" id={id} role="note">
          {text}
          <button type="button" onClick={() => setOpen(false)} aria-label="Close">
            <X aria-hidden="true" />
          </button>
        </span>
      )}
    </span>
  );
}
