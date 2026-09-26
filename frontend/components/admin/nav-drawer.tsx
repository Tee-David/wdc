"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

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

export function MenuButton({ onClick, expanded, tour }: { onClick: () => void; expanded: boolean; tour?: string }) {
  return (
    <button type="button" className="ad__topIcon ad__topMenu" aria-label="Open the menu" aria-expanded={expanded} aria-haspopup="dialog" onClick={onClick} data-tour={tour}>
      <Menu aria-hidden="true" />
    </button>
  );
}

export function NavDrawer({ open, onClose, label, children, tools }: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
  /** Beside the close button: the theme switch, which the phone's top bar has no room for. */
  tools?: React.ReactNode;
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
      className="adDrawer"
      aria-label={label}
      onClose={onClose}
      onClick={(e) => {
        /* The backdrop is the dialog's own pseudo-element, so its clicks land
           on the dialog itself; a click on a link inside closes it too. */
        if (e.target === ref.current) onClose();
        else if ((e.target as HTMLElement).closest("a[href]")) onClose();
      }}
    >
      {open ? (
        <div className="adDrawer__in">
          <div className="adDrawer__bar">
            {tools}
            <button type="button" className="ad__topIcon adDrawer__x" onClick={onClose} aria-label="Close the menu"><X aria-hidden="true" /></button>
          </div>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}
