"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive, Check, ChevronDown, Copy, ExternalLink, FileText, Film, ImageIcon, RotateCcw, RotateCw, Save, Trash2, Upload, X,
} from "lucide-react";
import { checkMediaFile, MEDIA_ACCEPT, MEDIA_ALT_MAX, readableBytes } from "@/lib/media-validate";
import { archiveMedia, recordMediaUpload, restoreMedia, saveMediaDetails, signMediaUpload } from "@/lib/admin/media-actions";
import type { MediaAsset } from "@/lib/media";
import { when } from "./bits";
import { Dialog } from "./dialog";
import { Actions, Form, Hidden, Submit } from "./form";

/* ================================================================ upload */

type Job = {
  id: number; file: File; name: string; bytes: number;
  state: "waiting" | "sending" | "done" | "failed" | "cancelled";
  pct: number; error?: string; left?: number; xhr?: XMLHttpRequest; attempt: number;
};
let seq = 0;
/** Three at a time: enough to keep a connection busy, few enough that each one finishes. */
const AT_ONCE = 3;

type Uploads = { add: (files: FileList | File[]) => void; disabled?: string };
const UploadCtx = createContext<Uploads>({ add: () => undefined });

/**
 * The upload tray. Every file goes the same three steps as before -- signed
 * by the server, PUT straight to R2, recorded once the server has asked R2
 * that it arrived -- but now three at a time, each with its own progress,
 * time left, Cancel, Retry and Remove, in a tray that stays put while you
 * keep working. Pictures and videos are measured first, so the library knows
 * their size without opening them again.
 */
