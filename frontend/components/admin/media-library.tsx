"use client";

import { ListSearch } from "./list-search";
import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Check, Copy, FileText, RotateCcw, Save, Upload } from "lucide-react";
import { checkMediaFile, MEDIA_ACCEPT, MEDIA_ALT_MAX, readableBytes } from "@/lib/media-validate";
import { archiveMedia, recordMediaUpload, restoreMedia, saveMediaAlt, signMediaUpload } from "@/lib/admin/media-actions";
import type { MediaAsset } from "@/lib/media";
import { when } from "./bits";
import { Actions, Form, Hidden, Submit } from "./form";

type Sending = { id: number; name: string; pct: number; error?: string; done?: boolean };
let seq = 0;

/**
 * Pick files, and each one goes: signed by the server, PUT straight to R2,
 * then recorded once the server has asked R2 that it arrived. Same three
 * steps as the onboarding dropzone, without its per-draft bookkeeping.
 */
export function MediaUploader({ disabled }: { disabled?: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState<Sending[]>([]);
  const patch = useCallback((id: number, change: Partial<Sending>) => {
    setSending((all) => all.map((s) => (s.id === id ? { ...s, ...change } : s)));
  }, []);

  const send = useCallback(async (file: File) => {
    const id = ++seq;
    setSending((all) => [...all, { id, name: file.name, pct: 0 }]);

    /* Checked here too so a wrong file fails before a round trip. The server
       checks again; this one is only a courtesy. */
    const local = checkMediaFile(file.name, file.size);
    if (!local.ok) return patch(id, { error: local.error });

    const grant = await signMediaUpload({ filename: file.name, size: file.size }).catch(() => null);
    if (!grant) return patch(id, { error: "The upload could not be started. Check your connection and try again." });
    if (!grant.ok) return patch(id, { error: grant.error });

    const put = await new Promise<boolean>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", grant.url, true);
      xhr.setRequestHeader("Content-Type", grant.contentType);
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) patch(id, { pct: Math.min(95, Math.round((e.loaded / e.total) * 95)) }); };
      xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
      /* A refused cross-origin PUT and a dropped connection look identical
         from here; see the onboarding dropzone for the long version. */
      xhr.onerror = () => resolve(false);
      xhr.send(file);
    });
    if (!put) return patch(id, { error: "The file store did not accept the upload. If this keeps happening, check the bucket's CORS policy allows this site." });

    const recorded = await recordMediaUpload({ key: grant.key, filename: file.name }).catch(() => null);
    if (!recorded?.ok) return patch(id, { error: recorded?.error ?? "The file arrived but could not be listed. Try again." });
    patch(id, { pct: 100, done: true });
    router.refresh();
  }, [patch, router]);

  const onPick = (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files).slice(0, 12)) void send(f);
    if (input.current) input.current.value = "";
  };

  return (
    <div className="adMedia__up">
      <label className={`ad__btn ad__btn--primary adMedia__pick${disabled ? " is-off" : ""}`}>
        <Upload aria-hidden="true" /> Upload files
        <input ref={input} type="file" multiple accept={MEDIA_ACCEPT} disabled={Boolean(disabled)}
               onChange={(e) => onPick(e.target.files)} />
      </label>
      <p className="ad__dim adMedia__rule">
        {disabled ?? `PNG, JPEG, WebP, AVIF, GIF or PDF, up to ${readableBytes(10 * 1024 * 1024)} each. No SVG: these files are shown on the public site.`}
      </p>
      {sending.length ? (
        <ul className="adMedia__queue" aria-live="polite">
          {sending.map((s) => (
            <li key={s.id} className={s.error ? "is-bad" : s.done ? "is-done" : undefined}>
              <span className="adMedia__qName">{s.name}</span>
              {s.error ? <span role="alert">{s.error}</span>
                : s.done ? <span><Check aria-hidden="true" /> Added</span>
                : <progress max={100} value={s.pct} aria-label={`Uploading ${s.name}`} />}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function CopyUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" className="ad__btn" onClick={async () => {
      try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
      catch { window.prompt("Copy the address", url); }
    }}>
      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      <span aria-live="polite">{copied ? "Copied" : "Copy address"}</span>
    </button>
  );
}

/**
 * The cards, plus the line that says what just happened to one of them.
 *
 * ARCHIVE AND RESTORE ANNOUNCE HERE, NOT ON THE CARD, because their whole
 * effect is that the card leaves this list: a message drawn inside it would
 * be unmounted in the same render that delivered it, and nobody -- sighted or
 * using a screen reader -- would ever get it. So the action does not refresh
 * the page itself; the card reports back, the notice is set up here, and only
 * then is the list refreshed.
 */
export function MediaGrid({ items, empty, search = true }: { items: MediaAsset[]; empty: React.ReactNode; search?: boolean }) {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const moved = useCallback((message: string) => { setNotice(message); router.refresh(); }, [router]);
  return (
    <>
      <p className={notice ? "ad__msg is-ok adMedia__notice" : "ad__sr adMedia__notice"} role="status">{notice}</p>
      {/* The empty state is drawn here too, so archiving the last card does
          not unmount the notice along with the list. */}
      {/* The instant filter only when every file is on this page; past one
          page the search is the server's (the form on the media page). */}
      {items.length && search ? <ListSearch target="media-grid" placeholder="Search by file name or description" noun="files" /> : null}
      {items.length ? (
        <ul className="adMedia__grid" id="media-grid">
          {items.map((m) => <MediaCard key={m.id} item={m} onMoved={moved} />)}
        </ul>
      ) : empty}
    </>
  );
}

function MediaCard({ item, onMoved }: { item: MediaAsset; onMoved: (message: string) => void }) {
  const done = (s: { message?: string }) => onMoved(s.message ?? "");
  const image = item.contentType.startsWith("image/");
  const altId = `alt-${item.id}`;
  return (
    <li className="adMedia__card" data-row data-search={`${item.filename} ${item.alt ?? ""}`}>
      <div className="adMedia__thumb">
        {image && item.url ? (
          /* A plain img, not next/image: these are arbitrary uploads on
             R2's domain and the admin needs the file as it is, not a variant
             the optimiser would generate from an unlisted host. */
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.url} alt={item.alt} loading="lazy" decoding="async" />
        ) : (
          <FileText aria-hidden="true" />
        )}
      </div>
      <div className="adMedia__body">
        <b className="adMedia__name" title={item.filename}>{item.filename}</b>
        <small className="ad__dim">
          {readableBytes(item.bytes)} · {when(item.uploadedAt)} · {item.uploadedBy}
        </small>
        {image && !item.alt && !item.archivedAt ? <span className="ad__pill ad__pill--warn">No description</span> : null}
        {item.archivedAt ? (
          <small className="ad__dim">Archived {when(item.archivedAt)}{item.archivedBy ? ` by ${item.archivedBy}` : ""}</small>
        ) : null}

        {image && !item.archivedAt ? (
          <Form action={saveMediaAlt} className="adMedia__alt">
            <Hidden name="id" value={item.id} />
            <label htmlFor={altId}>Description (alt text)</label>
            <input id={altId} name="alt" defaultValue={item.alt} maxLength={MEDIA_ALT_MAX}
                   placeholder="What the picture shows" />
            <Actions><Submit tone="plain" icon={Save}>Save</Submit></Actions>
          </Form>
        ) : null}

        <div className="adMedia__tools">
          {item.url ? <CopyUrl url={item.url} /> : null}
          {item.url ? <a className="ad__btn" href={item.url} target="_blank" rel="noopener noreferrer">Open</a> : null}
          {item.archivedAt ? (
            <Form action={restoreMedia} onDone={done}>
              <Hidden name="id" value={item.id} />
              <Submit tone="plain" icon={RotateCcw}>Restore</Submit>
            </Form>
          ) : (
            <Form action={archiveMedia} onDone={done} confirm={`Archive ${item.filename}? It leaves the library; any page already using its address keeps working.`}>
              <Hidden name="id" value={item.id} />
              <Submit tone="danger" icon={Archive}>Archive</Submit>
            </Form>
          )}
        </div>
      </div>
    </li>
  );
}
