import "server-only";

import type { FormDef } from "@/lib/forms/registry";
import { getEntry } from "@/lib/forms/entries";
import { entryPdfInput, entryPdfName, renderEntryPdf } from "@/lib/forms/entry-pdf";
import { presignGet, r2Config } from "@/lib/r2";
import { escapeHtml } from "@/lib/email-templates";

type Attachment = { filename: string; content: Buffer; contentType: string };

/**
 * ATTACHMENTS FOR THE STUDIO'S NOTICE, like a form plugin's "PDF of the entry
 * plus the uploads": the entry as a PDF, then every file the client sent, in
 * order, while the total stays under 15 MB. A file that would push it over is
 * a link instead, signed for seven days (the most a signed link can last), so
 * the email always arrives; mail servers refuse large messages outright.
 *
 * Runs behind the response with the rest of the notice. Anything that fails
 * here leaves the email as it was, never unsent.
 */
export const MAIL_ATTACH_CAP = 15 * 1024 * 1024;
const WEEK = 7 * 24 * 3600;

const size = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export async function entryMailParts(form: FormDef, entryId: string): Promise<{ attachments: Attachment[]; linked: { name: string; bytes: number; url: string }[] } | null> {
  if (form.source === "newsletter" || !entryId) return null;
  const entry = await getEntry(form, entryId);
  if (!entry) return null;
  const input = await entryPdfInput(form, entry);
  const pdf = Buffer.from(await renderEntryPdf(input));
  const attachments: Attachment[] = [{ filename: entryPdfName(form, entry), content: pdf, contentType: "application/pdf" }];
  const linked: { name: string; bytes: number; url: string }[] = [];
  let total = pdf.length;
  const r2 = r2Config();
  for (const f of input.files) {
    if (!f.open) continue;
    if (total + f.bytes <= MAIL_ATTACH_CAP) {
      try {
        const res = await fetch(f.open, { signal: AbortSignal.timeout(20_000) });
        if (res.ok) {
          const content = Buffer.from(await res.arrayBuffer());
          if (total + content.length <= MAIL_ATTACH_CAP) {
            attachments.push({ filename: f.name, content, contentType: f.contentType });
            total += content.length;
            continue;
          }
        }
      } catch { /* falls through to a link */ }
    }
    if (r2.ok && f.key) linked.push({ name: f.name, bytes: f.bytes, url: presignGet({ config: r2.config, key: f.key, expiresIn: WEEK, download: f.name }) });
  }
  return { attachments, linked };
}

/** The notice with its parts: attachments added, links for the rest in both bodies. */
export function withEntryParts<T extends { text: string; html?: string; attachments?: unknown[] }>(mail: T, parts: NonNullable<Awaited<ReturnType<typeof entryMailParts>>>): T {
  const listed = parts.attachments.map((a) => a.filename);
  let text = `${mail.text}\n\nAttached: ${listed.join(", ")}.`;
  let html = mail.html;
  if (parts.linked.length) {
    text += `\nToo large to attach (links last 7 days):\n${parts.linked.map((l) => `- ${l.name} (${size(l.bytes)}): ${l.url}`).join("\n")}`;
    const block = `<p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#14142b;margin:16px auto;max-width:560px;padding:0 16px">`
      + `<b>Too large to attach</b> (links last 7 days):<br>`
      + parts.linked.map((l) => `<a href="${escapeHtml(l.url)}" style="color:#000065">${escapeHtml(l.name)}</a> (${size(l.bytes)})`).join("<br>")
      + `</p>`;
    html = html ? (html.includes("</body>") ? html.replace("</body>", `${block}</body>`) : html + block) : undefined;
  }
  return { ...mail, text, html, attachments: [...((mail.attachments as unknown[]) ?? []), ...parts.attachments] } as T;
}
