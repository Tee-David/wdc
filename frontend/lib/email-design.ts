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
export type When = { key: string; is: "filled" | "empty" };
/** Every block may carry a `when`: it is left out of the email for anyone it does not fit (tags arrive as `tag.<name>`). */
export type Block = { when?: When } & (
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
  | { id: string; type: "system"; key: string }
);

export type Design = { subject: string; preheader: string; heading: string; blocks: Block[] };

export const BLOCK_LABEL: Record<Block["type"], string> = {
  heading: "Heading", text: "Text", button: "Button", facts: "Facts", figure: "Big figure", image: "Image",
  columns: "Two columns", divider: "Divider", space: "Space", note: "Small print", system: "System block",
};

export const blockId = () => Math.random().toString(36).slice(2, 10);

export function newBlock(type: Block["type"], system?: string): Block {
  const id = blockId();
  switch (type) {
    case "heading": return { id, type, text: "A heading" };
    case "text": return { id, type, text: "<p>Write here. Use {{client.first_name | \"there\"}} for a name.</p>" };
    case "button": return { id, type, label: "Open it", url: "https://" };
    case "facts": return { id, type, rows: [{ label: "Label", value: "Value" }] };
    case "figure": return { id, type, label: "Amount", value: "{{invoice.total}}", note: "" };
    case "image": return { id, type, src: "https://", alt: "", url: "" };
    case "columns": return { id, type, left: "<p>Left column</p>", right: "<p>Right column</p>" };
    case "divider": return { id, type };
    case "space": return { id, type, size: 16 };
    case "note": return { id, type, text: "<p>Small print goes here.</p>" };
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

/** Every use of a tag with the fallback it carries, if any (the editor checks that tags have one). */
export function tagUses(text: string): { key: string; fallback?: string }[] {
  return [...text.matchAll(TAG)].map((m) => ({ key: m[1].toLowerCase(), fallback: m[2] }));
}

/** A tag written the way it is stored: `{{key}}` or `{{key | "fallback"}}`. Quotes cannot be in a fallback. */
export function tagText(key: string, fallback = ""): string {
  const fb = fallback.replace(/["\r\n]/g, "");
  return fb ? `{{${key} | "${fb}"}}` : `{{${key}}}`;
}

/** Text split into plain pieces and tags, in order. */
export function splitTags(text: string): (string | { key: string; fallback: string })[] {
  const out: (string | { key: string; fallback: string })[] = [];
  let last = 0;
  for (const m of text.matchAll(TAG)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push({ key: m[1].toLowerCase(), fallback: m[2] ?? "" });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Like fillTags, but the text AROUND the tags is escaped too: nothing typed can become markup. */
function fillEscaped(text: string, vars: Vars): string {
  return splitTags(text).map((p) => {
    if (typeof p === "string") return escapeHtml(p);
    const v = vars[p.key];
    return escapeHtml(v && v.length ? v : p.fallback);
  }).join("");
}

/**
 * Light inline markup for text blocks: **bold** and [label](https://url).
 * Everything is escaped, the text around tags and the values that fill them,
 * so nothing typed or merged can become markup.
 */
function inline(text: string, vars: Vars): string {
  let out = fillEscaped(text, vars);
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_m, label: string, url: string) =>
    `<a class="wdc-link" href="${url}" style="color:#c95000;text-decoration:underline">${label}</a>`);
  return out.replace(/\n/g, "<br>");
}
const plain = (text: string, vars: Vars) =>
  fillTags(text, vars).replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1 ($2)");

/* ------------------------------------------------- rich text (the editor's) */

/**
 * THE SAFE SUBSET the builder's text editor writes: p, br, strong/b, em/i, u,
 * ul, ol, li, blockquote, h2 and a (https or mailto only), plus a text-align
 * on p and h2. Merge tags stay in the stored string as `{{key | "fallback"}}`.
 * Older designs hold the light markdown instead (see `inline`); a text that
 * starts with a block tag is the new kind, anything else is the old kind.
 */
export const isRichHtml = (text: string) => /^\s*<(p|h2|ul|ol|blockquote)[\s>/]/i.test(text);

/** The old markdown-ish text as the editor's HTML, so opening an old design loses nothing. */
export function mdToHtml(text: string): string {
  const paras = text.split(/\n{2,}/).filter((p) => p.trim());
  const one = (para: string) => {
    let out = escapeHtml(para);
    out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
    return `<p>${out.replace(/\n/g, "<br>")}</p>`;
  };
  return paras.length ? paras.map(one).join("") : "<p></p>";
}

const ENTITY: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function decode(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const n = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return n > 31 && n < 0x110000 ? String.fromCodePoint(n) : "";
    }
    return ENTITY[e.toLowerCase()] ?? m;
  });
}

const DISPLAY_FONT = "'Space Grotesk','Segoe UI',Helvetica,Arial,sans-serif";
const BODY_FONT = "'Outfit','Segoe UI',Helvetica,Arial,sans-serif";
const INK = "#0e0e2c";
const MUTED = "#666680";
const LINK_INK = "#c95000";
/** Tags whose contents are dropped with them, not kept as text. */
const DROP_WHOLE = /^(script|style|iframe|object|embed|noscript|template|textarea|title|svg|math|head)$/i;
const TOKEN = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
const BLOCKS = new Set(["p", "h2", "ul", "ol", "li", "blockquote"]);
const ALIAS: Record<string, string> = { b: "strong", i: "em", h1: "h2", h3: "h2", h4: "h2", h5: "h2", h6: "h2" };

type Open = { tag: string; skip?: boolean; htmlAt: number; textAt: number; filled: boolean; url?: string; list?: { ordered: boolean; n: number } };

/**
 * Allow-list a piece of editor HTML into email-safe HTML AND its plain-text
 * twin, filling merge tags on the way. PURE and DOM-free (it runs on the
 * server): a small tokenizer, not a regex over the whole string. Anything not
 * on the list is dropped with its attributes; its text stays, escaped. Script
 * style and friends are dropped with their contents. A link survives only if
 * what it points at, AFTER tags are filled, is https: or mailto:.
 */
export function sanitizeEmailHtml(input: string, vars: Vars, opts: { small?: boolean } = {}): { html: string; text: string } {
  let html = "";
  let text = "";
  const stack: Open[] = [];
  const nl = (n: number) => {
    if (!text) return;
    const have = text.length - text.replace(/\n+$/, "").length;
    if (have < n) text += "\n".repeat(n - have);
  };
  const inside = (t: string) => stack.some((o) => o.tag === t);
  const size = opts.small ? "13px" : "16px";
  const lh = opts.small ? "1.6" : "1.65";
  const ink = opts.small ? MUTED : INK;
  const cls = opts.small ? "wdc-muted" : "wdc-ink";
  const face = `font-family:${BODY_FONT};font-size:${size};line-height:${lh};color:${ink}`;
  const mark = () => { for (const o of stack) o.filled = true; };

  const open = (tag: string, attrs: string) => {
    if (stack.length >= 12) return;
    const e: Open = { tag, htmlAt: html.length, textAt: text.length, filled: false };
    const align = /text-align\s*:\s*(left|center|right)/i.exec(attrs)?.[1]?.toLowerCase();
    const al = align ? `;text-align:${align}` : "";
    switch (tag) {
      case "p": html += `<p class="${cls}" style="margin:${inside("li") || inside("blockquote") ? "0" : "0 0 16px"};${face}${al}">`; break;
      case "h2": html += `<h2 class="wdc-ink" style="margin:0 0 12px;font-family:${DISPLAY_FONT};font-size:22px;line-height:1.3;font-weight:700;color:${INK}${al}">`; break;
      case "ul": case "ol":
        html += `<${tag} class="${cls}" style="margin:0 0 16px;padding-left:22px;${face}">`;
        e.list = { ordered: tag === "ol", n: 0 };
        break;
      case "li": {
        html += `<li class="${cls}" style="margin:0 0 6px;${face}">`;
        const l = [...stack].reverse().find((o) => o.list)?.list;
        nl(1);
        text += `${"  ".repeat(Math.max(0, stack.filter((o) => o.list).length - 1))}${l?.ordered ? `${++l.n}. ` : "- "}`;
        break;
      }
      case "blockquote": html += `<blockquote class="wdc-ink" style="margin:0 0 16px;padding:4px 0 4px 14px;border-left:3px solid #ff6500;font-style:italic;${face}">`; break;
      case "strong": case "em": case "u": html += `<${tag}>`; break;
      case "a": {
        const raw = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
        const url = fillTags(decode(raw?.[1] ?? raw?.[2] ?? raw?.[3] ?? ""), vars).trim();
        if (/^(https:\/\/|mailto:)[^\s<>"'`\\\u0000-\u001f]+$/i.test(url)) { html += `<a class="wdc-link" href="${escapeHtml(url)}" style="color:${LINK_INK};text-decoration:underline">`; e.url = url; }
        else e.skip = true;
        break;
      }
    }
    stack.push(e);
  };
  const close = (e: Open) => {
    const empty = !e.filled && ["p", "h2", "li", "blockquote", "ul", "ol"].includes(e.tag);
    if (e.skip) return;
    if (empty) { html = html.slice(0, e.htmlAt); text = text.slice(0, e.textAt); return; }
    switch (e.tag) {
      case "p": html += "</p>"; nl(inside("li") ? 1 : 2); break;
      case "h2": html += "</h2>"; text = text.slice(0, e.textAt) + text.slice(e.textAt).toUpperCase(); nl(2); break;
      case "li": html += "</li>"; nl(1); break;
      case "ul": case "ol": html += `</${e.tag}>`; nl(stack.some((o) => o.list) ? 1 : 2); break;
      case "blockquote": {
        html += "</blockquote>";
        text = text.slice(0, e.textAt) + text.slice(e.textAt).trim().split("\n").map((l) => (l ? `> ${l}` : l)).join("\n");
        nl(2); break;
      }
      case "strong": case "em": case "u": html += `</${e.tag}>`; break;
      case "a": {
        html += "</a>";
        const label = text.slice(e.textAt).trim();
        if (e.url && label !== e.url && label !== e.url.replace(/^mailto:/i, "")) text += ` (${e.url})`;
        break;
      }
    }
  };
  const shut = (tag: string) => {
    const at = stack.map((o) => o.tag).lastIndexOf(tag);
    if (at < 0) return;
    while (stack.length > at) { const e = stack.pop()!; close(e); }
  };
  /* Words need a paragraph (or list item) to live in. */
  const room = () => {
    const top = stack.at(-1)?.tag;
    if (!top) open("p", "");
    else if (top === "ul" || top === "ol") open("li", "");
    else if (top === "blockquote") open("p", "");
  };
  const words = (raw: string) => {
    const t = decode(raw).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
    if (!t.trim() && !stack.some((o) => o.tag === "p" || o.tag === "h2" || o.tag === "li")) return;
    if (!t) return;
    room();
    for (const part of splitTags(t)) {
      if (typeof part === "string") {
        html += escapeHtml(part);
        text += part.replace(/\u00a0/g, " ").replace(/\s*\n\s*/g, " ");
        if (part.trim()) mark();
      } else {
        const v = vars[part.key];
        const val = v && v.length ? v : part.fallback;
        html += escapeHtml(val).replace(/\r?\n/g, "<br>");
        text += val;
        if (val.trim()) mark();
      }
    }
  };

  let last = 0;
  TOKEN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN.exec(input))) {
    if (m.index > last) words(input.slice(last, m.index));
    last = TOKEN.lastIndex;
    if (!m[2]) continue; // a comment
    const closing = m[1] === "/";
    let tag = m[2].toLowerCase();
    if (DROP_WHOLE.test(tag)) {
      if (!closing) {
        const end = new RegExp(`</${tag}\\s*>`, "i").exec(input.slice(last));
        last = end ? last + end.index + end[0].length : input.length;
        TOKEN.lastIndex = last;
      }
      continue;
    }
    tag = ALIAS[tag] ?? tag;
    if (tag === "br") {
      if (!closing) { room(); html += "<br>"; text += "\n"; mark(); }
      continue;
    }
    if (!BLOCKS.has(tag) && !["strong", "em", "u", "a"].includes(tag)) continue;
    if (closing) { shut(tag); continue; }
    if (BLOCKS.has(tag)) {
      /* A block can't sit inside a paragraph or heading: finish that one first. */
      while (["p", "h2"].includes(stack.at(-1)?.tag ?? "") && tag !== "li") close(stack.pop()!);
      if (tag === "li" && !["ul", "ol"].includes(stack.at(-1)?.tag ?? "")) tag = "p";
      if (tag === "li") while (stack.at(-1)?.tag === "li") close(stack.pop()!);
    } else room();
    open(tag, m[3]);
  }
  if (last < input.length) words(input.slice(last));
  while (stack.length) close(stack.pop()!);
  return { html, text: text.trim() };
}

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
    if (b.when && Boolean((vars[b.when.key.toLowerCase()] ?? "").trim()) !== (b.when.is === "filled")) continue;
    switch (b.type) {
      case "heading": html.push(emailHeading(inline(b.text, vars))); text.push(plain(b.text, vars).toUpperCase()); break;
      case "text":
        if (isRichHtml(b.text)) { const r = sanitizeEmailHtml(b.text, vars); if (r.html) html.push(r.html); if (r.text) text.push(r.text); break; }
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
      case "columns": {
        const side = (t: string) => (isRichHtml(t) ? sanitizeEmailHtml(t, vars) : { html: emailP(inline(t, vars)), text: plain(t, vars) });
        const l = side(b.left), r = side(b.right);
        html.push(emailColumns(l.html, r.html)); text.push(l.text, r.text);
        break;
      }
      case "divider": html.push(emailDivider()); text.push("--"); break;
      case "space": html.push(emailSpace(b.size)); break;
      case "note":
        if (isRichHtml(b.text)) { const r = sanitizeEmailHtml(b.text, vars, { small: true }); if (r.html) html.push(r.html); if (r.text) text.push(r.text); break; }
        html.push(emailSmall(inline(b.text, vars))); text.push(plain(b.text, vars));
        break;
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
    && d.blocks.every((b) => b && typeof b.id === "string" && typeof b.type === "string" && b.type in BLOCK_LABEL
      && (b.when === undefined || (typeof b.when.key === "string" && b.when.key.length <= 60 && (b.when.is === "filled" || b.when.is === "empty"))));
}
