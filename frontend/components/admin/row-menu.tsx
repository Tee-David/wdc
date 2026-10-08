"use client";

import {
  useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { MoreVertical, type LucideIcon } from "lucide-react";
import { Dialog } from "./dialog";
import { can, type Area } from "@/lib/admin/permissions";
import { useAdminRole } from "./shell";

/**
 * The row menu: what you can do to the thing on this row.
 *
 * WHY IT EXISTS. Every action in the admin was reachable from exactly one
 * place -- the record's own page -- so finding out what you could do to a
 * project meant opening the project. A list of six projects with no verbs on
 * it is a report, not a tool. The menu puts the verbs next to the noun.
 *
 * TWO KINDS OF ITEM, AND DELIBERATELY NOT THREE.
 *
 *  - `link`, which goes somewhere.
 *  - `dialog`, which opens a form.
 *
 * There is no "just do it" item, and that is a decision rather than an
 * omission. A menu item that fires a server action on click has nowhere to
 * report a failure, nowhere to say what it is about to do, and no way to be
 * taken back -- and the actions behind these menus issue invoices, archive
 * clients and move stages that email people. So a one-press action is a dialog
 * with one sentence and one button in it. The press is the same; the sentence
 * is the difference between a tool and a trap.
 *
 * WHY THE LIST IS PORTALLED AND FIXED. These menus live in table rows, and
 * every table on these screens sits inside `.ad__scroll`, which is
 * `overflow: auto`. An absolutely positioned menu inside one is clipped by it
 * -- the menu opens and you see the top two pixels of it. Rendering into the
 * body at viewport coordinates is what steps outside that box. The platform's
 * own `popover` would do the same job with light-dismiss included, and is the
 * right answer the day the floor is Safari 17; this is the version that works
 * on what people are holding.
 *
 * THE DIALOG IS NOT IN THE PORTAL. It is a sibling of the trigger, mounted
 * whether the menu is open or shut, because choosing an item CLOSES the menu
 * -- and a dialog rendered inside the thing that just unmounted goes with it.
 */

export type RowMenuItem =
  | {
      kind: "link";
      label: string;
      href: string;
      icon?: LucideIcon;
      /** Leaves the admin, so it opens in its own tab. */
      external?: boolean;
    }
  | {
      kind: "dialog";
      label: string;
      /** The dialog's heading. Name the record here: a dialog that says
          "Archive client" is one you have to trust you clicked the right row
          for. */
      title: string;
      icon?: LucideIcon;
      tone?: "danger";
      wide?: boolean;
      /** Owner only (lib/admin/permissions.ts): left out of the menu for
          staff. The action refuses them regardless; this spares the dialog. */
      area?: Area;
      render: (close: () => void) => ReactNode;
    };

const GAP = 6;
const WIDTH = 232;

export function RowMenu({
  items: allItems,
  /** Names the row, so a screen reader hears which one this opens. */
  label,
  align = "end",
}: {
  items: RowMenuItem[];
  label: string;
  align?: "start" | "end";
}) {
  const role = useAdminRole();
  const items = allItems.filter((item) => item.kind !== "dialog" || !item.area || can(role, item.area));
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState<{ top: number; left: number } | null>(null);
  const [dialog, setDialog] = useState<number | null>(null);
  /* WHERE THE MENU IS PORTALLED TO, AND IT IS NOT THE BODY.

     Every colour, the type and the box-sizing reset on these screens are
     declared on `.ad` and inherited from it. Portalled to `document.body` the
     list lands outside that scope, so `var(--ad-panel)` resolves to nothing --
     measured: a menu with no background, no border and no shadow, its items
     floating transparently over the table rows behind them. Inside `.ad` the
     tokens are in scope and `position: fixed` still resolves against the
     viewport, because `.ad` sets no transform, filter or containment. */
  const [host, setHost] = useState<HTMLElement | null>(null);

  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const place = useCallback(() => {
    const b = btnRef.current?.getBoundingClientRect();
    if (!b) return;
    const height = listRef.current?.offsetHeight ?? items.length * 40 + 12;
    /* Below by default, above when below would run off the bottom. */
    const below = b.bottom + GAP;
    const top = below + height > window.innerHeight - 8 && b.top - GAP - height > 8
      ? b.top - GAP - height
      : below;
    const raw = align === "end" ? b.right - WIDTH : b.left;
    /* Never off either edge, whatever the row's position. */
    const left = Math.max(8, Math.min(raw, window.innerWidth - WIDTH - 8));
    setAt({ top, left });
  }, [align, items.length]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  /* IT FOLLOWS THE ROW RATHER THAN GIVING UP ON IT.

     Closing on any scroll was the cheap version, and it was wrong in a way
     that looked like a broken button: a press that arrives while the page is
     still settling -- a row scrolled into view, a phone's momentum, anything
     that delivers a scroll event a frame after the tap -- opened the menu and
     shut it again before it could be seen. Measured: one row in four failed to
     open at all when each was pressed in turn.

     So it re-anchors instead, coalesced into one rAF and only ever while a
     menu is actually open, which is rarely and briefly. The one thing that
     does close it is the row leaving the screen, because a menu pointing at
     something nobody can see is not anchored to anything. */
  useEffect(() => {
    if (!open) return;
    let frame = 0;
    const follow = () => {
      frame = 0;
      const b = btnRef.current?.getBoundingClientRect();
      if (!b) return;
      if (b.bottom < 0 || b.top > window.innerHeight) {
        setOpen(false);
        return;
      }
      place();
    };
    const onMove = () => {
      if (!frame) frame = requestAnimationFrame(follow);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (listRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener("scroll", onMove, { capture: true, passive: true });
    window.addEventListener("resize", onMove, { passive: true });
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown, true);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown, true);
    };
  }, [open, place]);

  /* Focus lands on the first item, and the arrows walk the list. A menu you
     can open with a keyboard and then not move inside is not keyboard
     accessible, it is keyboard reachable. */
  useEffect(() => {
    if (!open) return;
    const first = listRef.current?.querySelector<HTMLElement>("[data-item]");
    first?.focus();
  }, [open, at]);

  const onListKey = (e: React.KeyboardEvent) => {
    const nodes = [...(listRef.current?.querySelectorAll<HTMLElement>("[data-item]") ?? [])];
    if (!nodes.length) return;
    const i = nodes.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = e.key === "ArrowDown"
        ? nodes[(i + 1) % nodes.length]
        : nodes[(i - 1 + nodes.length) % nodes.length];
      next?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      nodes[0].focus();
    } else if (e.key === "End") {
      e.preventDefault();
      nodes[nodes.length - 1].focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  const closeDialog = useCallback(() => setDialog(null), []);

  /* FOCUS COMES BACK IN AN EFFECT, NOT IN THE CLOSE HANDLER. The handler is
     handed to the dialog's own content, which calls it during a render of
     that content, and a closure that touches a ref from there is the one
     thing the rules of React actually forbid. Watching the dialog shut is the
     same behaviour written where reading a ref is allowed. */
  const hadDialog = useRef(false);
  useEffect(() => {
    const showing = dialog !== null;
    if (hadDialog.current && !showing) btnRef.current?.focus();
    hadDialog.current = showing;
  }, [dialog]);

  const chosen = dialog !== null ? items[dialog] : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        data-tour="row-menu"
        className={`ad__rm${open ? " is-on" : ""}`}
        aria-label={`Actions for ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => {
          setHost(btnRef.current?.closest<HTMLElement>(".ad") ?? document.body);
          setOpen((v) => !v);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setHost(btnRef.current?.closest<HTMLElement>(".ad") ?? document.body);
            setOpen(true);
          }
        }}
      >
        <MoreVertical aria-hidden="true" />
      </button>

      {/* NO `mounted` GUARD. The portal only ever renders while the menu is
          open, and `host` is set by the same press that opens it -- so by the
          time this line runs there is a document to portal into, and the
          server render never reaches it. */}
      {open && host
        ? createPortal(
            <div
              ref={listRef}
              id={id}
              /* A tour step's target for the open list. It only exists while
                 the menu is open, so the tour steps that use it follow a step
                 that asks the reader to open the menu (see lib/tours/admin.ts). */
              data-tour="row-menu-list"
              role="menu"
              aria-label={`Actions for ${label}`}
              className="ad__rmList"
              onKeyDown={onListKey}
              style={{
                top: at ? `${at.top}px` : "-9999px",
                left: at ? `${at.left}px` : "-9999px",
                width: `${WIDTH}px`,
                /* Measured before it is seen, so the first paint is already in
                   the right place rather than jumping into it. */
                visibility: at ? "visible" : "hidden",
              }}
            >
              {items.map((it, i) => {
                const Icon = it.icon;
                if (it.kind === "link") {
                  return (
                    <Link
                      key={it.label}
                      data-item
                      role="menuitem"
                      className="ad__rmItem"
                      href={it.href}
                      target={it.external ? "_blank" : undefined}
                      rel={it.external ? "noopener noreferrer" : undefined}
                      onClick={() => setOpen(false)}
                    >
                      {Icon ? <Icon aria-hidden="true" /> : <span className="ad__rmGap" />}
                      {it.label}
                    </Link>
                  );
                }
                return (
                  <button
                    key={it.label}
                    data-item
                    role="menuitem"
                    type="button"
                    className={`ad__rmItem${it.tone === "danger" ? " is-danger" : ""}`}
                    onClick={() => {
                      setOpen(false);
                      setDialog(i);
                    }}
                  >
                    {Icon ? <Icon aria-hidden="true" /> : <span className="ad__rmGap" />}
                    {it.label}
                  </button>
                );
              })}
            </div>,
            host,
          )
        : null}

      {chosen && chosen.kind === "dialog" ? (
        <Dialog open onClose={closeDialog} title={chosen.title} wide={chosen.wide}>
          {chosen.render(closeDialog)}
        </Dialog>
      ) : null}
    </>
  );
}

/**
 * The one-sentence confirmation behind a menu item that only has to be
 * pressed. It is a real form posting a real action, so it reports its own
 * failure in the dialog rather than on a page the reader has already left.
 */
export function Confirm({
  children, footer,
}: {
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="ad__confirm">
      <p>{children}</p>
      {footer}
    </div>
  );
}
