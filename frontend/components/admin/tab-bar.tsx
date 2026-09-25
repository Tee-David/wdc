"use client";

import Link from "next/link";
import { X, type LucideIcon } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { keepFocusInside } from "./focus";

/**
 * THE PHONE'S NAVIGATION: a floating navy bar, not a drawer.
 *
 * Five places, one thumb away, on every screen. The one you are in is an
 * orange pill carrying its name; the others are icons, named for screen
 * readers rather than on screen, because five labels at 390px is either
 * 11px type or truncation. A count sits on its icon and goes away on the
 * section you are already looking at.
 *
 * It floats, so the page shows at its edges. What sits pinned to the bottom
 * of a screen (a "Make them a client" strip) has to run to the bottom edge
 * and pad itself for the bar, never stop above it and leave a gap.
 */
export type TabItem = {
  label: string;
  Icon: LucideIcon;
  active: boolean;
  count?: number;
  /* A link, or a button that opens something (the admin's More). */
  href?: string;
  onSelect?: () => void;
  expanded?: boolean;
  tour?: string;
};

export function TabBar({ items, label, tour }: { items: TabItem[]; label: string; tour?: string }) {
  return (
    <nav className="ad__tabs" aria-label={label} data-tour={tour}>
      <div className="ad__tabsBar">
        {items.map((item) => {
          const inner = (
            <>
              <item.Icon aria-hidden="true" />
              <span className="ad__tabLabel">{item.label}</span>
              {item.count && !item.active ? (
                <span className="ad__tabCt" aria-hidden="true">{item.count > 99 ? "99+" : item.count}</span>
              ) : null}
            </>
          );
          const name = item.count && !item.active ? `${item.label}, ${item.count} waiting` : undefined;
          const className = `ad__tab${item.active ? " is-on" : ""}`;
          return item.href ? (
            <Link
              key={item.label}
              href={item.href}
              className={className}
              aria-current={item.active ? "page" : undefined}
              aria-label={name}
              data-tour={item.tour}
            >
              {inner}
            </Link>
          ) : (
            <button
              key={item.label}
              type="button"
              className={className}
              onClick={item.onSelect}
              aria-expanded={item.expanded}
              aria-haspopup="dialog"
              aria-label={name}
              data-tour={item.tour}
            >
              {inner}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * A bottom sheet on the platform's own terms: Escape and the scrim close it,
 * focus stays inside and returns to whatever opened it, and the page behind
 * does not scroll while it is up.
 */
export function BottomSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const sheet = useRef<HTMLElement>(null);
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    close.current?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      keepFocusInside(event, sheet.current);
    }
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, [onClose]);

  return (
    <div className="ad__sheetLayer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={sheet} className="ad__sheet" role="dialog" aria-modal="true" aria-label={title}>
        <span className="ad__sheetGrab" aria-hidden="true" />
        <div className="ad__sheetHead">
          <h2>{title}</h2>
          <button ref={close} type="button" className="ad__topIcon" onClick={onClose} aria-label="Close"><X aria-hidden="true" /></button>
        </div>
        <div className="ad__sheetBody" data-lenis-prevent>{children}</div>
      </section>
    </div>
  );
}
