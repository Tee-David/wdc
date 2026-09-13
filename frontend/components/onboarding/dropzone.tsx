"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Check, FileText, ImageIcon, RotateCcw, UploadCloud, X } from "lucide-react";

/**
 * Drag files here, or press to choose them. The files really go.
 *
 * HOW IT WORKS. The browser asks `/api/onboarding/upload` to authorise one
 * file; the route checks the draft cookie, decides the key, the content type
 * and the ceiling, and hands back a presigned PUT that is good for five
 * minutes. The browser then PUTs straight to R2. Nothing but the small JSON
 * passes through our own server, which is what makes the progress bar honest:
 * it is one request the browser owns, so `xhr.upload.onprogress` is reporting
 * bytes actually on the wire rather than a timer pretending to be one.
 *
 * WHY XHR AND NOT FETCH. `fetch` still has no upload progress event. That is
 * the entire reason; everything else here would rather be fetch.
 *
 * WHERE THE FILES END UP. Every object for a brief is written under
 * `onboarding/<draftId>/`, so the whole set for a client is one prefix listing
 * rather than something that has to be joined up later. The ANSWER records the
 * filename, because that is what a person reading the brief needs to see.
 *
 * WHY NOT A LIBRARY. react-dropzone is 12KB for four DOM events and an `<input
 * type=file>`. The events are `dragenter`, `dragover`, `dragleave` and `drop`,
 * and the only non-obvious part is that `dragover` MUST be prevented or the
 * browser navigates away to open the file -- which is written down below.
 */

const MB = 1024 * 1024;

/** Big enough for a layered logo file, small enough to fail fast on a video. */
const MAX_BYTES = 25 * MB;
const MAX_FILES = 8;

const ACCEPT =
  ".png,.jpg,.jpeg,.webp,.svg,.pdf,.ai,.eps,.psd,.zip,.doc,.docx,.ppt,.pptx";

