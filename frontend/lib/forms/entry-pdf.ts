import "server-only";

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import type { FormDef } from "@/lib/forms/registry";
import { answeredCount, type Entry } from "@/lib/forms/entries";
import { entryFiles, entrySections } from "@/lib/forms/entry-files";
import type { EntryFile } from "@/lib/onboarding-files";
import { SERVICES } from "@/lib/services";

/**
 * ONE ENTRY AS AN A4 PDF, the same file for the Download button and for the
 * studio's email (design: the Entries artifact).
 *
 * pdf-lib on the server, with our own Space Grotesk embedded (subset), so it
 * looks like us and nothing reaches a visitor's browser. Our mark sits faint
 * in the centre of every page as a watermark (assets/brand/watermark.png, made
 * by scripts/make-watermark.mjs from app/icon.svg). Page one opens on the navy
 * band; answers run in the order the client saw them; pictures they sent come
 * last, full width, each under the question it answered. Other files are
 * listed, not merged in.
 */

export const A4 = { w: 595.28, h: 841.89 };
export const M = 48;
export const INNER = A4.w - M * 2;
export const FOOT = 40;

const hex = (h: string) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
export const C = {
  navy: hex("#000065"), orange: hex("#ff6500"), accentInk: hex("#b84a00"),
  ink: hex("#14142b"), dim: hex("#55597a"), rule: hex("#d4d6e6"), onNavy: hex("#ffffff"), onNavyDim: hex("#c9cbe8"),
};

/* Read once per instance; the files ride along with the route via
   outputFileTracingIncludes in next.config.ts. */
let assets: { medium: Buffer; bold: Buffer; mark: Buffer; logo: Buffer } | null = null;
export function load() {
  if (assets) return assets;
  const at = (...p: string[]) => fs.readFileSync(path.join(process.cwd(), ...p));
  assets = {
    medium: at("assets", "fonts", "SpaceGrotesk-Medium.ttf"),
    bold: at("assets", "fonts", "SpaceGrotesk-Bold.ttf"),
    mark: at("assets", "brand", "watermark.png"),
    /* The full logo, white with its orange accent, for the navy band. */
    logo: at("assets", "brand", "pdf-logo.png"),
  };
  return assets;
}

const size = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : n > 0 ? `${Math.max(1, Math.round(n / 1024))} KB` : "");
const isPicture = (f: EntryFile) => /^image\/(jpeg|png|webp|gif|avif)$/.test(f.contentType);

/** Pictures worth fetching into the document: a handful, none enormous. */
const PICTURES = { count: 8, bytes: 8 * 1024 * 1024 };

export type PdfPicture = { file: EntryFile; jpeg: Uint8Array; width: number; height: number };

async function fetchPictures(files: EntryFile[]): Promise<PdfPicture[]> {
  const wanted = files.filter((f) => isPicture(f) && f.open && f.bytes <= PICTURES.bytes).slice(0, PICTURES.count);
  const out = await Promise.all(wanted.map(async (file): Promise<PdfPicture | null> => {
    try {
      const res = await fetch(file.open!, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return null;
      /* Flattened to a right-sized JPEG: any format they sent embeds, and a
         phone photo does not make the PDF 12 MB. */
      const { data, info } = await sharp(Buffer.from(await res.arrayBuffer()), { animated: false })
        .rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .flatten({ background: "#ffffff" }).jpeg({ quality: 80 }).toBuffer({ resolveWithObject: true });
      return { file, jpeg: data, width: info.width, height: info.height };
    } catch {
      return null;
    }
  }));
  return out.filter((x): x is PdfPicture => Boolean(x));
}

export type EntryPdfInput = {
  title: string;
  subtitle: string;
  facts: [string, string][];
  sections: { heading: string; rows: { q: string; a: string | null }[] }[];
  files: EntryFile[];
  pictures: PdfPicture[];
  /** The short name for the footer of later pages, "Brief #2 · Aha! Studios". */
  running: string;
};

const time = (iso: string) => {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" });
  const hm = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });
  return `${day} at ${hm}`;
};

/** What a brief is called, by service: "Website Onboarding Brief for …". */
const BRIEF_NAME: Record<string, string> = { web: "Website", apps: "App", software: "Software & AI", seo: "SEO", branding: "Branding" };

