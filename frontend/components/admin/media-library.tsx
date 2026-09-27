"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check, ChevronDown, Copy, ExternalLink, FileText, Film, FolderInput, ImageIcon, RotateCcw, RotateCw, Save, Trash2, Upload, X,
} from "lucide-react";
import { checkMediaFile, MEDIA_ACCEPT, MEDIA_ALT_MAX, readableBytes } from "@/lib/media-validate";
import { archiveMedia, archiveMediaMany, deleteMediaForever, mediaUsedIn, moveMediaFiles, recordMediaUpload, restoreMedia, saveMediaDetails, signMediaUpload } from "@/lib/admin/media-actions";
import type { FolderTree } from "@/lib/media-folders";
import { ask } from "./confirm";
import { DRAG_FILES, FolderPane, FolderSheet, MoveToDialog } from "./media-folders";
import { toast } from "./toast";
import type { MediaAsset } from "@/lib/media";
import { when } from "./bits";
import { Dialog } from "./dialog";
import { Actions, Form, Hidden, Submit } from "./form";

/* ================================================================ upload */

type Job = {
  id: number; file: File; name: string; bytes: number;
  state: "waiting" | "sending" | "done" | "failed" | "cancelled";
  pct: number; error?: string; left?: number; xhr?: XMLHttpRequest; attempt: number;
  /** The folder it goes into; null is Unsorted. */
  folderId: string | null;
};
let seq = 0;
/** Three at a time: enough to keep a connection busy, few enough that each one finishes. */
const AT_ONCE = 3;

type Uploads = { add: (files: FileList | File[], folderId?: string | null) => void; disabled?: string };
const UploadCtx = createContext<Uploads>({ add: () => undefined });

/**
 * The upload tray. Every file goes the same three steps as before -- signed
 * by the server, PUT straight to R2, recorded once the server has asked R2
 * that it arrived -- but now three at a time, each with its own progress,
 * time left, Cancel, Retry and Remove, in a tray that stays put while you
 * keep working. Pictures and videos are measured first, so the library knows
 * their size without opening them again.
 */
