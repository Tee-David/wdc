"use client";

import { useEffect } from "react";

/**
 * NAMES EACH CELL AFTER ITS COLUMN, SO A ROW CAN BE A CARD ON A PHONE.
 *
 * Below 720px a list table stops being a sideways scroller three screens wide
 * and every row becomes a card of label/value lines (admin.css). CSS cannot
 * read a header's text, so this copies it onto each cell as `data-label`. The
 * card's label column is reserved before this runs, so the labels arriving
 * fills space that is already there rather than moving anything.
 *
 * One observer on the main column, coalesced into a frame: tables arrive with
 * navigation and with filters, and a row added later needs its labels too.
 * Writing an attribute is not a childList change, so it cannot feed itself.
 *
 * NOT BEFORE HYDRATION. The shell's effect runs while the page's own streamed
 * boundaries are still hydrating, and an attribute React did not render, found
 * on a node it is about to hydrate, is a mismatch. So the first pass waits for
 * the load event and an idle moment; client navigations after that render new
 * nodes rather than hydrating old ones, so the observer is safe from then on.
 */
export default function TableLabels() {
  useEffect(() => {
    const root = document.querySelector(".ad__main");
    if (!root) return;
    let frame = 0;
    const label = () => {
      frame = 0;
      for (const table of root.querySelectorAll<HTMLTableElement>(".ad__scroll > .ad__t")) {
        const head = table.tHead?.rows[0];
        if (!head) continue;
        const names: string[] = [];
        for (const th of Array.from(head.cells)) {
          const text = (th.textContent ?? "").trim();
          for (let i = 0; i < th.colSpan; i += 1) names.push(text);
        }
        const groups = [...Array.from(table.tBodies), ...(table.tFoot ? [table.tFoot] : [])];
        for (const group of groups) {
          for (const row of Array.from(group.rows)) {
            let col = 0;
            for (const cell of Array.from(row.cells)) {
              const name = cell.colSpan > 1 ? "" : names[col] ?? "";
              if (cell.dataset.label !== name) cell.dataset.label = name;
              col += cell.colSpan;
            }
          }
        }
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(label); };
    const observer = new MutationObserver(schedule);
    /* Safari has no requestIdleCallback; a short timeout does the same job. */
    const idleApi = typeof window.requestIdleCallback === "function";
    let idle = 0;
    const start = () => {
      const run = () => { label(); observer.observe(root, { childList: true, subtree: true }); };
      idle = idleApi ? window.requestIdleCallback(run, { timeout: 800 }) : globalThis.setTimeout(run, 200) as unknown as number;
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      window.removeEventListener("load", start);
      if (idleApi) window.cancelIdleCallback(idle); else globalThis.clearTimeout(idle);
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