/** Everything the document says, from the entry. */
export async function entryPdfInput(form: FormDef, entry: Entry, opts: { pictures?: boolean } = {}): Promise<EntryPdfInput> {
  const files = await entryFiles(form, entry).catch(() => [] as EntryFile[]);
  const sections = await entrySections(form, entry);
  const company = form.source === "onboarding" ? String(entry.answers.company ?? "") : "";
  const who = company || entry.name || entry.email || "Not named";
  const number = entry.serial ? `${form.noun} #${entry.serial}` : form.noun;
  const service = form.service ? SERVICES.find((s) => s.slug === form.service)?.short : undefined;
  const briefName = form.service ? BRIEF_NAME[form.service] ?? service : undefined;
  const client = company || entry.name;
  const title = form.source === "onboarding" && briefName
    ? `${briefName} Onboarding Brief${client ? ` for ${client}` : ""}`
    : `${form.title}${entry.serial ? ` #${entry.serial}` : ""}`;
  const facts: [string, string][] = [];
  if (entry.name) facts.push(["Name", entry.name]);
  if (entry.email) facts.push(["Email", entry.email]);
  if (entry.phone) facts.push(["Phone", entry.phone]);
  if (company) facts.push(["Company", company]);
  if (form.service) facts.push(["Service", SERVICES.find((s) => s.slug === form.service)?.name ?? service ?? form.service]);
  if (form.source === "contact" && entry.topic) facts.push(["Topic", entry.topic]);
  if (form.source === "onboarding" && form.service) {
    const { answered, total } = answeredCount(form.service, entry.answers);
    facts.push(["Answered", `${answered} of ${total} questions`]);
  }
  if (form.source === "custom" && entry.version) facts.push(["Form version", String(entry.version)]);
  if (files.length) facts.push(["Files", `${files.length} (${size(files.reduce((a, f) => a + f.bytes, 0)) || "size not known"})`]);

  /* An answer that names a file says where it went. */
  const pictures = opts.pictures === false ? [] : await fetchPictures(files);
  const shown = new Set(pictures.map((p) => p.file.name));
  for (const s of sections) {
    for (const r of s.rows) {
      const mine = files.filter((f) => f.question === r.q);
      if (!mine.length) continue;
      r.a = mine.map((f) => `${f.name}${f.bytes ? ` (${size(f.bytes)})` : ""}${shown.has(f.name) ? ", shown at the end" : ""}`).join("\n");
    }
  }
  return {
    title,
    /* The title already names who it is for, when it is a brief. */
    subtitle: [entry.draft ? `Draft, last saved ${time(entry.at)}` : `Received ${time(entry.at)}`, form.source === "onboarding" && briefName ? "" : company || entry.name].filter(Boolean).join(" · "),
    facts, sections, files, pictures,
    running: `${number} · ${who}`,
  };
}

/* ---------- drawing ---------- */

/** Text the font can draw: anything it has no glyph for becomes "?". */
export function drawable(font: PDFFont, s: string) {
  const set = new Set(font.getCharacterSet());
  return Array.from(s.replace(/\r\n?/g, "\n").replace(/\t/g, "  "))
    .map((ch) => (ch === "\n" || set.has(ch.codePointAt(0)!) ? ch : ch.trim() ? "?" : " ")).join("");
}

export function wrap(font: PDFFont, text: string, sz: number, width: number): string[] {
  const out: string[] = [];
  for (const para of drawable(font, text).split("\n")) {
    const words = para.split(/ +/);
    let line = "";
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(next, sz) <= width) { line = next; continue; }
      if (line) out.push(line);
      /* One word wider than the column (a URL): broken by character. */
      let rest = w;
      while (font.widthOfTextAtSize(rest, sz) > width) {
        let n = rest.length;
        while (n > 1 && font.widthOfTextAtSize(rest.slice(0, n), sz) > width) n--;
        out.push(rest.slice(0, n));
        rest = rest.slice(n);
      }
      line = rest;
    }
    out.push(line);
  }
  return out;
}

