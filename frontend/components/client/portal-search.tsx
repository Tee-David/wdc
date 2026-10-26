"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { CreditCard, FolderKanban, LifeBuoy, MessageSquare, Search, X } from "lucide-react";
import { keepFocusInside } from "@/components/admin/focus";
import { portalSearch, type PortalHit } from "@/lib/portal/search-actions";

const ICON = { Project: FolderKanban, Invoice: CreditCard, Conversation: MessageSquare, Help: LifeBuoy } as const;

/** The portal's search: a top bar button (Ctrl K) opening the same palette the admin has, over the client's own records. */
export function PortalSearch() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen(true); } };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  return (
    <>
      <button type="button" className="ad__search" data-tour="portal-search" onClick={() => setOpen(true)} aria-label="Search, Ctrl K">
        <Search aria-hidden="true" /><span>Search projects, invoices, help</span><kbd>Ctrl K</kbd>
      </button>
      {open ? <Palette onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function Palette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PortalHit[]>([]);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const id = window.setTimeout(() => input.current?.focus(), 0);
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); keepFocusInside(e, dialog.current); };
    document.addEventListener("keydown", key);
    return () => { window.clearTimeout(id); document.removeEventListener("keydown", key); previous?.focus(); };
  }, [onClose]);
  /* A short pause after typing, so each keystroke is not its own request. */
  useEffect(() => {
    const q = query.trim();
    const id = window.setTimeout(() => start(async () => setHits(q.length < 2 ? [] : await portalSearch(q))), 220);
    return () => window.clearTimeout(id);
  }, [query]);
  const q = query.trim();
  return (
    <div className="ad__overlay" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section ref={dialog} className="ad__command" role="dialog" aria-modal="true" aria-label="Search the portal">
        <div className="ad__commandInput">
          <Search aria-hidden="true" />
          <input ref={input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects, invoices, help…" aria-label="Search projects, invoices and help" />
          <button type="button" onClick={onClose} aria-label="Close search"><X aria-hidden="true" /></button>
        </div>
        <div className="ad__commandResults" aria-live="polite">
          {q.length < 2 ? <p>Type a project name, an invoice number or a question.</p> : null}
          {hits.map((h) => {
            const Icon = ICON[h.kind];
            return <Link key={h.kind + h.href} href={h.href} onClick={onClose}><Icon aria-hidden="true" /><span>{h.label}<small className="ad__dim" style={{ display: "block" }}>{h.kind} · {h.sub}</small></span></Link>;
          })}
          {q.length >= 2 && !pending && !hits.length ? (
            <>
              <p>Nothing matches “{q}”.</p>
              <Link href={`/portal/help?q=${encodeURIComponent(q)}`} onClick={onClose}><LifeBuoy aria-hidden="true" /><span>Search the help articles</span></Link>
              <Link href={`/portal/support?new=1&subject=${encodeURIComponent(q)}#ask`} onClick={onClose}><MessageSquare aria-hidden="true" /><span>Ask us about “{q}”</span></Link>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
