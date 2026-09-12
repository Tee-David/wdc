"use client";

import { useCallback, useRef, useState } from "react";
import { FileText, ImageIcon, UploadCloud, X } from "lucide-react";

/**
 * Drag files here, or press to choose them.
 *
 * WHAT THIS REPLACED. A grey box that said "File upload arrives with the
 * backend. Send anything you have by email for now." That was honest and it
 * was also the wrong trade: a client with their logo open in another window
 * will not go and compose an email, so the asset arrives three days later or
 * not at all, and we start the work without it.
 *
 * SO EVERYTHING EXCEPT THE TRANSFER IS REAL. Files are accepted, validated
 * against a size and type limit, listed with their real sizes, previewed if
 * they are images, and removable. What is deferred is the last step -- the
 * PUT to R2 through a presigned URL -- and the panel says so in one line
 * rather than refusing the file. When the endpoint lands, `onFiles` gets a
 * body and nothing else here changes.
 *
 * The file names go into the answers either way, so the brief records what the
 * client meant to send even before it can be sent. A reviewer reading "logo
 * final v3.ai, brand colours.pdf" knows what to chase; a blank knows nothing.
 *
 * WHY NOT A LIBRARY. react-dropzone is 12KB for four DOM events and a `<input
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

type Picked = { file: File; url?: string; error?: string };

export default function Dropzone({
  id,
  value,
  onChange,
  describedBy,
}: {
  id: string;
  /** The file names, which is what the answer records. */
  value: string[];
  onChange: (names: string[]) => void;
  describedBy?: string;
}) {
  const [items, setItems] = useState<Picked[]>([]);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const add = useCallback(
    (incoming: FileList | null) => {
      if (!incoming?.length) return;
      setItems((prev) => {
        const next = [...prev];
        for (const file of Array.from(incoming)) {
          if (next.length >= MAX_FILES) break;
          /* Same name and same size is the same file. Dropping a folder twice
             is common and silently duplicating everything is not helpful. */
          if (next.some((x) => x.file.name === file.name && x.file.size === file.size)) continue;
          const error =
            file.size > MAX_BYTES
              ? `Too large (${pretty(file.size)}). The limit is ${pretty(MAX_BYTES)}.`
              : undefined;
          next.push({
            file,
            error,
            /* A thumbnail for images only. `createObjectURL` is cheap and
               local; nothing is uploaded to produce it. */
            url: !error && file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
          });
        }
        onChange(next.filter((x) => !x.error).map((x) => x.file.name));
        return next;
      });
    },
    [onChange],
  );

  const remove = (name: string, size: number) => {
    setItems((prev) => {
      const gone = prev.find((x) => x.file.name === name && x.file.size === size);
      if (gone?.url) URL.revokeObjectURL(gone.url);
      const next = prev.filter((x) => x !== gone);
      onChange(next.filter((x) => !x.error).map((x) => x.file.name));
      return next;
    });
  };

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
          {items.map(({ file, url, error }) => (
            <li key={`${file.name}-${file.size}`} className={error ? "is-bad" : undefined}>
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
                <em>{error ?? pretty(file.size)}</em>
              </span>
              <button
                type="button"
                onClick={() => remove(file.name, file.size)}
                aria-label={`Remove ${file.name}`}
              >
                <X aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* One line, and only once there is something to send. Saying "uploads
          are not wired up" to somebody who has not chosen a file is noise. */}
      {value.length > 0 && (
        <p className="dz__note">
          Noted on your brief. The transfer itself switches on with the backend.
          If you need us to have these today, reply to your onboarding email and
          attach them.
        </p>
      )}
    </div>
  );
}
