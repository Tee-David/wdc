"use client";

import { useEffect } from "react";

/**
 * The pieces shared by the two searchable controls (the country picker in the
 * phone field, and the searchable select).
 *
 * See picker.css for why they share anything at all. This is the behavioural
 * half of the same argument.
 *
 * THE ARROW-KEY HANDLER IS DELIBERATELY NOT HERE. It was, as a factory taking
 * the callbacks each control differs on, and the React Compiler rejects that:
 * building it during render means calling a function that closes over refs,
 * which is exactly the rule the compiler enforces. Both controls now write
 * their own -- seven lines each, defined inline where an event handler
 * belongs. The duplication is real and it is smaller than the abstraction was.
 */

/** Bolds the part of a label the search actually matched. */
export function Mark({ name, q }: { name: string; q: string }) {
  const s = q.trim();
  if (!s) return <>{name}</>;
  const at = name.toLowerCase().indexOf(s.toLowerCase());
  if (at < 0) return <>{name}</>;
  return (
    <>
      {name.slice(0, at)}
      <b>{name.slice(at, at + s.length)}</b>
      {name.slice(at + s.length)}
    </>
  );
}

/**
 * While the panel is open: focus the search box, keep the highlighted row in
 * view, and close on a click outside.
 *
 * The scroll-into-view is `block: "nearest"`, which is the difference between
 * arrowing down a long list and the list lurching a page at a time.
 */
export function usePickerOpen({
  open, active, root, searchRef, listRef, onClose,
}: {
  open: boolean;
  active: number;
  root: React.RefObject<HTMLDivElement | null>;
  searchRef: React.RefObject<HTMLInputElement | null>;
  listRef: React.RefObject<HTMLUListElement | null>;
  onClose: () => void;
}) {
  /* WHICH WAY IT OPENS, decided from where the field actually is.

     A panel that always drops downward is fine until the field sits near the
     foot of the window, and then most of it is below the fold: the reader gets
     a search box, two rows, and a list they have to scroll the PAGE to see --
     which is the "I have to scroll weirdly through my entire site" fault, and
     no amount of styling fixes it. Every real dropdown flips.

     Measured rather than guessed, and only the one number that matters: the
     room under the control against the room over it. It runs on open and on
     resize, not on scroll -- re-placing a panel while somebody is scrolling
     makes it jump, and a panel open during a page scroll is already unusual.

     Below 560px none of this applies: the panel is a sheet anchored to the
     bottom of the screen, and the class it sets is simply ignored by the CSS
     there. */
  useEffect(() => {
    if (!open) return;
    const el = root.current;
    const pop = el?.querySelector<HTMLElement>(".pk__pop");
    if (!el || !pop) return;

    const place = () => {
      const bar = el.getBoundingClientRect();
      /* The panel's own height, capped the way the stylesheet caps it, so the
         decision is made against what will actually be drawn rather than
         against a list that has not been measured yet. */
      const wanted = Math.min(pop.offsetHeight || 320, window.innerHeight - 24);
      const below = window.innerHeight - bar.bottom;
      const above = bar.top;
      /* Down unless there is genuinely not room AND up is roomier. A panel
         that flips for the sake of eight pixels is worse than one that is
         slightly clipped, because the reader cannot predict where it will
         appear. */
      el.classList.toggle("is-up", below < wanted + 12 && above > below);
    };

    place();
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("resize", place);
      el.classList.remove("is-up");
    };
  }, [open, root]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open, listRef]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => (searchRef.current ?? listRef.current)?.focus());
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open, root, searchRef, listRef, onClose]);
}