export function UploadProvider({ disabled, folder = null, children }: { disabled?: string; folder?: string | null; children: React.ReactNode }) {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [open, setOpen] = useState(true);

  const patch = useCallback((id: number, change: Partial<Job>) => {
    setJobs((all) => all.map((j) => (j.id === id ? { ...j, ...change } : j)));
  }, []);

  const run = useCallback(async (job: Job) => {
    patch(job.id, { state: "sending", pct: 0, error: undefined, left: undefined });
    const local = checkMediaFile(job.file.name, job.file.size);
    if (!local.ok) return patch(job.id, { state: "failed", error: local.error });
    const dims = await measure(job.file);
    const grant = await signMediaUpload({ filename: job.file.name, size: job.file.size }).catch(() => null);
    if (!grant) return patch(job.id, { state: "failed", error: "The upload could not be started. Check your connection and try again." });
    if (!grant.ok) return patch(job.id, { state: "failed", error: grant.error });
    const started = performance.now();
    const put = await new Promise<"ok" | "failed" | "cancelled">((resolve) => {
      const xhr = new XMLHttpRequest();
      patch(job.id, { xhr });
      xhr.open("PUT", grant.url, true);
      xhr.setRequestHeader("Content-Type", grant.contentType);
      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        const secs = (performance.now() - started) / 1000;
        const rate = e.loaded / Math.max(secs, 0.25);
        patch(job.id, { pct: Math.min(95, Math.round((e.loaded / e.total) * 95)), left: rate > 0 ? Math.ceil((e.total - e.loaded) / rate) : undefined });
      };
      xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300 ? "ok" : "failed");
      xhr.onerror = () => resolve("failed");
      xhr.onabort = () => resolve("cancelled");
      xhr.send(job.file);
    });
    if (put === "cancelled") return patch(job.id, { state: "cancelled", xhr: undefined });
    if (put === "failed") return patch(job.id, { state: "failed", xhr: undefined, error: "The file store did not accept it. Try again; if it keeps happening, check the bucket allows uploads from this site." });
    const recorded = await recordMediaUpload({ key: grant.key, filename: job.file.name, ...dims, folderId: job.folderId }).catch(() => null);
    if (!recorded?.ok) return patch(job.id, { state: "failed", xhr: undefined, error: recorded?.error ?? "The file arrived but could not be listed. Try again." });
    patch(job.id, { state: "done", pct: 100, xhr: undefined, left: 0 });
    router.refresh();
  }, [patch, router]);

  /* The queue: whenever fewer than three are sending, start the next. The
     started set means a job is begun once per attempt, however many times
     the effect runs before its state reads "sending". */
  const started = useRef(new Set<string>());
  useEffect(() => {
    const sending = jobs.filter((j) => j.state === "sending").length;
    const next = jobs.filter((j) => j.state === "waiting" && !started.current.has(`${j.id}:${j.attempt}`)).slice(0, Math.max(0, AT_ONCE - sending));
    for (const j of next) { started.current.add(`${j.id}:${j.attempt}`); void run(j); }
  }, [jobs, run]);

  /* Into the folder being looked at, unless a drop on a folder says otherwise. */
  const add = useCallback((files: FileList | File[], into?: string | null) => {
    if (disabled) return;
    const target = into === undefined ? folder : into;
    const list = Array.from(files).slice(0, 40).map((file) => ({ id: ++seq, file, name: file.name, bytes: file.size, state: "waiting" as const, pct: 0, attempt: 0, folderId: target }));
    if (!list.length) return;
    setJobs((all) => [...all, ...list]);
    setOpen(true);
  }, [disabled, folder]);

  const done = jobs.filter((j) => j.state === "done").length;
  const failed = jobs.filter((j) => j.state === "failed").length;
  const busy = jobs.some((j) => j.state === "sending" || j.state === "waiting");
  const title = busy ? `Uploading ${done + 1 > jobs.length ? jobs.length : done + 1} of ${jobs.length}` : failed ? `${failed} did not upload` : `${done} uploaded`;

  return (
    <UploadCtx.Provider value={{ add, disabled }}>
      {children}
      {jobs.length ? (
        <section className="adTray" aria-label="Uploads">
          <header className="adTray__head">
            <button type="button" className="adTray__title" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              <span aria-live="polite">{title}</span>
              <ChevronDown aria-hidden="true" />
            </button>
            {!busy ? (
              <button type="button" className="adTray__x" aria-label="Close the uploads" onClick={() => setJobs([])}><X aria-hidden="true" /></button>
            ) : null}
          </header>
          {open ? (
            <ul className="adTray__list">
              {jobs.map((j) => (
                <li key={j.id} className={`adTray__job is-${j.state}`}>
                  <span className="adTray__name" title={j.name}>{j.name}</span>
                  <span className="adTray__meta">
                    {j.state === "waiting" ? "Waiting"
                      : j.state === "sending" ? `${j.pct}%${j.left !== undefined && j.left > 1 ? ` · ${j.left < 60 ? `${j.left}s` : `${Math.ceil(j.left / 60)} min`} left` : ""}`
                      : j.state === "done" ? <><Check aria-hidden="true" /> Added</>
                      : j.state === "cancelled" ? "Cancelled"
                      : readableBytes(j.bytes)}
                  </span>
                  <span className="adTray__acts">
                    {j.state === "sending" || j.state === "waiting" ? (
                      <button type="button" className="adTray__btn" onClick={() => { if (j.xhr) j.xhr.abort(); else patch(j.id, { state: "cancelled" }); }} aria-label={`Cancel ${j.name}`}><X aria-hidden="true" /></button>
                    ) : null}
                    {j.state === "failed" || j.state === "cancelled" ? (
                      <button type="button" className="adTray__btn" onClick={() => patch(j.id, { state: "waiting", pct: 0, error: undefined, attempt: j.attempt + 1 })} aria-label={`Try ${j.name} again`}><RotateCw aria-hidden="true" /></button>
                    ) : null}
                    {j.state !== "sending" && j.state !== "waiting" ? (
                      <button type="button" className="adTray__btn" onClick={() => setJobs((all) => all.filter((x) => x.id !== j.id))} aria-label={`Remove ${j.name} from this list`}><Trash2 aria-hidden="true" /></button>
                    ) : null}
                  </span>
                  {j.state === "sending" ? <span className="adTray__track" aria-hidden="true"><i style={{ width: `${j.pct}%` }} /></span> : null}
                  {j.error ? <span className="adTray__err" role="alert">{j.error}</span> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </UploadCtx.Provider>
  );
}

/** A picture's or a video's size, read in the browser before it goes. */
async function measure(file: File): Promise<{ width?: number; height?: number; durationMs?: number }> {
  const url = URL.createObjectURL(file);
  try {
    if (file.type.startsWith("image/")) {
      const img = new Image();
      await new Promise<void>((ok) => { img.onload = () => ok(); img.onerror = () => ok(); img.src = url; });
      return img.naturalWidth ? { width: img.naturalWidth, height: img.naturalHeight } : {};
    }
    if (file.type.startsWith("video/")) {
      const v = document.createElement("video");
      v.preload = "metadata";
      await new Promise<void>((ok) => { v.onloadedmetadata = () => ok(); v.onerror = () => ok(); v.src = url; setTimeout(ok, 4000); });
      return v.videoWidth ? { width: v.videoWidth, height: v.videoHeight, durationMs: Math.round(v.duration * 1000) || undefined } : {};
    }
    return {};
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * The folder tree beside the files on a wide panel, and a button that opens
 * it as a sheet on a narrow one; files from the computer dropped on a folder
 * upload into it.
 */
export function LibraryFolders({ tree, current, currentName }: { tree: FolderTree; current: string; currentName: string }) {
  const { add, disabled } = useContext(UploadCtx);
  const onUpload = disabled ? undefined : (files: FileList, folderId: string | null) => add(files, folderId);
  return (
    <>
      <aside className="adMedia__pane" aria-label="Folders" data-tour="media-folders"><FolderPane tree={tree} current={current} onUpload={onUpload} /></aside>
      <div className="adMedia__sheetBtn" data-tour="media-folders-sheet"><FolderSheet tree={tree} current={current} currentName={currentName} onUpload={onUpload} /></div>
    </>
  );
}

/** The head's Upload button. Disabled is solid, with the reason beside it. */
export function UploadButton() {
  const { add, disabled } = useContext(UploadCtx);
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" className="ad__btn ad__btn--primary" data-tour="media-upload" disabled={Boolean(disabled)} aria-describedby={disabled ? "adMediaOff" : undefined}
        onClick={() => input.current?.click()}>
        <Upload aria-hidden="true" /> Upload files
      </button>
      <input ref={input} type="file" multiple accept={MEDIA_ACCEPT} hidden onChange={(e) => { if (e.target.files) add(e.target.files); e.target.value = ""; }} />
    </>
  );
}

/** Files dropped anywhere on the library upload; the area says so while one is over it. */
export function DropArea({ children }: { children: React.ReactNode }) {
  const { add, disabled } = useContext(UploadCtx);
  const [over, setOver] = useState(false);
  const depth = useRef(0);
  const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes("Files");
  return (
    <div className={`adMedia__dropArea${over ? " is-over" : ""}`}
      onDragEnter={(e) => { if (disabled || !hasFiles(e)) return; e.preventDefault(); depth.current += 1; setOver(true); }}
      onDragOver={(e) => { if (disabled || !hasFiles(e)) return; e.preventDefault(); }}
      onDragLeave={() => { depth.current = Math.max(0, depth.current - 1); if (!depth.current) setOver(false); }}
      onDrop={(e) => { if (disabled || !hasFiles(e)) return; e.preventDefault(); depth.current = 0; setOver(false); add(e.dataTransfer.files); }}>
      {children}
      {over ? <div className="adMedia__dropHint" aria-hidden="true"><Upload /> Drop to upload</div> : null}
    </div>
  );
}

/* ================================================================ browse */

const kindOf = (t: string) => (t.startsWith("image/") ? "image" : t.startsWith("video/") ? "video" : "pdf");
const TYPE_LABEL: Record<string, string> = { image: "Picture", video: "Video", pdf: "PDF" };

/**
 * The files, as a grid of cards or a table, the details of whichever one is
 * open, and what to do with a selection. Tick a file (Shift for a range), or
 * drag it (and anything else ticked) onto a folder. Archive and Restore
 * announce here rather than on the card, since their whole effect is that
 * the card leaves this list.
 */
export function MediaBrowser({ items, view, empty, tree, archived = false, canDelete = false }: {
  items: MediaAsset[]; view: "grid" | "list"; empty: React.ReactNode; tree: FolderTree; archived?: boolean;
  /** The owner, who alone can delete from the Trash for good. */
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const [open, setOpen] = useState<MediaAsset | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [moving, setMoving] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const last = useRef<number | null>(null);
  const moved = useCallback((message: string) => { setOpen(null); setNotice(message); router.refresh(); }, [router]);
  const needs = (m: MediaAsset) => kindOf(m.contentType) === "image" && !m.alt && !m.decorative && !m.archivedAt;
  const folderName = (id: string | null) => (id ? tree.folders.find((f) => f.id === id)?.name ?? "A folder" : "Unsorted");


  const tick = (i: number, on: boolean, range: boolean) => {
    setPicked((was) => {
      const next = new Set(was);
      const span = range && last.current !== null ? items.slice(Math.min(last.current, i), Math.max(last.current, i) + 1) : [items[i]];
      for (const m of span) if (on) next.add(m.id); else next.delete(m.id);
      return next;
    });
    last.current = i;
  };
  const dragStart = (e: React.DragEvent, m: MediaAsset) => {
    const list = picked.has(m.id) ? items.filter((x) => picked.has(x.id)) : [m];
    e.dataTransfer.setData(DRAG_FILES, JSON.stringify({ ids: list.map((x) => x.id), from: Object.fromEntries(list.map((x) => [x.id, x.folderId])) }));
    e.dataTransfer.effectAllowed = "move";
  };
  /* Only what is on this page counts: a tick left from another page is ignored. */
  const chosen = items.filter((m) => picked.has(m.id));
  const moveTo = async (folderId: string | null, list: string[]) => {
    const from = Object.fromEntries(items.filter((m) => list.includes(m.id)).map((m) => [m.id, m.folderId]));
    const r = await moveMediaFiles({ ids: list, folderId });
    if (!r.ok) { toast(r.error, "bad"); return; }
    setPicked(new Set());
    toast(r.message, "good", { label: "Undo", run: async () => {
      const groups = new Map<string | null, string[]>();
      for (const id of list) groups.set(from[id] ?? null, [...(groups.get(from[id] ?? null) ?? []), id]);
      for (const [k, v] of groups) await moveMediaFiles({ ids: v, folderId: k });
      toast("Put back."); router.refresh();
    } });
    router.refresh();
  };
  const archiveAll = async () => {
    const n = chosen.length;
    if (!archived && !(await ask(`Move ${n} ${n === 1 ? "file" : "files"} to the Trash? They leave the library; any page already using their addresses keeps working, and they can be restored.`, { verb: "Trash" }))) return;
    setBusy(true);
    const r = await archiveMediaMany({ ids: chosen.map((m) => m.id), archived: !archived });
    setBusy(false);
    if (!r.ok) { toast(r.error, "bad"); return; }
    setPicked(new Set());
    setNotice(r.message);
    router.refresh();
  };
  /* Permanent, so asked with "I understand" ticked first (confirm.tsx). */
  const deleteAll = async () => {
    const n = chosen.length;
    if (!(await ask(`Delete ${n} ${n === 1 ? "file" : "files"} permanently? ${n === 1 ? "It is" : "They are"} removed from the file store and cannot be undone. Any page still using ${n === 1 ? "its address" : "their addresses"} will show a broken picture.`, { verb: "Delete" }))) return;
    setBusy(true);
    const r = await deleteMediaForever({ ids: chosen.map((m) => m.id) });
    setBusy(false);
    if (!r.ok) { toast(r.error, "bad"); return; }
    setPicked(new Set());
    toast(r.message);
    router.refresh();
  };
  const copy = async () => {
    const urls = chosen.map((m) => m.url).filter(Boolean).join("\n");
    try { await navigator.clipboard.writeText(urls); toast(`Copied ${chosen.length} ${chosen.length === 1 ? "address" : "addresses"}.`); }
    catch { toast("Your browser would not copy them. Open each file to copy its address.", "bad"); }
  };

  const Tick = ({ m, i }: { m: MediaAsset; i: number }) => (
    <input type="checkbox" className="adMedia__tick" checked={picked.has(m.id)} aria-label={`Select ${m.filename}`}
      onChange={() => undefined}
      onClick={(e) => tick(i, (e.currentTarget as HTMLInputElement).checked, e.shiftKey)} />
  );

  return (
    <>
      <p className={notice ? "ad__msg is-ok adMedia__notice" : "ad__sr adMedia__notice"} role="status">{notice}</p>
      {items.length ? (
        <label className="adMedia__all">
          <input type="checkbox" checked={chosen.length > 0 && chosen.length === items.length}
            ref={(el) => { if (el) el.indeterminate = chosen.length > 0 && chosen.length < items.length; }}
            onChange={(e) => setPicked(e.target.checked ? new Set(items.map((m) => m.id)) : new Set())} />
          Select all {items.length} shown
        </label>
      ) : null}
      {!items.length ? empty : view === "grid" ? (
        <ul className="adMedia__grid">
          {items.map((m, i) => (
            <li key={m.id} className={picked.has(m.id) ? "is-picked" : undefined} draggable={!m.archivedAt} onDragStart={(e) => dragStart(e, m)}>
              <Tick m={m} i={i} />
              <button type="button" className="adMedia__card" onClick={(e) => { if (e.shiftKey || e.metaKey || e.ctrlKey) { tick(i, !picked.has(m.id), e.shiftKey); return; } setOpen(m); }} aria-label={`${m.filename}, open its details`}>
                <Thumb item={m} />
                <span className="adMedia__cardBody">
                  <b className="adMedia__name">{m.filename}</b>
                  <small>{TYPE_LABEL[kindOf(m.contentType)]} · {readableBytes(m.bytes)}{m.width && m.height ? ` · ${m.width} × ${m.height}` : ""}</small>
                  {needs(m) ? <span className="ad__pill ad__pill--warn">Needs a description</span> : null}
                  {m.archivedAt ? <span className="ad__pill">In the Trash</span> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="ad__scroll">
          <table className="ad__t adMedia__table">
            <thead><tr><th>File</th><th>Folder</th><th>Description</th><th className="num">Size</th><th>Uploaded</th></tr></thead>
            <tbody>
              {items.map((m, i) => (
                <tr key={m.id} className={picked.has(m.id) ? "is-picked" : undefined} draggable={!m.archivedAt} onDragStart={(e) => dragStart(e, m)}>
                  <td>
                    <span className="adMedia__rowPick">
                      <Tick m={m} i={i} />
                      <button type="button" className="adMedia__rowBtn" onClick={() => setOpen(m)}>
                        <span className="adMedia__mini"><Thumb item={m} /></span>
                        <span className="adMedia__rowName">{m.filename}<small>{TYPE_LABEL[kindOf(m.contentType)]}</small></span>
                      </button>
                    </span>
                  </td>
                  <td>{folderName(m.folderId)}</td>
                  <td className="adMedia__altCell">{m.alt ? m.alt : needs(m) ? <span className="ad__pill ad__pill--warn">Needs a description</span> : m.decorative ? <span className="ad__dim">Decorative</span> : <span className="ad__dim">None</span>}</td>
                  <td className="num">{readableBytes(m.bytes)}</td>
                  <td>{when(m.uploadedAt)}<small>{m.uploadedBy}</small></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {chosen.length ? (
        <div className="adBulk adMedia__bulk" role="region" aria-label="Selected files">
          <span className="adBulk__n">{chosen.length} selected</span>
          {!archived ? <button type="button" className="ad__btn adBulk__btn" onClick={() => setMoving(chosen.map((m) => m.id))}><FolderInput aria-hidden="true" /> <span>Move to…</span></button> : null}
          <button type="button" className="ad__btn adBulk__btn" onClick={() => void copy()}><Copy aria-hidden="true" /> <span>Copy addresses</span></button>
          <button type="button" className="ad__btn adBulk__btn" disabled={busy} onClick={() => void archiveAll()}>
            {archived ? <RotateCcw aria-hidden="true" /> : <Trash2 aria-hidden="true" />} <span>{archived ? "Restore" : "Move to Trash"}</span>
          </button>
          {archived && canDelete ? (
            <button type="button" className="ad__btn adBulk__btn adBulk__btn--danger" disabled={busy} onClick={() => void deleteAll()}>
              <Trash2 aria-hidden="true" /> <span>Delete permanently</span>
            </button>
          ) : null}
          <button type="button" className="ad__btn adBulk__btn" onClick={() => setPicked(new Set())} aria-label="Clear the selection"><X aria-hidden="true" /></button>
        </div>
      ) : null}

      <MoveToDialog open={Boolean(moving)} tree={tree} mode="files" onClose={() => setMoving(null)}
        current={moving && moving.length === 1 ? items.find((m) => m.id === moving[0])?.folderId ?? null : undefined}
        title={moving ? `Move ${moving.length === 1 ? items.find((m) => m.id === moving[0])?.filename ?? "the file" : `${moving.length} files`} to…` : ""}
        onPick={(to) => { const list = moving!; setMoving(null); if (open) setOpen(null); void moveTo(to, list); }} />
      <Dialog open={Boolean(open)} onClose={() => setOpen(null)} title={open?.filename ?? "File"} wide>
        {open ? <Details key={open.id} item={open} onMoved={moved} folder={folderName(open.folderId)} onMove={() => setMoving([open.id])} canDelete={canDelete} /> : null}
      </Dialog>
    </>
  );
}

function Thumb({ item }: { item: MediaAsset }) {
  const kind = kindOf(item.contentType);
  /* An address that does not answer (a bucket not yet public, a file gone)
     shows the picture icon, not the browser's broken-image mark. */
  const [broken, setBroken] = useState(false);
  return (
    <span className="adMedia__thumb">
      {kind === "image" && item.url && !broken ? (
        /* A plain img: arbitrary uploads on R2's domain, shown as they are. */
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.url} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} />
      ) : kind === "video" ? <Film aria-hidden="true" /> : kind === "image" ? <ImageIcon aria-hidden="true" /> : <FileText aria-hidden="true" />}
    </span>
  );
}

function Details({ item, onMoved, folder, onMove, canDelete }: { item: MediaAsset; onMoved: (message: string) => void; folder: string; onMove: () => void; canDelete?: boolean }) {
  const kind = kindOf(item.contentType);
  const [decorative, setDecorative] = useState(item.decorative);
  const [alt, setAlt] = useState(item.alt);
  const done = (s: { message?: string }) => onMoved(s.message ?? "");
  /* Where it is used, asked when the details open: read from the posts and
     settings themselves, so it cannot fall behind them. */
  const [uses, setUses] = useState<{ label: string; href: string; where: string }[] | null>(null);
  useEffect(() => {
    let live = true;
    void mediaUsedIn({ id: item.id }).then((r) => { if (live) setUses(r.ok ? r.uses : []); });
    return () => { live = false; };
  }, [item.id]);
  const facts: [string, string][] = [
    ["Type", `${TYPE_LABEL[kind]} (${item.contentType.split("/")[1]?.toUpperCase()})`],
    ["Size", readableBytes(item.bytes)],
    ...(item.width && item.height ? [["Dimensions", `${item.width} × ${item.height}`] as [string, string]] : []),
    ...(item.durationMs ? [["Length", `${Math.floor(item.durationMs / 60000)}:${String(Math.round(item.durationMs / 1000) % 60).padStart(2, "0")}`] as [string, string]] : []),
    ["Folder", folder],
    ["Uploaded", `${when(item.uploadedAt)} by ${item.uploadedBy}`],
    ...(item.archivedAt ? [["Moved to the Trash", `${when(item.archivedAt)}${item.archivedBy ? ` by ${item.archivedBy}` : ""}`] as [string, string]] : []),
  ];
  return (
    <div className="adMediaD">
      <div className="adMediaD__view">
        {kind === "image" && item.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.url} alt={item.alt} />
        ) : kind === "video" && item.url ? (
          <video src={item.url} controls preload="metadata" />
        ) : (
          <span className="adMediaD__file">{kind === "image" ? <ImageIcon aria-hidden="true" /> : <FileText aria-hidden="true" />} {item.filename}</span>
        )}
      </div>
      <div className="adMediaD__side">
        {item.archivedAt ? (
          <p className="ad__dim adMediaD__arch">Files in the Trash are read-only. Restore it to change its details.</p>
        ) : (
          <Form action={saveMediaDetails} className="adMediaD__form">
            <Hidden name="id" value={item.id} />
            <label className="ad__f"><span className="ad__fl">Name</span>
              <input name="filename" defaultValue={item.filename} maxLength={200} required />
            </label>
            {kind === "image" ? (
              <>
                <label className="ad__f"><span className="ad__fl">Description (alt text)</span>
                  <textarea name="alt" rows={3} value={decorative ? "" : alt} disabled={decorative} maxLength={MEDIA_ALT_MAX}
                    onChange={(e) => setAlt(e.target.value)} placeholder="What the picture shows, for someone who cannot see it" />
                  <small className="ad__fh">{decorative ? "Left empty on purpose: screen readers skip it." : `${alt.length} / ${MEDIA_ALT_MAX}`}</small>
                </label>
                <label className="ad__check ad__check--long">
                  <input type="checkbox" name="decorative" checked={decorative} onChange={(e) => setDecorative(e.target.checked)} />
                  <span>Decorative<small>Only for a picture that carries no information, like a background texture.</small></span>
                </label>
              </>
            ) : <input type="hidden" name="alt" value={item.alt} />}
            <label className="ad__f"><span className="ad__fl">Caption</span>
              <input name="caption" defaultValue={item.caption} maxLength={300} placeholder="Shown under it on the page, if the page shows captions" />
            </label>
            <Actions><Submit icon={Save}>Save details</Submit></Actions>
          </Form>
        )}
        <dl className="adMediaD__facts">
          {facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
          <div>
            <dt>Used in</dt>
            <dd aria-live="polite">
              {uses === null ? <span className="ad__dim">Looking…</span>
                : uses.length ? (
                  <ul className="adMediaD__uses">
                    {uses.map((u) => <li key={u.href + u.where}><a href={u.href}>{u.label}</a> <small className="ad__dim">{u.where}</small></li>)}
                  </ul>
                ) : "Nothing on the site uses it."}
            </dd>
          </div>
        </dl>
        <div className="adMediaD__tools">
          {!item.archivedAt ? <button type="button" className="ad__btn" onClick={onMove}><FolderInput aria-hidden="true" /> Move to…</button> : null}
          {item.url ? <CopyUrl url={item.url} /> : null}
          {item.url ? <a className="ad__btn" href={item.url} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden="true" /> Open</a> : null}
          {item.archivedAt ? (
            <Form action={restoreMedia} onDone={done}>
              <Hidden name="id" value={item.id} />
              <Submit tone="plain" icon={RotateCcw}>Restore</Submit>
            </Form>
          ) : null}
          {item.archivedAt && canDelete ? (
            <button type="button" className="ad__btn ad__btn--danger" onClick={async () => {
              const inUse = uses?.length ? ` It is still used in ${uses.length} ${uses.length === 1 ? "place" : "places"} (${uses.slice(0, 3).map((u) => u.label).join(", ")}), which will show a broken picture.` : " Any page still using its address will show a broken picture.";
              if (!(await ask(`Delete ${item.filename} permanently? It is removed from the file store and cannot be undone.${inUse}`, { verb: "Delete" }))) return;
              const r = await deleteMediaForever({ ids: [item.id] });
              if (!r.ok) { toast(r.error, "bad"); return; }
              toast(r.message);
              onMoved(r.message);
            }}>
              <Trash2 aria-hidden="true" /> Delete permanently
            </button>
          ) : null}
          {item.archivedAt ? null : (
            <Form action={archiveMedia} onDone={done} confirm={`Move ${item.filename} to the Trash? It leaves the library; any page already using its address keeps working, and it can be restored.`}>
              <Hidden name="id" value={item.id} />
              <Submit tone="plain" icon={Trash2}>Move to Trash</Submit>
            </Form>
          )}
        </div>
      </div>
    </div>
  );
}

function CopyUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState<"" | "yes" | "no">("");
  return (
    <button type="button" className="ad__btn" onClick={async () => {
      try { await navigator.clipboard.writeText(url); setCopied("yes"); } catch { setCopied("no"); }
      setTimeout(() => setCopied(""), 2500);
    }}>
      {copied === "yes" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      <span aria-live="polite">{copied === "yes" ? "Copied" : copied === "no" ? "Select the address in Open" : "Copy address"}</span>
    </button>
  );
}
