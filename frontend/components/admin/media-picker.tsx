"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, FileText, Film, FolderOpen, Loader2, Search } from "lucide-react";
import { browseMedia, describeMedia } from "@/lib/admin/media-actions";
import type { MediaAsset } from "@/lib/media";
import type { FolderTree } from "@/lib/media-folders";
import { Dialog } from "./dialog";
import { Pick } from "./pick";
import { toast } from "./toast";
import "./media-picker.css";

/**
 * "CHOOSE FROM LIBRARY": the media library as a dialog, for the places that
 * need a file without leaving the page they are on (the blog's cover and its
 * Picture and Video panels). Phase 3 of the media proposal
 * (https://claude.ai/artifact/AgHqC7o7WnB3TrtgJGYRw8).
 *
 * Search, a folder and the grid, 48 at a time with "Show more". Choosing a
 * picture asks for its description there and then, starting from the one the
 * library already has; a new one is saved back to the file so the next place
 * that uses it starts with it. Only files with a public address are offered,
 * because that address is what the page will point at.
 */

export type Picked = { url: string; alt: string; width: number | null; height: number | null; filename: string };

const KB = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export function MediaPicker({ open, onClose, kind, onPick, title }: {
  open: boolean;
  onClose: () => void;
  kind: "image" | "video";
  onPick: (p: Picked) => void;
  title?: string;
}) {
  const id = useId();
  const [q, setQ] = useState("");
  const [typed, setTyped] = useState("");
  const [folder, setFolder] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [tree, setTree] = useState<FolderTree | null>(null);
  /* Which question the grid is answering: until it matches, it is loading. */
  const [answered, setAnswered] = useState<{ key: string; ok: boolean } | null>(null);
  const [error, setError] = useState("");
  const [chosen, setChosen] = useState<MediaAsset | null>(null);
  const [alt, setAlt] = useState("");
  const [decorative, setDecorative] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const asked = useRef(0);

  /* Typing settles for a moment before it asks the server. */
  useEffect(() => {
    const t = setTimeout(() => { setQ(typed.trim()); setPage(1); }, 250);
    return () => clearTimeout(t);
  }, [typed]);

  const key = JSON.stringify([q, folder, kind]);
  const [tries, setTries] = useState(0);
  const state = answered?.key !== key ? "loading" : answered.ok ? "ready" : "error";
  const retry = () => { setAnswered(null); setTries((n) => n + 1); };
  /* The folder tree comes with the first answer only. */
  const treeAsked = useRef(false);

  useEffect(() => {
    if (!open) return;
    const ticket = ++asked.current;
    const withTree = !treeAsked.current;
    treeAsked.current = true;
    browseMedia({ q, folder, kind, page, withTree })
      .catch(() => ({ ok: false as const, error: "The library could not be read just now. Try again." }))
      .then((res) => {
        if (ticket !== asked.current) return;
        if (!res.ok) { if (withTree) treeAsked.current = false; setError(res.error); setAnswered({ key, ok: false }); return; }
        if (res.tree) setTree(res.tree);
        setItems((before) => (page === 1 ? res.items : [...before, ...res.items]));
        setTotal(res.total);
        setAnswered({ key, ok: true });
      });
  }, [open, q, folder, kind, page, key, tries]);

  /* Each opening starts clean on the choice, but keeps where they were looking. */
  const close = () => { setChosen(null); setProblem(""); onClose(); };

  const folders = useMemo(() => [
    { value: "", label: `All files${tree ? ` (${tree.all})` : ""}` },
    { value: "unsorted", label: `Unsorted${tree ? ` (${tree.unsorted})` : ""}` },
    ...(tree?.folders ?? []).map((f) => ({ value: f.id, label: `${" ".repeat(Math.max(0, f.depth))}${f.name} (${f.own})` })),
  ], [tree]);

  const choose = (m: MediaAsset) => {
    setChosen(m);
    setAlt(m.alt);
    setDecorative(m.decorative);
    setProblem("");
  };

  const use = async () => {
    if (!chosen?.url) return;
    const text = alt.replace(/\s+/g, " ").trim();
    if (kind === "image" && !decorative && !text) { setProblem("Describe the picture for somebody who cannot see it, or mark it decorative."); return; }
    setBusy(true);
    if (kind === "image" && (text !== chosen.alt || decorative !== chosen.decorative)) {
      /* Saved back to the file; a refusal does not stop the choice. */
      const said = await describeMedia({ id: chosen.id, alt: text, decorative }).catch(() => null);
      if (!said?.ok) toast("The description is used here but could not be saved to the library.", "bad");
    }
    setBusy(false);
    onPick({ url: chosen.url, alt: decorative ? "" : text, width: chosen.width, height: chosen.height, filename: chosen.filename });
    close();
  };

  const noun = kind === "image" ? "picture" : "video";
  const shown = items.filter((m) => m.url);
  const filtered = Boolean(q || folder);

  return (
    <Dialog open={open} onClose={close} title={title ?? `Choose a ${noun} from the library`} wide>
      <div className="adMP">
        <div className="adMP__bar">
          <label className="ad__filterSearch adMP__search">
            <Search aria-hidden="true" />
            <span className="ad__sr">Search the library</span>
            <input type="search" value={typed} placeholder={`Search ${noun}s by name or description`}
              onChange={(e) => setTyped(e.target.value)}
              /* Inside the post's own form: Enter must not send the post. */
              onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }} />
          </label>
          <div className="adMP__folder">
            <Pick label="Folder" options={folders} value={folder} onChange={(v) => { setFolder(v); setPage(1); }} placeholder="All files" />
          </div>
        </div>

        {state === "loading" ? (
          <ul className="adMP__grid" aria-busy="true" aria-label="Loading the library">
            {Array.from({ length: 8 }, (_, i) => <li key={i} className="adMP__ghost" aria-hidden="true" />)}
          </ul>
        ) : state === "error" ? (
          <div className="adMP__note" role="alert">
            <b>The library could not be opened</b>
            <p>{error}</p>
            <button type="button" className="ad__btn" onClick={retry}>Try again</button>
          </div>
        ) : !shown.length ? (
          <div className="adMP__note" role="status">
            <FolderOpen aria-hidden="true" />
            {filtered ? (
              <>
                <b>No {noun}s match</b>
                <p>Nothing here matches{q ? <> &ldquo;{q}&rdquo;</> : null}{folder ? " in this folder" : ""}.</p>
                <button type="button" className="ad__btn" onClick={() => { setTyped(""); setQ(""); setFolder(""); setPage(1); }}>Show every {noun}</button>
              </>
            ) : (
              <>
                <b>No {noun}s in the library yet</b>
                <p>Upload one from this device instead, or add some in the media library first.</p>
                <Link className="ad__btn" href="/admin/settings/media" target="_blank" rel="noopener">Open the media library</Link>
              </>
            )}
          </div>
        ) : (
          <>
            <ul className="adMP__grid" aria-label={`${total} ${noun}${total === 1 ? "" : "s"}`}>
              {shown.map((m) => {
                const on = chosen?.id === m.id;
                return (
                  <li key={m.id}>
                    <button type="button" className={`adMP__item${on ? " is-on" : ""}`} aria-pressed={on} onClick={() => choose(m)}
                      aria-label={`${m.filename}${m.alt ? `, ${m.alt}` : ""}`}>
                      <span className="adMP__thumb">
                        {m.contentType.startsWith("image/") ? (
                          // eslint-disable-next-line @next/next/no-img-element -- a library thumbnail at its own address
                          <img src={m.url!} alt="" loading="lazy" decoding="async" />
                        ) : m.contentType.startsWith("video/") ? <Film aria-hidden="true" /> : <FileText aria-hidden="true" />}
                        {on ? <span className="adMP__tick" aria-hidden="true"><Check /></span> : null}
                      </span>
                      <span className="adMP__name">{m.filename}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {items.length < total ? (
              <div className="adMP__more">
                <button type="button" className="ad__btn" onClick={() => setPage((p) => p + 1)}>Show more ({total - items.length} left)</button>
              </div>
            ) : null}
          </>
        )}

        {chosen ? (
          <div className="adMP__use" role="group" aria-label={`Use ${chosen.filename}`}>
            <p className="adMP__meta"><b>{chosen.filename}</b> <span>{[chosen.width && chosen.height ? `${chosen.width} × ${chosen.height}` : "", KB(chosen.bytes)].filter(Boolean).join(" · ")}</span></p>
            {kind === "image" ? (
              <>
                <label htmlFor={`${id}-alt`} className="ad__fl">Description{decorative ? null : <b aria-hidden="true"> *</b>}</label>
                <input id={`${id}-alt`} className="adMP__alt" value={decorative ? "" : alt} maxLength={200} disabled={decorative}
                  placeholder="What the picture shows, in one sentence"
                  onChange={(e) => { setAlt(e.target.value); setProblem(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void use(); } }} />
                <small className="ad__fh">Saved to the file too, so the next place that uses it starts with this.</small>
                <label className="adMP__check">
                  <input type="checkbox" checked={decorative} onChange={(e) => { setDecorative(e.target.checked); setProblem(""); }} />
                  <span>Decorative: it adds nothing a reader would miss</span>
                </label>
              </>
            ) : null}
            {problem ? <small className="ad__fe" role="alert">{problem}</small> : null}
            <div className="adMP__acts">
              <button type="button" className="ad__btn" onClick={close}>Cancel</button>
              <button type="button" className="ad__btn ad__btn--primary" onClick={() => void use()} disabled={busy}>
                {busy ? <Loader2 className="ad__spin" aria-hidden="true" /> : <Check aria-hidden="true" />} Use this {noun}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
