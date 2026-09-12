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
