"use client";

import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";

/**
 * A modal, on the platform's own <dialog>.
 *
 * Same reasoning as the one on the onboarding form: showModal() makes the page
 * behind it inert to pointer and to screen readers, traps focus, closes on
 * Escape, and renders in the top layer where no ancestor's overflow or
 * z-index can clip it. Four things worth having and none worth reimplementing.
 *
 * A SEPARATE COMPONENT FROM THE ONBOARDING ONE, deliberately: that one is a
 * client-facing sheet with the form kit's air, this one is a tool's dialog at
 * the admin's density, and making one component serve both would mean a prop
 * that means "look completely different".
 */
export function Dialog({
  open, onClose, title, children, wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`addlg${wide ? " addlg--wide" : ""}`}
      aria-labelledby={id}
      onClose={onClose}
      onClick={(e) => {
        /* The backdrop is the dialog's own pseudo-element, so its clicks land
           on the dialog. Comparing against the box is how the two are told
           apart. */
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose();
      }}
    >
      <div className="addlg__in">
        <div className="addlg__h">
          <h2 id={id}>{title}</h2>
          <button type="button" className="addlg__x" onClick={onClose} aria-label="Close">
            <X aria-hidden="true" />
          </button>
        </div>
        <div className="addlg__b">{children}</div>
      </div>
    </dialog>
  );
}

/**
 * A button that opens a dialog holding a form.
 *
 * The pair is together because they always are, and because the thing that
 * should close the dialog is the form succeeding, which means the open state
 * and the form's onDone have to be in the same component. Handing children a
 * `close` lets the form inside call it without the caller wiring state.
 */
export function DialogButton({
  label, title, children, tone = "primary", icon: Icon, wide, dataTour, startOpen = false,
}: {
  label: string;
  title: string;
  children: (close: () => void) => React.ReactNode;
  tone?: "primary" | "plain";
  icon?: React.ComponentType<{ "aria-hidden"?: boolean }>;
  wide?: boolean;
  /** A tour step's `target`, when this button is one. Optional and inert
   *  otherwise -- see `lib/tours/admin.ts`. */
  dataTour?: string;
  /** Open on arrival, for a link that sends someone here to do this one thing. */
  startOpen?: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  return (
    <>
      <button
        type="button"
        className={`ad__btn${tone === "primary" ? " ad__btn--primary" : ""}`}
        onClick={() => setOpen(true)}
        data-tour={dataTour}
      >
        {Icon ? <Icon aria-hidden={true} /> : null}
        {label}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title} wide={wide}>
        {children(() => setOpen(false))}
      </Dialog>
    </>
  );
}
