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
  const leaving = useRef<number | null>(null);

  /* Opening is the platform's. Closing waits for the 200ms exit so the sheet
     leaves the way it came, and is skipped under reduced motion. */
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      if (leaving.current) { window.clearTimeout(leaving.current); leaving.current = null; }
      d.classList.remove("is-leaving");
      d.style.removeProperty("--sheet-drag");
      d.showModal();
      /* Opening a native dialog otherwise leaves focus on the first button --
         usually the close cross -- which paints a keyboard ring after a
         mouse/touch press. The panel is the initial focus stop; Tab then
         reaches its first real control. */
      d.focus({ preventScroll: true });
    }
    if (!open && d.open) {
      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (calm) { d.close(); return; }
      d.classList.add("is-leaving");
      leaving.current = window.setTimeout(() => { leaving.current = null; d.classList.remove("is-leaving"); d.close(); }, 200);
    }
  }, [open]);

  /* Pull the handle down to close, on a phone. A short drag springs back. */
  const drag = useRef<{ y: number; at: number } | null>(null);
  const onGrabDown = (e: React.PointerEvent<HTMLDivElement>) => {
    drag.current = { y: e.clientY, at: Date.now() };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onGrabMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const dy = Math.max(0, e.clientY - drag.current.y);
    ref.current?.style.setProperty("--sheet-drag", `${dy}px`);
  };
  const onGrabUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    drag.current = null;
    if (!start) return;
    const dy = Math.max(0, e.clientY - start.y);
    const fast = dy / Math.max(1, Date.now() - start.at) > 0.6;
    if (dy > 120 || (fast && dy > 40)) onClose();
    else ref.current?.style.removeProperty("--sheet-drag");
  };

  return (
    <dialog
      ref={ref}
      className={`addlg${wide ? " addlg--wide" : ""}`}
      tabIndex={-1}
      aria-labelledby={id}
      onClose={onClose}
      onCancel={(e) => {
        /* Escape: leave through the same animated path as every other close. */
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        /* The backdrop is the dialog's own pseudo-element, so its clicks land
           on the dialog. Comparing against the box is how the two are told
           apart. Only a click ON the dialog element counts: one that bubbled
           from inside (a calendar hanging below the box, or a button pressed
           with Enter, which reports 0,0) is not the backdrop. */
        if (e.target !== e.currentTarget) return;
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose();
      }}
    >
      <div className="addlg__in">
        {/* Only drawn on a phone, where the sheet rises from the bottom. */}
        <div className="addlg__grab" onPointerDown={onGrabDown} onPointerMove={onGrabMove} onPointerUp={onGrabUp} onPointerCancel={onGrabUp} aria-hidden="true"><span /></div>
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
  label, title, children, tone = "primary", icon: Icon, wide, dataTour, startOpen = false, iconOnly = false,
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
  /** Show only the icon; the label becomes its name and tooltip. Needs `icon`. */
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  return (
    <>
      <button
        type="button"
        className={`ad__btn${tone === "primary" ? " ad__btn--primary" : ""}${iconOnly && Icon ? " ad__btn--icon" : ""}`}
        onClick={() => setOpen(true)}
        data-tour={dataTour}
        aria-label={iconOnly && Icon ? label : undefined}
        title={iconOnly && Icon ? label : undefined}
      >
        {Icon ? <Icon aria-hidden={true} /> : null}
        {iconOnly && Icon ? null : <span className="ad__btnTxt">{label}</span>}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title} wide={wide}>
        {open ? children(() => setOpen(false)) : null}
      </Dialog>
    </>
  );
}