export async function renderEntryPdf(input: EntryPdfInput): Promise<Uint8Array> {
  const a = load();
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(input.title);
  pdf.setSubject(input.subtitle);
  pdf.setAuthor("We Dig Creativity Solutions");
  pdf.setCreator("We Dig Creativity");
  const reg = await pdf.embedFont(a.medium, { subset: true });
  const bold = await pdf.embedFont(a.bold, { subset: true });
  const mark: PDFImage = await pdf.embedPng(a.mark);
  const logo: PDFImage = await pdf.embedPng(a.logo);

  let page = null as unknown as PDFPage;
  let y = 0;
  const newPage = () => {
    page = pdf.addPage([A4.w, A4.h]);
    /* The watermark first, so everything reads over it. */
    const s = 300;
    page.drawImage(mark, { x: (A4.w - s) / 2, y: (A4.h - s) / 2, width: s, height: s, opacity: 0.06 });
    y = A4.h - M;
  };
  const room = (h: number) => { if (y - h < M + FOOT) newPage(); };
  const text = (s: string, x: number, yy: number, font: PDFFont, sz: number, color = C.ink) =>
    page.drawText(drawable(font, s), { x, y: yy, size: sz, font, color });

  newPage();

  /* The band: the full logo, then the title (up to two lines) and when it came. */
  const titleLines = wrap(bold, input.title, 21, INNER).slice(0, 2);
  const logoH = 30;
  const logoW = (logo.width / logo.height) * logoH;
  const bandH = 40 + logoH + 22 + titleLines.length * 25 + 26;
  page.drawRectangle({ x: 0, y: A4.h - bandH, width: A4.w, height: bandH, color: C.navy });
  page.drawImage(logo, { x: M, y: A4.h - 36 - logoH, width: logoW, height: logoH });
  let ty = A4.h - 36 - logoH - 34;
  for (const l of titleLines) { text(l, M, ty, bold, 21, C.onNavy); ty -= 25; }
  text(wrap(reg, input.subtitle, 10, INNER)[0] ?? "", M, ty + 4, reg, 10, C.onNavyDim);
  y = A4.h - bandH - 28;

  /* A two-column row: label 36%, value the rest. */
  const LABEL = INNER * 0.36;
  const row = (q: string, v: string | null) => {
    const ql = wrap(bold, q, 9.5, LABEL - 12);
    const vl = v == null ? ["Not answered"] : wrap(reg, v, 10.5, INNER - LABEL);
    const lh = 14.5;
    const h = Math.max(ql.length, vl.length) * lh + 10;
    if (h > A4.h - M * 2 - FOOT) {
      /* An answer longer than a page: label once, then the lines as they fit. */
      room(lh * 3);
      text(ql[0], M, y - 11, bold, 9.5, C.dim);
      for (const l of vl) { room(lh); text(l, M + LABEL, y - 11, reg, 10.5, v == null ? C.dim : C.ink); y -= lh; }
      y -= 10;
    } else {
      room(h);
      ql.forEach((l, i) => text(l, M, y - 11 - i * lh, bold, 9.5, C.dim));
      vl.forEach((l, i) => text(l, M + LABEL, y - 11 - i * lh, reg, 10.5, v == null ? C.dim : C.ink));
      y -= h;
    }
    page.drawLine({ start: { x: M, y: y + 3 }, end: { x: A4.w - M, y: y + 3 }, thickness: 0.6, color: C.rule });
  };
  const heading = (s: string) => {
    room(60);
    y -= 14;
    text(s.toUpperCase(), M, y - 10, bold, 9.5, C.accentInk);
    y -= 18;
    page.drawLine({ start: { x: M, y }, end: { x: A4.w - M, y }, thickness: 1, color: C.accentInk });
    y -= 2;
  };

  for (const [k, v] of input.facts) row(k, v);
  for (const s of input.sections) {
    heading(s.heading);
    for (const r of s.rows) row(r.q, r.a);
  }

  if (input.pictures.length) {
    newPage();
    heading("Pictures they sent");
    for (const p of input.pictures) {
      const img = await pdf.embedJpg(p.jpeg);
      const maxH = A4.h - M * 2 - FOOT - 60;
      const scale = Math.min(INNER / p.width, maxH / p.height);
      const w = p.width * scale;
      const h = p.height * scale;
      room(h + 34);
      y -= 8;
      page.drawImage(img, { x: M + (INNER - w) / 2, y: y - h, width: w, height: h });
      y -= h + 14;
      text(wrap(reg, `${p.file.name} · ${p.file.question}`, 9, INNER)[0], M, y, reg, 9, C.dim);
      y -= 12;
    }
  }

  const others = input.files.filter((f) => !input.pictures.some((p) => p.file === f));
  if (others.length) {
    heading(input.pictures.length ? "Files they sent" : "Files they sent (not shown here)");
    for (const f of others) {
      row(f.name, [size(f.bytes), f.question, f.missing ? "sent before files were kept with briefs" : "in the admin, and with the studio's email"].filter(Boolean).join(" · "));
    }
  }

  /* Footers last, once the page count is known. */
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: M, y: M + 16 }, end: { x: A4.w - M, y: M + 16 }, thickness: 0.6, color: C.rule });
    const left = i === 0 ? "We Dig Creativity Solutions · wedigcreativity.com.ng" : input.running;
    p.drawText(drawable(reg, wrap(reg, left, 8.5, INNER - 90)[0] ?? ""), { x: M, y: M, size: 8.5, font: reg, color: C.dim });
    const right = `Page ${i + 1} of ${pages.length}`;
    p.drawText(right, { x: A4.w - M - reg.widthOfTextAtSize(right, 8.5), y: M, size: 8.5, font: reg, color: C.dim });
  });

  return pdf.save();
}

/** A download name: "website-onboarding-brief-moore-designs.pdf", or "enquiry-4-ada-eze.pdf". */
export function entryPdfName(form: FormDef, entry: Entry) {
  const who = (form.source === "onboarding" ? String(entry.answers.company ?? "") : "") || entry.name || "";
  const brief = form.source === "onboarding" && form.service ? `${BRIEF_NAME[form.service] ?? form.service} onboarding brief` : "";
  const slug = (brief ? [brief, who || (entry.serial ? String(entry.serial) : entry.id.slice(0, 8))] : [form.noun, entry.serial ? String(entry.serial) : entry.id.slice(0, 8), who]).join(" ")
    .toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
  return `${slug || "entry"}.pdf`;
}

export async function entryPdf(form: FormDef, entry: Entry) {
  return renderEntryPdf(await entryPdfInput(form, entry));
}
