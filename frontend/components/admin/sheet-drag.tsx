"use client";

import { useEffect } from "react";

/**
 * EVERY BOTTOM SHEET ON A PHONE CAN BE PULLED DOWN TO CLOSE.
 *
 * The dialogs already do it themselves (dialog.tsx). This covers the two
 * sheets that are not dialogs: a picker's popover (pick.tsx, which shows a grab
 * handle on a phone) and the native <details> menus (the date range and the
 * per-page menu), which become bottom sheets under 640px. One listener for the
 * whole page, nothing per sheet. A tap outside an open menu, or Escape, closes
 * it too, as it would in an app.
 */
const MENUS = ".ad__range[open], .ad__perPage[open]";
const PHONE = "(max-width: 640px)";

export function SheetDrag() {
  useEffect(() => {
    const phone = window.matchMedia(PHONE);
    let drag: { el: HTMLElement; y: number; at: number; close: () => void } | null = null;

    const closeMenu = (d: Element) => d.removeAttribute("open");
    const closePop = () => document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    const down = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      /* A tap outside an open menu closes it, on every screen. */
      document.querySelectorAll(MENUS).forEach((d) => { if (!d.contains(t)) closeMenu(d); });
      if (!phone.matches) return;
      const grab = t.closest(".adPick__grab");
      if (grab) {
        const pop = grab.closest<HTMLElement>(".adPick__pop");
        if (pop) drag = { el: pop, y: e.clientY, at: Date.now(), close: closePop };
        return;
      }
      const menu = t.closest<HTMLElement>(".ad__rangeMenu, .ad__perMenu");
      if (menu && e.clientY - menu.getBoundingClientRect().top < 28) {
        const d = menu.closest("details");
        if (d) drag = { el: menu, y: e.clientY, at: Date.now(), close: () => closeMenu(d) };
      }
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      const dy = Math.max(0, e.clientY - drag.y);
      drag.el.style.transform = `translateY(${dy}px)`;
      drag.el.style.transition = "none";
    };
    const up = (e: PointerEvent) => {
      if (!drag) return;
      const d = drag;
      drag = null;
      const dy = Math.max(0, e.clientY - d.y);
      const fast = dy > 40 && Date.now() - d.at < 250;
      d.el.style.transition = "transform .2s cubic-bezier(.4,0,1,1)";
      if (dy > 90 || fast) {
        d.el.style.transform = "translateY(100%)";
        window.setTimeout(() => { d.el.style.transform = ""; d.el.style.transition = ""; d.close(); }, 180);
      } else {
        d.el.style.transform = "";
      }
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      document.querySelectorAll(MENUS).forEach((d) => {
        closeMenu(d);
        d.querySelector<HTMLElement>("summary")?.focus();
      });
    };

    document.addEventListener("pointerdown", down);
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerup", up);
    document.addEventListener("pointercancel", up);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("pointercancel", up);
      document.removeEventListener("keydown", key);
    };
  }, []);
  return null;
}
