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

    /* The 8px the stylesheet sets between the control and the panel, and the
       margin the panel keeps off the edge of the window. */
    const GAP = 8;
    const EDGE = 12;
    /* Below this a panel is too short to be a list. If the window is genuinely
       this small the panel keeps this height and the page scrolls to it, which
       is better than a control that opens onto two rows. */
    const FLOOR = 168;

    const measure = (mayFlip: boolean) => {
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
      if (mayFlip) el.classList.toggle("is-up", below < wanted + 12 && above > below);
      const up = el.classList.contains("is-up");

      /* AND THEN IT IS CUT TO THE ROOM THAT SIDE ACTUALLY HAS.

         Flipping alone is not responsive: on a short window -- a laptop at
         1280x620, a browser with three toolbars, a phone in landscape --
         NEITHER side has room for a 296px list, so the panel opened past the
         bottom of the window and the last rows could only be reached by
         scrolling the page behind it. Measured before this: the 245-country
         list ran 59px past the fold at 900x600 and 143px at 1280x430.

         So the height is the smaller of what the stylesheet wants and what is
         there. `--pk-room` caps the PANEL; the list inside it is a flex child
         with `min-height: 0`, so the search box keeps its size and the list
         gives up the difference and scrolls. Recomputed on resize for the same
         reason the side is. */
      const room = Math.max(FLOOR, (up ? above : below) - GAP - EDGE);
      el.style.setProperty("--pk-room", `${Math.round(room)}px`);
    };

    const place = () => measure(true);
    /* The cap only, never the side. A panel that changes which way it hangs
       while the reader is scrolling is exactly the jump the note above refuses
       to ship; a panel that quietly keeps its last row inside the window is
       not. */
    const recap = () => measure(false);

    place();

    /* AND AGAIN ON THE NEXT FRAMES, because opening this control moves the
       page under it. Focus goes into the search box, which the browser then
       scrolls into view, so the measurement taken at open can be describing a
       position the field no longer has -- measured on /contact at 900x600: the
       country panel was placed against 320px of room and then the page scrolled
       390px, leaving the panel 11px past the fold with the numbers still
       reading as correct. Two frames covers an instant scroll; the listener
       below covers a smooth one. */
    const frames = [
      requestAnimationFrame(() => frames.push(requestAnimationFrame(place))),
    ];

    window.addEventListener("resize", place);
    let queued = 0;
    const onScroll = () => {
      if (queued) return;
      queued = requestAnimationFrame(() => { queued = 0; recap(); });
    };
    /* Capture, because the scroll that moves this control is often a scrolling
       ANCESTOR rather than the window -- and passive, because this only ever
       reads. */
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });

    return () => {
      frames.forEach(cancelAnimationFrame);
      if (queued) cancelAnimationFrame(queued);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onScroll, { capture: true } as EventListenerOptions);
      el.classList.remove("is-up");
      el.style.removeProperty("--pk-room");
    };
  }, [open, root]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open, listRef]);

  useEffect(() => {
    if (!open) return;
    /* `preventScroll`, and it is the difference between a panel that fits and
       one that does not. Focus lands inside the panel, and a browser scrolls a
       newly focused element into view -- which moves the page UNDER a panel
       that was just measured and placed against where the control was. On a
       short window with the panel opening upward, that scroll pushed the
       control, and with it the panel's anchored bottom edge, past the fold:
       measured on /contact at 1366x640, the country panel ended 9px below the
       window with the control entirely off screen.

       Nothing needs that scroll. The control was just clicked, so it is in
       view by definition, and the panel is placed against it. */
    requestAnimationFrame(() =>
      (searchRef.current ?? listRef.current)?.focus({ preventScroll: true }));
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open, root, searchRef, listRef, onClose]);
}
