import {
  composeEmailHtml, emailButton, emailColumns, emailDivider, emailFigure, emailHeading, emailImage, emailP,
  emailPanel, emailSmall, emailSpace, escapeHtml, type Email,
} from "@/lib/email-templates";

/**
 * AN EMAIL AS DATA, the way the builder holds it: a subject, a preheader, a
 * heading and an ordered list of blocks. It is drawn into the same shell every
 * studio email already uses (brand header, dark mode, Outlook-safe table
 * layout, unsubscribe footer), so a design can change what an email says and
 * how its parts are arranged, never break how it renders.
 *
 * PURE: no server imports, so the spec can run it. Everything a person typed is
 * escaped; merge tags are filled with escaped values, and a missing value uses
 * its fallback (`{{client.first_name | "there"}}`) or nothing.
 */
export type Block =
  | { id: string; type: "heading"; text: string }
  | { id: string; type: "text"; text: string }
  | { id: string; type: "button"; label: string; url: string }
  | { id: string; type: "facts"; rows: { label: string; value: string }[] }
  | { id: string; type: "figure"; label: string; value: string; note: string }
  | { id: string; type: "image"; src: string; alt: string; url: string }
  | { id: string; type: "columns"; left: string; right: string }
  | { id: string; type: "divider" }
  | { id: string; type: "space"; size: number }
  | { id: string; type: "note"; text: string }
  /** A block the system fills (invoice lines, a reset link): it can be moved or removed, never edited. */
  | { id: string; type: "system"; key: string };

export type Design = { subject: string; preheader: string; heading: string; blocks: Block[] };

export const BLOCK_LABEL: Record<Block["type"], string> = {
  heading: "Heading", text: "Text", button: "Button", facts: "Facts", figure: "Big figure", image: "Image",
  columns: "Two columns", divider: "Divider", space: "Space", note: "Small print", system: "System block",
};

export function newBlock(type: Block["type"], system?: string): Block {
  const id = Math.random().toString(36).slice(2, 10);
  switch (type) {
    case "heading": return { id, type, text: "A heading" };
    case "text": return { id, type, text: "Write here. Use {{client.first_name | \"there\"}} for a name." };
    case "button": return { id, type, label: "Open it", url: "https://" };
    case "facts": return { id, type, rows: [{ label: "Label", value: "Value" }] };
    case "figure": return { id, type, label: "Amount", value: "{{invoice.total}}", note: "" };
    case "image": return { id, type, src: "https://", alt: "", url: "" };
    case "columns": return { id, type, left: "Left column", right: "Right column" };
    case "divider": return { id, type };
    case "space": return { id, type, size: 16 };
    case "note": return { id, type, text: "Small print goes here." };
    case "system": return { id, type, key: system ?? "" };
  }
}

/* ------------------------------------------------------------- merge tags */

export type Vars = Record<string, string | undefined>;
const TAG = /\{\{\s*([a-z0-9_.]+)\s*(?:\|\s*"([^"]*)")?\s*\}\}/gi;

/** Fills tags with RAW values (the caller escapes) and records which were unknown. */
export function fillTags(text: string, vars: Vars, esc: (s: string) => string = (s) => s): string {
  return text.replace(TAG, (_m, key: string, fallback?: string) => {
    const v = vars[key.toLowerCase()];
    return esc(v && v.length ? v : fallback ?? "");
  });
}

/** Every tag a text uses, for the editor to warn about unknown ones. */
export function tagsIn(text: string): string[] {
  return [...text.matchAll(TAG)].map((m) => m[1].toLowerCase());
}

/**
 * Light inline markup for text blocks: **bold** and [label](https://url).
 * The text is escaped first and tags are filled with escaped values, so
 * nothing typed or merged can become markup.
 */
function inline(text: string, vars: Vars): string {
  let out = fillTags(text, vars, escapeHtml);
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_m, label: string, url: string) =>
    `<a class="wdc-link" href="${url}" style="color:#c95000;text-decoration:underline">${label}</a>`);
  return out.replace(/\n/g, "<br>");
}
const plain = (text: string, vars: Vars) =>
  fillTags(text, vars).replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1 ($2)");

/* --------------------------------------------------------------- the render */

export type System = Record<string, { html: string; text: string }>;

export function renderDesign(
  design: Design,
  vars: Vars,
  opts: { system?: System; unsubscribe?: boolean; why?: string; manage?: "client" | "staff" } = {},
): Email {
  const html: string[] = [];
  const text: string[] = [];
  for (const b of design.blocks) {
    switch (b.type) {
      case "heading": html.push(emailHeading(inline(b.text, vars))); text.push(plain(b.text, vars).toUpperCase()); break;
      case "text":
        for (const para of b.text.split(/\n{2,}/).filter(Boolean)) { html.push(emailP(inline(para, vars))); text.push(plain(para, vars)); }
        break;
      case "button": {
        const url = fillTags(b.url, vars);
        html.push(emailButton(fillTags(b.label, vars), url)); text.push(`${plain(b.label, vars)}: ${url}`);
        break;
      }
      case "facts": {
        const rows = b.rows.filter((r) => r.label || r.value).map((r) => [fillTags(r.label, vars), fillTags(r.value, vars)] as [string, string]);
        if (rows.length) { html.push(emailPanel(rows)); text.push(rows.map(([l, v]) => `${l}: ${v}`).join("\n")); }
        break;
      }
      case "figure": html.push(emailFigure(fillTags(b.value, vars), { label: fillTags(b.label, vars) || undefined, note: fillTags(b.note, vars) || undefined })); text.push(`${plain(b.label, vars)}: ${plain(b.value, vars)}`); break;
      case "image": if (/^https?:\/\//i.test(b.src) && b.src.length > 8) html.push(emailImage(b.src, fillTags(b.alt, vars), b.url ? fillTags(b.url, vars) : undefined)); break;
      case "columns": html.push(emailColumns(emailP(inline(b.left, vars)), emailP(inline(b.right, vars)))); text.push(plain(b.left, vars), plain(b.right, vars)); break;
      case "divider": html.push(emailDivider()); text.push("--"); break;
      case "space": html.push(emailSpace(b.size)); break;
      case "note": html.push(emailSmall(inline(b.text, vars))); text.push(plain(b.text, vars)); break;
      case "system": { const s = opts.system?.[b.key]; if (s) { html.push(s.html); text.push(s.text); } break; }
    }
  }
  const heading = fillTags(design.heading, vars);
  const subject = fillTags(design.subject, vars).replace(/[\r\n]+/g, " ").trim() || "A message from We Dig Creativity";
  return {
    subject,
    text: `${heading}\n\n${text.filter(Boolean).join("\n\n")}\n\nThe WDC team`,
    html: composeEmailHtml({
      title: heading || subject, preheader: fillTags(design.preheader, vars), heading,
      blocks: html, unsubscribe: opts.unsubscribe, why: opts.why, manage: opts.manage,
    }),
    unsubscribe: opts.unsubscribe,
  };
}

/** Whether the contrast of a button colour etc. is not a concern here: the shell fixes colours. */
export function validDesign(value: unknown): value is Design {
  if (!value || typeof value !== "object") return false;
  const d = value as Design;
  return typeof d.subject === "string" && typeof d.preheader === "string" && typeof d.heading === "string"
    && Array.isArray(d.blocks) && d.blocks.length <= 60
    && d.blocks.every((b) => b && typeof b.id === "string" && typeof b.type === "string" && b.type in BLOCK_LABEL);
}
