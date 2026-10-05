"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronRight, Folder, FolderInput, FolderOpen, FolderPlus, FolderTree as TreeIcon, Inbox, Layers, MoreVertical, Pencil, Search, Trash2, X,
} from "lucide-react";
import type { FolderColor, FolderTree, MediaFolder } from "@/lib/media-folders";
import { colorMediaFolder, createMediaFolder, deleteMediaFolder, moveMediaFiles, moveMediaFolder, renameMediaFolder } from "@/lib/admin/media-actions";
import { ask } from "./confirm";
import { Dialog } from "./dialog";
import { toast } from "./toast";

/**
 * THE FOLDER TREE (phase 2 of the media library proposal).
 *
 * Virtual folders, CatFolders-style: All files and Unsorted pinned at the
 * top, then the tree, five levels at most, with counts that include what is
 * below. Everything a pointer can do has a key: it is a WAI-ARIA tree
 * (arrows, Home, End, Enter), F2 renames, Shift+F10 or the menu key opens
 * the ⋮ menu, Delete deletes, Alt+Up/Down reorders. Files dragged onto a
 * folder move into it; a folder dragged onto another goes inside it; files
 * from the computer dropped on a folder upload into it. Every move offers Undo.
 */

export const DRAG_FILES = "application/x-wdc-media";
const DRAG_FOLDER = "application/x-wdc-folder";
const OPEN_KEY = "wdc.media.open";
const SORT_KEY = "wdc.media.sort";
const COLORS: FolderColor[] = ["navy", "orange", "green", "red", "amber"];

type Row =
  | { kind: "all" | "unsorted"; id: string; name: string; count: number; depth: 1 }
  | { kind: "folder"; id: string; name: string; count: number; depth: number; folder: MediaFolder; hasKids: boolean; open: boolean };

/** Where a folder link goes: this page, the same filters, a new folder, page one. */
function useFolderHref() {
  const params = useSearchParams();
  const path = usePathname();
  return useCallback((folder: string, deep?: boolean) => {
    const u = new URLSearchParams(params.toString());
    u.delete("page"); u.delete("show");
    if (folder) u.set("folder", folder); else u.delete("folder");
    if (deep) u.set("deep", "1"); else if (deep === false) u.delete("deep");
    const s = u.toString();
    return `${path}${s ? `?${s}` : ""}`;
  }, [params, path]);
}

function readSet(key: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(key) ?? "[]")); } catch { return new Set(); }
}

