"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import { EmptyScene } from "./empty-scene";
import "./empty-scene.css";

/**
 * A SEARCH FOR A LIST THAT IS ALREADY ON THE PAGE (the owner's rule: every
 * list gets one). It narrows the rows of the element named by `target` as
 * you type: table body rows, or anything marked `data-row`. No round trip,
 * because these lists are small and whole; the long, paged ones (entries, the
 * message log, the audit log) search on the server instead.
 */
export function ListSearch({ target, label = "Search", placeholder = "Search", noun = "items" }: {
  target: string; label?: string; placeholder?: string; noun?: string;
}) {
  const [q, setQ] = useState("");
  const [shown, setShown] = useState<{ n: number; of: number } | null>(null);
  const id = useId();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const box = document.getElementById(target);
    if (!box) return;
    const rows = [...box.querySelectorAll<HTMLElement>("tbody tr, [data-row]")];
    const needle = q.trim().toLocaleLowerCase();
    /* A second view of the same rows (the phone cards beside a table) is
       filtered with them but not counted twice. */
    const counted = rows.filter((r) => !r.closest("[data-ls-mirror]"));
    let n = 0;
    for (const r of rows) {
      const hit = !needle || (r.dataset.search ?? r.textContent ?? "").toLocaleLowerCase().includes(needle);
      r.hidden = !hit;
      if (hit && !r.closest("[data-ls-mirror]")) n += 1;
    }
    box.dataset.searching = needle ? "1" : "";
    /* NOTHING MATCHES: the table's header over no rows reads as a broken
       page, so the list itself says so and offers the way back. */
    box.dataset.lsNone = needle && n === 0 ? "1" : "";
    /* Reported in a frame, not during this effect's own pass. */
    const f = requestAnimationFrame(() => setShown(needle ? { n, of: counted.length } : null));
    return () => cancelAnimationFrame(f);
  }, [q, target]);

  const [holder, setHolder] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const box = document.getElementById(target);
    if (!box) return;
    const el = document.createElement("div");
    el.className = "adLS__noneHold";
    box.appendChild(el);
    const f = requestAnimationFrame(() => setHolder(el));
    return () => { cancelAnimationFrame(f); el.remove(); setHolder(null); };
  }, [target]);

  return (
    <div className="adLS" role="search">
      {holder && shown && shown.n === 0 ? createPortal(
        <div className="adLS__none">
          <EmptyScene kind="no-results" />
          <b>No {noun} match &ldquo;{q.trim()}&rdquo;</b>
          <p>Check the spelling, or search for part of a name.</p>
          <button type="button" className="ad__btn" onClick={() => { setQ(""); input.current?.focus(); }}>Clear the search</button>
        </div>, holder) : null}
      <label className="adLS__box" htmlFor={id}>
        <Search aria-hidden="true" />
        <span className="ad__sr">{label}</span>
        <input ref={input} id={id} type="search" value={q} placeholder={placeholder} autoComplete="off"
          onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") setQ(""); }} />
        {q ? <button type="button" className="adLS__clear" aria-label="Clear the search" onClick={() => { setQ(""); input.current?.focus(); }}><X aria-hidden="true" /></button> : null}
      </label>
      <span className="adLS__count" aria-live="polite">
        {shown ? (shown.n ? `${shown.n} of ${shown.of} ${noun}` : `No ${noun} match “${q.trim()}”`) : ""}
      </span>
    </div>
  );
}
