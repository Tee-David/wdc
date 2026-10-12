"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import "./workbench.css";

/**
 * A SEARCH BOX WHOSE VALUE LIVES IN THE URL (`?q=`). It waits a moment after
 * typing, then replaces the address (never pushes, so Back is not a ladder of
 * keystrokes), keeps every other filter, and drops `page` so a new search
 * starts at the first page. The server page does the filtering, so the count,
 * the pager and a shared link all agree. Escape or the cross clears it.
 */
export function UrlSearch({ label, placeholder, param = "q" }: { label: string; placeholder: string; param?: string }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const current = params.get(param) ?? "";
  const [value, setValue] = useState(current);
  const timer = useRef<number | null>(null);
  const last = useRef(current);

  /* Follow the address when something else changes it (Clear filters, Back). */
  useEffect(() => {
    if (current !== last.current) { last.current = current; const f = requestAnimationFrame(() => setValue(current)); return () => cancelAnimationFrame(f); }
  }, [current]);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const push = (next: string) => {
    last.current = next.trim();
    const p = new URLSearchParams(params.toString());
    if (next.trim()) p.set(param, next.trim()); else p.delete(param);
    p.delete("page");
    const s = p.toString();
    router.replace(`${path}${s ? `?${s}` : ""}`, { scroll: false });
  };
  const change = (next: string) => {
    setValue(next);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => push(next), 260);
  };

  return (
    <label className="adUs" role="search">
      <Search aria-hidden="true" />
      <span className="ad__sr">{label}</span>
      <input type="search" value={value} placeholder={placeholder} autoComplete="off" enterKeyHint="search"
        onChange={(e) => change(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Escape" && value) { e.preventDefault(); change(""); } if (e.key === "Enter") { e.preventDefault(); if (timer.current) window.clearTimeout(timer.current); push(value); } }} />
      {value ? <button type="button" className="adUs__x" aria-label="Clear the search" onClick={() => { change(""); }}><X aria-hidden="true" /></button> : null}
    </label>
  );
}