function pretty(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / MB).toFixed(1)} MB`;
}

type Status = "waiting" | "sending" | "done" | "failed";

type Picked = {
  file: File;
  url?: string;
  /** Set when the file is refused before it is ever sent. */
  error?: string;
  status: Status;
  /** 0-100, from the upload's own progress events. */
  pct: number;
  /** Why the send failed, in words a client can act on. */
  failure?: string;
};

const keyOf = (f: File) => `${f.name}:${f.size}`;

export default function Dropzone({
  id,
  onChange,
  describedBy,
}: {
  id: string;
  /** Receives the names of the files that actually reached the bucket. */
  onChange: (names: string[]) => void;
  describedBy?: string;
}) {
  const [items, setItems] = useState<Picked[]>([]);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  /* Only files that actually arrived count as answered. A name in the brief
     that never reached the bucket is worse than no name at all: it tells
     whoever reads it that an asset exists when it does not. */
  const publishedRef = useRef("");

  const add = useCallback((incoming: FileList | null) => {
    if (!incoming?.length) return;
    setItems((prev) => {
      const next = [...prev];
      for (const file of Array.from(incoming)) {
        if (next.length >= MAX_FILES) break;
        /* Same name and same size is the same file. Dropping a folder twice is
           common and silently duplicating everything is not helpful. */
        if (next.some((x) => keyOf(x.file) === keyOf(file))) continue;
        const error =
          file.size > MAX_BYTES
            ? `Too large (${pretty(file.size)}). The limit is ${pretty(MAX_BYTES)}.`
            : undefined;
        next.push({
          file,
          error,
          status: error ? "failed" : "waiting",
          pct: 0,
          /* A thumbnail for images only. `createObjectURL` is cheap and local;
             nothing is uploaded to produce it. */
          url: !error && file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
        });
      }
      return next;
    });
  }, []);

  const patch = useCallback((k: string, change: Partial<Picked>) => {
    setItems((prev) => prev.map((x) => (keyOf(x.file) === k ? { ...x, ...change } : x)));
  }, []);

  /* One in-flight request per file, tracked so a re-render cannot start a
     second upload of something already going up. */
  const inFlight = useRef(new Map<string, XMLHttpRequest>());

  const send = useCallback(async (item: Picked) => {
    const k = keyOf(item.file);
    if (inFlight.current.has(k)) return;
    patch(k, { status: "sending", pct: 0, failure: undefined });

    let grant: { url: string; contentType: string };
    try {
      const res = await fetch("/api/onboarding/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: item.file.name, size: item.file.size }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "That did not go through.");
      grant = body;
    } catch (e) {
      patch(k, { status: "failed", failure: e instanceof Error ? e.message : "That did not go through." });
      return;
    }

    const xhr = new XMLHttpRequest();
    inFlight.current.set(k, xhr);
    xhr.open("PUT", grant.url, true);
    /* Must match the type the server signed, or R2 refuses the request. */
    xhr.setRequestHeader("Content-Type", grant.contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) patch(k, { pct: Math.min(99, Math.round((e.loaded / e.total) * 100)) });
    };
    xhr.onload = () => {
      inFlight.current.delete(k);
      if (xhr.status >= 200 && xhr.status < 300) patch(k, { status: "done", pct: 100 });
      else patch(k, { status: "failed", failure: "The upload was refused. Try again." });
    };
    xhr.onerror = () => {
      inFlight.current.delete(k);
      /* WHY THIS DOES NOT SAY "THE CONNECTION DROPPED".

         It used to, and it was wrong, and it sent the reader to check their
         wifi for an hour over a server-side misconfiguration. A cross-origin
         PUT that the storage bucket's CORS policy refuses is cancelled by the
         browser BEFORE it is sent: the request never reaches the network, the
         status stays 0, and XHR reports it through exactly this handler and no
         other. A genuinely dropped connection lands here too, and from inside
         the page the two are indistinguishable by design -- the browser will
         not tell a script why it blocked a cross-origin request.

         So say what we actually know, and do not blame the reader's network
         for something that is probably ours. The server-side note names the
         likelier cause for whoever reads the logs. */
      patch(k, {
        status: "failed",
        failure: "We could not reach the file store. Finding out why…",
      });
      /* A REPORT, NOT A NEW GRANT -- AND IT COMES BACK WITH THE REASON.

         The browser will not say why it refused a cross-origin request, so
         the server sends the same preflight from outside CORS and reads the
         answer. Until it replies the message above is the honest one: we know
         it failed and we do not yet know why. When it replies, the message
         becomes the actual cause. */
      void fetch("/api/onboarding/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report: "transport-failed", filename: item.file.name }),
      })
        .then((r) => r.json().catch(() => null))
        .then((d: { reason?: string } | null) => {
          patch(k, {
            failure: d?.reason
              ?? "We could not reach the file store. Try again, and tell us if it keeps happening.",
          });
        })
        .catch(() => {
          patch(k, {
            failure: "We could not reach the file store. Try again, and tell us if it keeps happening.",
          });
        });
    };
    xhr.onabort = () => inFlight.current.delete(k);
    xhr.send(item.file);
  }, [patch]);

  /* Anything sitting in `waiting` gets sent. Keeping the trigger here rather
     than inside `add` means a retry is the same code path as a first attempt.

     Off a frame, because `send` marks the file "sending" the moment it starts
     and doing that straight from an effect body cascades a second render. */
  useEffect(() => {
    const waiting = items.filter((x) => x.status === "waiting");
    if (!waiting.length) return;
    const id = requestAnimationFrame(() => { for (const item of waiting) void send(item); });
    return () => cancelAnimationFrame(id);
  }, [items, send]);

  /* The answer follows the uploads, not the picking.

     Deferred by a frame, and only when the list of arrived files has actually
     CHANGED. `onChange` sets state in the form above this component, and
     calling it straight from an effect body cascades a second render every
     time a progress event lands -- which is many times a second during an
     upload. */
  useEffect(() => {
    const names = items.filter((x) => x.status === "done").map((x) => x.file.name);
    const signature = names.join("\u0000");
    if (signature === publishedRef.current) return;
    publishedRef.current = signature;
    const id = requestAnimationFrame(() => onChange(names));
    return () => cancelAnimationFrame(id);
  }, [items, onChange]);

  useEffect(() => {
    const map = inFlight.current;
    return () => { for (const xhr of map.values()) xhr.abort(); };
  }, []);

  const remove = (name: string, size: number) => {
    setItems((prev) => {
      const gone = prev.find((x) => x.file.name === name && x.file.size === size);
      if (gone) {
        const k = keyOf(gone.file);
        inFlight.current.get(k)?.abort();
        inFlight.current.delete(k);
        if (gone.url) URL.revokeObjectURL(gone.url);
      }
      return prev.filter((x) => x !== gone);
    });
  };

  const done = items.filter((x) => x.status === "done").length;

  return (
    <div className="dz">
      <div
        className={`dz__zone${over ? " is-over" : ""}`}
        /* PREVENTING `dragover` IS NOT OPTIONAL. Without it the browser's own
           default wins the drop and navigates the tab to the file, which loses
           everything the client has typed so far. It is the single most
           important line in this component. */
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragEnter={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={(e) => {
          /* Only when the pointer has actually left the zone, not when it
             crosses onto a child element -- which fires `dragleave` too and
             would make the highlight flicker the whole way across. */
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false);
        }}
        onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}
      >
        <input
          ref={input}
          id={id}
          type="file"
          multiple
          accept={ACCEPT}
          aria-describedby={describedBy}
          onChange={(e) => { add(e.target.files); e.target.value = ""; }}
        />
        <UploadCloud aria-hidden="true" />
        <p className="dz__lead">
          <button type="button" onClick={() => input.current?.click()}>Choose files</button>
          <span> or drag them here</span>
        </p>
        <p className="dz__meta">
          Up to {MAX_FILES} files, {pretty(MAX_BYTES)} each. Images, PDFs, and design files.
        </p>
      </div>

      {items.length > 0 && (
        <ul className="dz__list">
          {items.map((item) => {
            const { file, url, error, status, pct, failure } = item;
            const bad = status === "failed";
            const note = error ?? failure;
            return (
              <li
                key={keyOf(file)}
                className={[bad ? "is-bad" : "", status === "done" ? "is-ready" : ""].filter(Boolean).join(" ") || undefined}
              >
                <span className="dz__thumb" aria-hidden="true">
                  {url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={url} alt="" />
                    : file.type === "application/pdf"
                      ? <FileText />
                      : <ImageIcon />}
                </span>
                <span className="dz__name">
                  <b>{file.name}</b>
                  <em>
                    {bad ? note
                      : status === "done" ? `${pretty(file.size)} · added`
                      : status === "sending" ? `${pretty(file.size)} · ${pct}%`
                      : pretty(file.size)}
                  </em>
                  {/* The bar is only up while something is actually moving. A
                      finished row does not need a full bar sitting under it
                      saying so twice. */}
                  {status === "sending" && (
                    <span
                      className="dz__bar"
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Uploading ${file.name}`}
                    >
                      <i style={{ width: `${pct}%` }} />
                    </span>
                  )}
                </span>

                {status === "done" && (
                  <span className="dz__ok" aria-label="Uploaded"><Check aria-hidden="true" /></span>
                )}
                {bad && !error && (
                  <button type="button" onClick={() => send(item)} aria-label={`Try ${file.name} again`}>
                    <RotateCcw aria-hidden="true" />
                  </button>
                )}
                {bad && error && <AlertCircle className="dz__warn" aria-hidden="true" />}

                <button
                  type="button"
                  onClick={() => remove(file.name, file.size)}
                  aria-label={`Remove ${file.name}`}
                >
                  <X aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Said once, for screen readers as much as anyone: the count is the
          only confirmation that the set is complete. */}
      {done > 0 && (
        <p className="dz__note" role="status">
          {done} {done === 1 ? "file" : "files"} uploaded.
        </p>
      )}
    </div>
  );
}
