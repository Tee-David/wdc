"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * A modal, built on the platform's own `<dialog>`.
 *
 * WHY `<dialog>` AND NOT A DIV. `showModal()` gives four things right that a
 * hand-rolled overlay gets wrong more often than not: the rest of the page
 * becomes inert to both pointer and screen reader, focus is trapped inside,
 * Escape closes it, and it renders in the top layer so it cannot be trapped
 * under a `z-index` or clipped by an ancestor's `overflow`. All four are
 * things this form needs and none of them are worth reimplementing.
 *
 * The one thing the element does not do for us is close on a backdrop press,
 * because the backdrop is a pseudo-element of the dialog itself and its clicks
 * land on the dialog. Comparing the press coordinates against the dialog's own
 * box is the standard way to tell the two apart.
 */
export default function Dialog({
  open,
  onClose,
  title,
  children,
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  labelledBy?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dlg"
      aria-labelledby={labelledBy}
      /* Fired by Escape as well as by `close()`, so the parent's state cannot
         drift out of step with what is on screen. */
      onClose={onClose}
      onClick={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        const outside =
          e.clientX < r.left || e.clientX > r.right ||
          e.clientY < r.top || e.clientY > r.bottom;
        if (outside) onClose();
      }}
    >
      <div className="dlg__in">
        <button type="button" className="dlg__x" onClick={onClose} aria-label="Close">
          <X aria-hidden="true" />
        </button>
        <h2 id={labelledBy}>{title}</h2>
        {children}
      </div>
    </dialog>
  );
}
