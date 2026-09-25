"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Search, X } from "lucide-react";

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
    /* Reported in a frame, not during this effect's own pass. */
    const f = requestAnimationFrame(() => setShown(needle ? { n, of: counted.length } : null));
    return () => cancelAnimationFrame(f);
  }, [q, target]);

  return (
    <div className="adLS" role="search">
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
