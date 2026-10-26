"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * THE SIDEBAR ON A PHONE (the owner's ask: the same sidebar on mobile
 * dashboards, in place of the bottom tab bar and its More sheet).
 *
 * The desktop sidebar itself, slid in from the left in a native <dialog>:
 * showModal() makes the page behind inert, traps focus and closes on Escape,
 * the backdrop closes it, and so does following any link in it. It is the
 * SAME component as the desktop's, so the two menus cannot drift apart.
 *
 * Closing on navigation is derived, not effected: the drawer is open only
 * while the path it was opened on is still the current one.
 */
export function useNavDrawer() {
  const path = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  return {
    open: openOn === path,
    show: () => setOpenOn(path),
    hide: () => setOpenOn(null),
  };
}

/** The site's hamburger: two buns round a longer sausage. The same drawing as
    the public menu's (`.sm-burger` in ui/staggered-menu.css), as an SVG so it
    takes the button's colour and size like the icons around it. */
function HotDog() {
  return (
    <svg viewBox="0 0 49 36" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M9 7V5.5A5.5 5.5 0 0 1 14.5 0h19A5.5 5.5 0 0 1 39 5.5V7z" />
      <rect x="0" y="14" width="49" height="8" rx="4" />
      <path d="M9 29v1.5a5.5 5.5 0 0 0 5.5 5.5h19a5.5 5.5 0 0 0 5.5-5.5V29z" />
    </svg>
  );
}

export function MenuButton({ onClick, expanded, tour }: { onClick: () => void; expanded: boolean; tour?: string }) {
  return (
    <button type="button" className="ad__topIcon ad__topMenu" aria-label="Open the menu" aria-expanded={expanded} aria-haspopup="dialog" onClick={onClick} data-tour={tour}>
      <HotDog />
    </button>
  );
}

export function NavDrawer({ open, onClose, label, children }: {
  open: boolean;
  onClose: () => void;
  label: string;
  /** The drawer's whole content: the sidebar in its drawer form, with its own close cross. */
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  /* Kept on screen for the slide out (the kit's drawerOut, 220ms), then closed. */
  const [shown, setShown] = useState(open);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open) {
      const id = window.setTimeout(() => setShown(true), 0);
      if (!d.open) d.showModal();
      d.classList.remove("is-out");
      return () => window.clearTimeout(id);
    }
    if (!d.open) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    d.classList.add("is-out");
    const id = window.setTimeout(() => { d.classList.remove("is-out"); d.close(); setShown(false); }, reduce ? 0 : 220);
    return () => window.clearTimeout(id);
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="adDrawer"
      aria-label={label}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => {
        /* The backdrop is the dialog's own pseudo-element, so its clicks land
           on the dialog itself; a click on a link inside closes it too. */
        if (e.target === ref.current) onClose();
        else if ((e.target as HTMLElement).closest("a[href]")) onClose();
      }}
    >
      {open || shown ? (
        /* Opening a dialog focuses its first control, and a phone draws the
           ring for that. The panel takes that first focus instead. */
        <div className="adDrawer__in" tabIndex={-1} autoFocus>{children}</div>
      ) : null}
    </dialog>
  );
}