export function FolderPane({ tree, current, onUpload, onNavigate }: {
  tree: FolderTree; current: string;
  /** Files from the computer dropped on a folder: upload them into it. */
  onUpload?: (files: FileList, folderId: string | null) => void;
  /** Called after a folder is chosen, so a sheet can close. */
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const hrefFor = useFolderHref();
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<"manual" | "az">("manual");
  const [find, setFind] = useState("");
  const [edit, setEdit] = useState<{ mode: "new"; parentId: string | null } | { mode: "rename"; id: string } | null>(null);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [moving, setMoving] = useState<MediaFolder | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [focus, setFocus] = useState<string>(current || "all");
  const items = useRef(new Map<string, HTMLElement>());
  const hoverOpen = useRef(0);

  /* Remembered per person, on this device: which folders are open, and the order. */
  useEffect(() => {
    const saved = readSet(OPEN_KEY);
    /* The current folder's ancestors open, so where you are is visible. */
    let p = tree.folders.find((f) => f.id === current)?.parentId;
    while (p) { saved.add(p); p = tree.folders.find((f) => f.id === p)?.parentId ?? null; }
    /* Read after hydration on purpose: the server cannot see this device's
       store, so reading it during render would make the two disagree. */
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from localStorage, an external store
    setOpen(saved);
    try { if (localStorage.getItem(SORT_KEY) === "az") setSort("az"); } catch { /* a blocked store is fine */ }
  }, [tree.folders, current]);
  const toggle = useCallback((id: string, to?: boolean) => {
    setOpen((was) => {
      const next = new Set(was);
      if (to ?? !next.has(id)) next.add(id); else next.delete(id);
      try { localStorage.setItem(OPEN_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const kids = useMemo(() => {
    const m = new Map<string | null, MediaFolder[]>();
    for (const f of tree.folders) { const k = m.get(f.parentId) ?? []; k.push(f); m.set(f.parentId, k); }
    for (const list of m.values()) list.sort(sort === "az" ? (a, b) => a.name.localeCompare(b.name) : (a, b) => a.position - b.position || a.name.localeCompare(b.name));
    return m;
  }, [tree.folders, sort]);

  /* Searching shows the matches and the folders that lead to them, opened. */
  const matches = useMemo(() => {
    const q = find.trim().toLowerCase();
    if (!q) return null;
    const keep = new Set<string>();
    for (const f of tree.folders) {
      if (!f.name.toLowerCase().includes(q)) continue;
      let x: MediaFolder | undefined = f;
      while (x) { keep.add(x.id); x = tree.folders.find((y) => y.id === x!.parentId); }
    }
    return keep;
  }, [find, tree.folders]);

  const rows = useMemo(() => {
    const out: Row[] = [
      { kind: "all", id: "all", name: "All files", count: tree.all, depth: 1 },
      { kind: "unsorted", id: "unsorted", name: "Unsorted", count: tree.unsorted, depth: 1 },
    ];
    const walk = (parent: string | null) => {
      for (const f of kids.get(parent) ?? []) {
        if (matches && !matches.has(f.id)) continue;
        const hasKids = (kids.get(f.id) ?? []).length > 0;
        const isOpen = matches ? true : open.has(f.id);
        out.push({ kind: "folder", id: f.id, name: f.name, count: f.total, depth: f.depth, folder: f, hasKids, open: isOpen });
        if (hasKids && isOpen) walk(f.id);
      }
    };
    walk(null);
    return out;
  }, [tree, kids, open, matches]);

  const byId = useMemo(() => new Map(tree.folders.map((f) => [f.id, f])), [tree.folders]);
  const say = (r: { ok: true; message: string } | { ok: false; error: string }, undo?: () => void) => {
    if (r.ok) toast(r.message, "good", undo ? { label: "Undo", run: undo } : undefined);
    else toast(r.error, "bad");
    router.refresh();
  };

  /* ------------------------------------------------------------ moves */
  const moveFilesTo = async (payload: { ids: string[]; from: Record<string, string | null> }, folderId: string | null) => {
    const r = await moveMediaFiles({ ids: payload.ids, folderId });
    say(r, r.ok ? async () => {
      /* Back to where each one was: grouped by its old folder. */
      const groups = new Map<string | null, string[]>();
      for (const id of payload.ids) { const k = payload.from[id] ?? null; groups.set(k, [...(groups.get(k) ?? []), id]); }
      for (const [k, list] of groups) await moveMediaFiles({ ids: list, folderId: k });
      toast("Put back."); router.refresh();
    } : undefined);
  };
  const moveFolderTo = async (id: string, parentId: string | null, beforeId: string | null = null) => {
    const f = byId.get(id);
    if (!f) return;
    const sibs = kids.get(f.parentId) ?? [];
    const after = sibs[sibs.findIndex((s) => s.id === id) + 1]?.id ?? null;
    const was = f.parentId;
    const r = await moveMediaFolder({ id, parentId, beforeId });
    say(r, r.ok ? async () => { say(await moveMediaFolder({ id, parentId: was, beforeId: after })); } : undefined);
    if (r.ok && parentId) toggle(parentId, true);
  };

  const onDrop = async (e: React.DragEvent, row: Row) => {
    e.preventDefault(); setOver(null); window.clearTimeout(hoverOpen.current);
    const target = row.kind === "folder" ? row.id : null;
    const files = e.dataTransfer.getData(DRAG_FILES);
    const folder = e.dataTransfer.getData(DRAG_FOLDER);
    if (files) { try { await moveFilesTo(JSON.parse(files), target); } catch { /* not ours */ } return; }
    if (folder) {
      if (row.kind === "unsorted") return;
      if (folder === target) return;
      await moveFolderTo(folder, target);
      return;
    }
    if (e.dataTransfer.files?.length && onUpload && row.kind !== "all") onUpload(e.dataTransfer.files, target);
  };
  const canDrop = (e: React.DragEvent) => {
    const t = Array.from(e.dataTransfer.types);
    return t.includes(DRAG_FILES) || t.includes(DRAG_FOLDER) || t.includes("Files");
  };

  /* ---------------------------------------------------------- keyboard */
  const go = (id: string) => { setFocus(id); items.current.get(id)?.focus(); };
  const onKey = (e: React.KeyboardEvent, row: Row, i: number) => {
    const k = e.key;
    if (k === "ArrowDown") { e.preventDefault(); if (e.altKey && row.kind === "folder") return reorder(row, 1); if (rows[i + 1]) go(rows[i + 1].id); }
    else if (k === "ArrowUp") { e.preventDefault(); if (e.altKey && row.kind === "folder") return reorder(row, -1); if (rows[i - 1]) go(rows[i - 1].id); }
    else if (k === "Home") { e.preventDefault(); go(rows[0].id); }
    else if (k === "End") { e.preventDefault(); go(rows[rows.length - 1].id); }
    else if (k === "ArrowRight" && row.kind === "folder" && row.hasKids) { e.preventDefault(); if (!row.open) toggle(row.id, true); else if (rows[i + 1]) go(rows[i + 1].id); }
    else if (k === "ArrowLeft" && row.kind === "folder") {
      e.preventDefault();
      if (row.open && row.hasKids) toggle(row.id, false);
      else if (row.folder.parentId) go(row.folder.parentId);
    }
    else if (k === "F2" && row.kind === "folder") { e.preventDefault(); setEdit({ mode: "rename", id: row.id }); }
    else if ((k === "F10" && e.shiftKey) || k === "ContextMenu") { if (row.kind === "folder") { e.preventDefault(); const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setMenu({ id: row.id, x: r.right - 8, y: r.bottom }); } }
    else if (k === "Delete" && row.kind === "folder") { e.preventDefault(); void remove(row.folder); }
  };
  const reorder = (row: Extract<Row, { kind: "folder" }>, step: number) => {
    const sibs = kids.get(row.folder.parentId) ?? [];
    const at = sibs.findIndex((s) => s.id === row.id);
    const to = at + step;
    if (to < 0 || to >= sibs.length) return;
    const before = step < 0 ? sibs[to].id : sibs[to + 1]?.id ?? null;
    if (sort !== "manual") { setSort("manual"); try { localStorage.setItem(SORT_KEY, "manual"); } catch { /* ignore */ } }
    void moveMediaFolder({ id: row.id, parentId: row.folder.parentId, beforeId: before }).then((r) => { if (!r.ok) toast(r.error, "bad"); router.refresh(); requestAnimationFrame(() => go(row.id)); });
  };

  /* --------------------------------------------------------- actions */
  const remove = async (f: MediaFolder) => {
    const inside = (kids.get(f.id) ?? []).length;
    const ok = await ask(`Delete ${f.name}? ${f.own ? `Its ${f.own} ${f.own === 1 ? "file moves" : "files move"}` : "Nothing is lost:"}${inside ? `${f.own ? " and its" : " its"} ${inside} ${inside === 1 ? "folder moves" : "folders move"}` : ""} up a level${f.own || inside ? "" : " (it is empty)"}. No file is deleted.`, { verb: "Delete" });
    if (!ok) return;
    say(await deleteMediaFolder({ id: f.id }));
    if (current === f.id) router.push(hrefFor(f.parentId ?? ""));
  };
  const save = async (name: string) => {
    if (!edit) return { ok: true as const };
    if (edit.mode === "new") {
      const r = await createMediaFolder({ name, parentId: edit.parentId });
      if (r.ok) { if (edit.parentId) toggle(edit.parentId, true); setEdit(null); say(r); }
      return r;
    }
    const r = await renameMediaFolder({ id: edit.id, name });
    if (r.ok) { setEdit(null); say(r); }
    return r;
  };

  const currentId = current || "all";
  return (
    <div className="adFold">
      <div className="adFold__tools">
        <label className="adFold__find"><span className="ad__sr">Find a folder</span>
          <Search aria-hidden="true" />
          <input type="search" value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find a folder" />
        </label>
        <button type="button" className="adFold__tool" onClick={() => setEdit({ mode: "new", parentId: null })} aria-label="New folder" title="New folder"><FolderPlus aria-hidden="true" /></button>
        <button type="button" className="adFold__tool" onClick={() => { const next = sort === "az" ? "manual" : "az"; setSort(next); try { localStorage.setItem(SORT_KEY, next); } catch { /* ignore */ } }}
          aria-label={sort === "az" ? "Sorted A to Z. Sort by hand instead" : "Sorted by hand. Sort A to Z instead"} title={sort === "az" ? "A to Z" : "By hand"}>
          <span className="adFold__sortTxt" aria-hidden="true">{sort === "az" ? "A–Z" : "⇅"}</span>
        </button>
      </div>

      <ul className="adFold__tree" role="tree" aria-label="Folders">
        {rows.map((row, i) => {
          const selected = row.id === currentId;
          const drop = over === row.id;
          const href = row.kind === "all" ? hrefFor("") : row.kind === "unsorted" ? hrefFor("unsorted") : hrefFor(row.id);
          const Icon = row.kind === "all" ? Layers : row.kind === "unsorted" ? Inbox : row.kind === "folder" && row.open && row.hasKids ? FolderOpen : Folder;
          return (
            <li key={row.id} role="none" className={`adFold__item${row.kind === "unsorted" ? " is-pinEnd" : ""}`}>
              {edit?.mode === "rename" && edit.id === row.id ? (
                <NameInput depth={row.depth} initial={row.name} label={`Rename ${row.name}`} onSave={save} onCancel={() => { setEdit(null); requestAnimationFrame(() => go(row.id)); }} />
              ) : (
                <div className={`adFold__row${selected ? " is-on" : ""}${drop ? " is-drop" : ""}`} style={{ "--d": row.depth - 1 } as React.CSSProperties}
                  onDragOver={(e) => { if (!canDrop(e)) return; e.preventDefault(); if (over !== row.id) { setOver(row.id); window.clearTimeout(hoverOpen.current); if (row.kind === "folder" && row.hasKids && !row.open) hoverOpen.current = window.setTimeout(() => toggle(row.id, true), 700); } }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) { setOver((o) => (o === row.id ? null : o)); window.clearTimeout(hoverOpen.current); } }}
                  onDrop={(e) => void onDrop(e, row)}
                  onContextMenu={row.kind === "folder" ? (e) => { e.preventDefault(); setMenu({ id: row.id, x: e.clientX, y: e.clientY }); } : undefined}>
                  {row.kind === "folder" && row.hasKids ? (
                    <button type="button" tabIndex={-1} aria-hidden="true" className={`adFold__chev${row.open ? " is-open" : ""}`} onClick={() => toggle(row.id)}><ChevronRight /></button>
                  ) : <span className="adFold__chev" aria-hidden="true" />}
                  <Link href={href} role="treeitem" className="adFold__link"
                    ref={(el) => { if (el) items.current.set(row.id, el); else items.current.delete(row.id); }}
                    tabIndex={focus === row.id || (!rows.some((r) => r.id === focus) && selected) ? 0 : -1}
                    aria-level={row.depth} aria-selected={selected} aria-current={selected ? "page" : undefined}
                    aria-expanded={row.kind === "folder" && row.hasKids ? row.open : undefined}
                    draggable={row.kind === "folder"}
                    onDragStart={row.kind === "folder" ? (e) => { e.dataTransfer.setData(DRAG_FOLDER, row.id); e.dataTransfer.effectAllowed = "move"; } : undefined}
                    onFocus={() => setFocus(row.id)} onKeyDown={(e) => onKey(e, row, i)} onClick={() => onNavigate?.()}>
                    <Icon aria-hidden="true" className={`adFold__icon${row.kind === "folder" && row.folder.color ? ` is-${row.folder.color}` : ""}`} />
                    <span className="adFold__name">{row.name}</span>
                    <span className="adFold__n" aria-label={`${row.count} ${row.count === 1 ? "file" : "files"}`}>{row.count}</span>
                  </Link>
                  {row.kind === "folder" ? (
                    <button type="button" className="adFold__more" aria-label={`More for ${row.name}`} aria-haspopup="menu"
                      onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setMenu(menu?.id === row.id ? null : { id: row.id, x: r.right, y: r.bottom }); }}>
                      <MoreVertical aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              )}
              {edit?.mode === "new" && ((row.kind === "folder" && edit.parentId === row.id) || (row.kind === "unsorted" && edit.parentId === null)) ? (
                <NameInput depth={row.kind === "folder" ? row.depth + 1 : 1} initial="" label={edit.parentId ? `New folder inside ${row.name}` : "New folder"}
                  hint={edit.parentId ? `Inside ${row.name}` : "At the top level"} onSave={save} onCancel={() => setEdit(null)} />
              ) : null}
            </li>
          );
        })}
      </ul>
      {!tree.folders.length && !edit ? (
        <p className="adFold__empty">No folders yet. <button type="button" className="adFold__link2" onClick={() => setEdit({ mode: "new", parentId: null })}>Make the first one</button>, then drag files onto it.</p>
      ) : matches && matches.size === 0 ? <p className="adFold__empty">No folder is called that.</p> : null}

      {menu ? (
        <FolderMenu at={menu} folder={byId.get(menu.id)!} canNest={(byId.get(menu.id)?.depth ?? 5) < 5}
          onClose={() => { const id = menu.id; setMenu(null); requestAnimationFrame(() => items.current.get(id)?.focus()); }}
          onNew={() => { setMenu(null); setEdit({ mode: "new", parentId: menu.id }); toggle(menu.id, true); }}
          onRename={() => { setMenu(null); setEdit({ mode: "rename", id: menu.id }); }}
          onMove={() => { setMoving(byId.get(menu.id) ?? null); setMenu(null); }}
          onColor={async (c) => { setMenu(null); say(await colorMediaFolder({ id: menu.id, color: c })); }}
          onDelete={() => { const f = byId.get(menu.id)!; setMenu(null); void remove(f); }} />
      ) : null}
      <MoveToDialog open={Boolean(moving)} tree={tree} title={moving ? `Move ${moving.name} to…` : ""} mode="folder" exclude={moving?.id}
        onClose={() => setMoving(null)} onPick={async (to) => { const f = moving!; setMoving(null); await moveFolderTo(f.id, to); }} />
    </div>
  );
}

function NameInput({ depth, initial, label, hint, onSave, onCancel }: {
  depth: number; initial: string; label: string; hint?: string;
  onSave: (name: string) => Promise<{ ok: true } | { ok: false; error: string }>; onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  const commit = async () => {
    if (busy) return;
    if (!value.trim()) { if (initial) onCancel(); else setError("Give the folder a name, or press Escape."); return; }
    if (value.trim() === initial) return onCancel();
    setBusy(true);
    const r = await onSave(value);
    setBusy(false);
    if (!r.ok) setError(r.error);
  };
  return (
    <div className="adFold__edit" style={{ "--d": depth - 1 } as React.CSSProperties}>
      <Folder aria-hidden="true" className="adFold__icon" />
      <input ref={ref} value={value} maxLength={40} aria-label={label} aria-invalid={Boolean(error)} aria-describedby={error ? "adFoldErr" : undefined}
        onChange={(e) => { setValue(e.target.value); setError(""); }}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void commit(); } if (e.key === "Escape") { e.preventDefault(); onCancel(); } }}
        onBlur={() => { if (!error) void commit(); }} />
      <small className={error ? "adFold__err" : "adFold__hint"} id={error ? "adFoldErr" : undefined} role={error ? "alert" : undefined}>
        {error || `${hint ? `${hint}. ` : ""}Enter saves, Esc cancels.`}
      </small>
    </div>
  );
}

function FolderMenu({ at, folder, canNest, onClose, onNew, onRename, onMove, onColor, onDelete }: {
  at: { x: number; y: number }; folder: MediaFolder; canNest: boolean;
  onClose: () => void; onNew: () => void; onRename: () => void; onMove: () => void; onColor: (c: FolderColor | null) => void; onDelete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: at.x, top: at.y });
  useLayoutEffect(() => {
    const m = ref.current; if (!m) return;
    const w = m.offsetWidth, h = m.offsetHeight;
    setPos({ left: Math.max(8, Math.min(at.x - w, innerWidth - w - 8)), top: at.y + h + 8 > innerHeight ? Math.max(8, at.y - h - 36) : at.y + 4 });
    m.querySelector<HTMLElement>("[role=menuitem]")?.focus();
  }, [at]);
  useEffect(() => {
    const off = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) onClose(); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("pointerdown", off); window.addEventListener("keydown", key);
    return () => { window.removeEventListener("pointerdown", off); window.removeEventListener("keydown", key); };
  }, [onClose]);
  const onKey = (e: React.KeyboardEvent) => {
    const list = [...(ref.current?.querySelectorAll<HTMLElement>("[role=menuitem], [role=menuitemradio]") ?? [])];
    const i = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") { e.preventDefault(); list[(i + 1) % list.length]?.focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); list[(i - 1 + list.length) % list.length]?.focus(); }
    if (e.key === "Tab") onClose();
  };
  /* Inside `.ad`, so the admin's tokens reach it; fixed, so no scroller clips it. */
  const host = typeof document !== "undefined" ? document.querySelector<HTMLElement>(".ad") ?? document.body : null;
  if (!host) return null;
  return createPortal(
    <div ref={ref} className="adFold__menu" role="menu" aria-label={`${folder.name}`} style={pos} onKeyDown={onKey}>
      {canNest ? <button type="button" role="menuitem" onClick={onNew}><FolderPlus aria-hidden="true" /> New folder inside</button> : null}
      <button type="button" role="menuitem" onClick={onRename}><Pencil aria-hidden="true" /> Rename <kbd>F2</kbd></button>
      <button type="button" role="menuitem" onClick={onMove}><FolderInput aria-hidden="true" /> Move to…</button>
      <div className="adFold__swatches" role="group" aria-label="Colour tag">
        <button type="button" role="menuitemradio" aria-checked={!folder.color} aria-label="No colour" className="is-none" onClick={() => onColor(null)}><X aria-hidden="true" /></button>
        {COLORS.map((c) => <button key={c} type="button" role="menuitemradio" aria-checked={folder.color === c} aria-label={`${c[0].toUpperCase()}${c.slice(1)}`} className={`is-${c}`} onClick={() => onColor(c)} />)}
      </div>
      <hr />
      <button type="button" role="menuitem" className="is-danger" onClick={onDelete}><Trash2 aria-hidden="true" /> Delete folder…</button>
    </div>,
    host,
  );
}

/**
 * "Move to…": the tree again, searchable, for moving files (to a folder or
 * Unsorted) or a folder (to another, or the top level). A folder cannot be
 * moved into itself or anything below it, so those are left out.
 */
export function MoveToDialog({ open, onClose, onPick, tree, title, mode, exclude, current }: {
  open: boolean; onClose: () => void; onPick: (folderId: string | null) => void;
  tree: FolderTree; title: string; mode: "files" | "folder"; exclude?: string; current?: string | null;
}) {
  const [q, setQ] = useState("");
  const skip = useMemo(() => {
    const out = new Set<string>();
    if (!exclude) return out;
    const walk = (id: string) => { out.add(id); for (const f of tree.folders) if (f.parentId === id) walk(f.id); };
    walk(exclude);
    return out;
  }, [exclude, tree.folders]);
  const ordered = useMemo(() => {
    const out: MediaFolder[] = [];
    const walk = (parent: string | null) => {
      for (const f of tree.folders.filter((x) => x.parentId === parent).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))) {
        if (skip.has(f.id)) continue;
        out.push(f); walk(f.id);
      }
    };
    walk(null);
    return out;
  }, [tree.folders, skip]);
  const needle = q.trim().toLowerCase();
  const shown = needle ? ordered.filter((f) => f.name.toLowerCase().includes(needle)) : ordered;
  const pathOf = (f: MediaFolder) => { const parts: string[] = []; let p = f.parentId; while (p) { const x = tree.folders.find((y) => y.id === p); if (!x) break; parts.unshift(x.name); p = x.parentId; } return parts.join(" › "); };
  return (
    <Dialog open={open} onClose={() => { setQ(""); onClose(); }} title={title}>
      <div className="adMove">
        <label className="adFold__find adMove__find"><span className="ad__sr">Find a folder</span>
          <Search aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a folder" autoFocus />
        </label>
        <ul className="adMove__list" role="listbox" aria-label="Folders" data-lenis-prevent>
          {!needle ? (
            <li role="option" aria-selected={current === null}>
              <button type="button" onClick={() => onPick(null)} disabled={current === null}>
                {mode === "files" ? <Inbox aria-hidden="true" /> : <TreeIcon aria-hidden="true" />}
                <span>{mode === "files" ? "Unsorted" : "The top level"}</span>
                {current === null ? <small>Here now</small> : null}
              </button>
            </li>
          ) : null}
          {shown.map((f) => (
            <li key={f.id} role="option" aria-selected={current === f.id}>
              <button type="button" style={{ "--d": needle ? 0 : f.depth } as React.CSSProperties} onClick={() => onPick(f.id)} disabled={current === f.id || (mode === "folder" && f.depth >= 5)}>
                <Folder aria-hidden="true" className={`adFold__icon${f.color ? ` is-${f.color}` : ""}`} />
                <span>{f.name}{needle && pathOf(f) ? <small>{pathOf(f)}</small> : null}</span>
                {current === f.id ? <small>Here now</small> : mode === "folder" && f.depth >= 5 ? <small>Full</small> : null}
              </button>
            </li>
          ))}
          {needle && !shown.length ? <li className="adMove__none">No folder is called that.</li> : null}
        </ul>
      </div>
    </Dialog>
  );
}

/** On a narrow panel the tree is a sheet, opened from a button that says where you are. */
export function FolderSheet(props: { tree: FolderTree; current: string; currentName: string; onUpload?: (files: FileList, folderId: string | null) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="ad__btn adFold__sheetBtn" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <Folder aria-hidden="true" /> <span>{props.currentName}</span> <ChevronRight aria-hidden="true" />
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Folders">
        {open ? <FolderPane tree={props.tree} current={props.current} onUpload={props.onUpload} onNavigate={() => setOpen(false)} /> : null}
      </Dialog>
    </>
  );
}