export function UploadProvider({ disabled, children }: { disabled?: string; children: React.ReactNode }) {
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
    const recorded = await recordMediaUpload({ key: grant.key, filename: job.file.name, ...dims }).catch(() => null);
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

  const add = useCallback((files: FileList | File[]) => {
    if (disabled) return;
    const list = Array.from(files).slice(0, 40).map((file) => ({ id: ++seq, file, name: file.name, bytes: file.size, state: "waiting" as const, pct: 0, attempt: 0 }));
    if (!list.length) return;
    setJobs((all) => [...all, ...list]);
    setOpen(true);
  }, [disabled]);

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

/** The head's Upload button. Disabled is solid, with the reason beside it. */
export function UploadButton() {
  const { add, disabled } = useContext(UploadCtx);
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" className="ad__btn ad__btn--primary" disabled={Boolean(disabled)} aria-describedby={disabled ? "adMediaOff" : undefined}
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
 * The files, as a grid of cards or a table, and the details of whichever one
 * is open. Archive and Restore announce here rather than on the card, since
 * their whole effect is that the card leaves this list.
 */
export function MediaBrowser({ items, view, empty }: { items: MediaAsset[]; view: "grid" | "list"; empty: React.ReactNode }) {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const [open, setOpen] = useState<MediaAsset | null>(null);
  const moved = useCallback((message: string) => { setOpen(null); setNotice(message); router.refresh(); }, [router]);
  const needs = (m: MediaAsset) => kindOf(m.contentType) === "image" && !m.alt && !m.decorative && !m.archivedAt;

  return (
    <>
      <p className={notice ? "ad__msg is-ok adMedia__notice" : "ad__sr adMedia__notice"} role="status">{notice}</p>
      {!items.length ? empty : view === "grid" ? (
        <ul className="adMedia__grid">
          {items.map((m) => (
            <li key={m.id}>
              <button type="button" className="adMedia__card" onClick={() => setOpen(m)} aria-label={`${m.filename}, open its details`}>
                <Thumb item={m} />
                <span className="adMedia__cardBody">
                  <b className="adMedia__name">{m.filename}</b>
                  <small>{TYPE_LABEL[kindOf(m.contentType)]} · {readableBytes(m.bytes)}{m.width && m.height ? ` · ${m.width} × ${m.height}` : ""}</small>
                  {needs(m) ? <span className="ad__pill ad__pill--warn">Needs a description</span> : null}
                  {m.archivedAt ? <span className="ad__pill">Archived</span> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="ad__scroll">
          <table className="ad__t adMedia__table">
            <thead><tr><th>File</th><th>Type</th><th>Description</th><th className="num">Size</th><th>Uploaded</th></tr></thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id}>
                  <td>
                    <button type="button" className="adMedia__rowBtn" onClick={() => setOpen(m)}>
                      <span className="adMedia__mini"><Thumb item={m} /></span>
                      <span className="adMedia__rowName">{m.filename}</span>
                    </button>
                  </td>
                  <td>{TYPE_LABEL[kindOf(m.contentType)]}</td>
                  <td className="adMedia__altCell">{m.alt ? m.alt : needs(m) ? <span className="ad__pill ad__pill--warn">Needs a description</span> : m.decorative ? <span className="ad__dim">Decorative</span> : <span className="ad__dim">None</span>}</td>
                  <td className="num">{readableBytes(m.bytes)}</td>
                  <td>{when(m.uploadedAt)}<small>{m.uploadedBy}</small></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={Boolean(open)} onClose={() => setOpen(null)} title={open?.filename ?? "File"} wide>
        {open ? <Details key={open.id} item={open} onMoved={moved} /> : null}
      </Dialog>
    </>
  );
}

function Thumb({ item }: { item: MediaAsset }) {
  const kind = kindOf(item.contentType);
  return (
    <span className="adMedia__thumb">
      {kind === "image" && item.url ? (
        /* A plain img: arbitrary uploads on R2's domain, shown as they are. */
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.url} alt="" loading="lazy" decoding="async" />
      ) : kind === "video" ? <Film aria-hidden="true" /> : kind === "image" ? <ImageIcon aria-hidden="true" /> : <FileText aria-hidden="true" />}
    </span>
  );
}

function Details({ item, onMoved }: { item: MediaAsset; onMoved: (message: string) => void }) {
  const kind = kindOf(item.contentType);
  const [decorative, setDecorative] = useState(item.decorative);
  const [alt, setAlt] = useState(item.alt);
  const done = (s: { message?: string }) => onMoved(s.message ?? "");
  const facts: [string, string][] = [
    ["Type", `${TYPE_LABEL[kind]} (${item.contentType.split("/")[1]?.toUpperCase()})`],
    ["Size", readableBytes(item.bytes)],
    ...(item.width && item.height ? [["Dimensions", `${item.width} × ${item.height}`] as [string, string]] : []),
    ...(item.durationMs ? [["Length", `${Math.floor(item.durationMs / 60000)}:${String(Math.round(item.durationMs / 1000) % 60).padStart(2, "0")}`] as [string, string]] : []),
    ["Uploaded", `${when(item.uploadedAt)} by ${item.uploadedBy}`],
    ...(item.archivedAt ? [["Archived", `${when(item.archivedAt)}${item.archivedBy ? ` by ${item.archivedBy}` : ""}`] as [string, string]] : []),
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
          <p className="ad__dim adMediaD__arch">Archived files are read-only. Restore it to change its details.</p>
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
        </dl>
        <div className="adMediaD__tools">
          {item.url ? <CopyUrl url={item.url} /> : null}
          {item.url ? <a className="ad__btn" href={item.url} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden="true" /> Open</a> : null}
          {item.archivedAt ? (
            <Form action={restoreMedia} onDone={done}>
              <Hidden name="id" value={item.id} />
              <Submit tone="plain" icon={RotateCcw}>Restore</Submit>
            </Form>
          ) : (
            <Form action={archiveMedia} onDone={done} confirm={`Archive ${item.filename}? It leaves the library; any page already using its address keeps working.`}>
              <Hidden name="id" value={item.id} />
              <Submit tone="plain" icon={Archive}>Archive</Submit>
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
