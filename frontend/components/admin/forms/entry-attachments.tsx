import { Download, ExternalLink, FileText, ImageIcon, Paperclip } from "lucide-react";
import { Panel } from "@/components/admin/bits";
import type { EntryFile } from "@/lib/onboarding-files";

const size = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : n > 0 ? `${Math.max(1, Math.round(n / 1024))} KB` : "");
const isImage = (f: EntryFile) => f.contentType.startsWith("image/") && f.contentType !== "image/svg+xml";
const label = (f: EntryFile) => (f.contentType === "application/pdf" ? "PDF" : (f.name.split(".").pop() ?? "File").toUpperCase().slice(0, 5));

/**
 * EVERYTHING THE CLIENT SENT, before the answers: pictures as pictures, other
 * files as tiles, each with the question it answered and Open and Download.
 * The links are signed and last an hour (lib/onboarding-files.ts), so the page
 * is the way in and a copied link goes stale.
 */
export function EntryAttachments({ files }: { files: EntryFile[] }) {
  if (!files.length) return null;
  const total = files.reduce((a, f) => a + f.bytes, 0);
  return (
    <Panel title="Attachments" action={<span className="ad__pill">{files.length} {files.length === 1 ? "file" : "files"}{total ? ` · ${size(total)}` : ""}</span>}>
      <ul className="adAtt">
        {files.map((f, i) => (
          <li key={`${f.name}-${i}`} className="adAtt__file">
            <span className={`adAtt__thumb${isImage(f) && f.open ? " has-img" : ""}`}>
              {isImage(f) && f.open ? (
                // eslint-disable-next-line @next/next/no-img-element -- a signed, private link the optimiser cannot fetch
                <img src={f.open} alt={`${f.name}, sent for "${f.question}"`} loading="lazy" decoding="async" />
              ) : isImage(f) ? <ImageIcon aria-hidden="true" /> : <FileText aria-hidden="true" />}
              <span className="ad__pill ad__pill--brand adAtt__kind">{label(f)}</span>
            </span>
            <span className="adAtt__meta">
              <b title={f.name}>{f.name}</b>
              <small>{[size(f.bytes), f.question].filter(Boolean).join(" · ")}</small>
            </span>
            {f.open ? (
              <span className="adAtt__acts">
                <a className="ad__btn" href={f.open} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden="true" /> Open</a>
                <a className="ad__btn" href={f.download ?? f.open}><Download aria-hidden="true" /> Download</a>
              </span>
            ) : (
              <small className="adAtt__gone"><Paperclip aria-hidden="true" /> {f.missing
                ? "Sent before files were kept with briefs, so it cannot be opened here. Ask the client to send it again."
                : "The file store is not configured, so it cannot be opened here."}</small>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
