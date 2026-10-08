import { refusedEmail } from "./email-domains";

/**
 * READING A CONTACT FILE, WITHOUT TOUCHING A DATABASE.
 *
 * Pure on purpose: no server imports, so the same rules run in the import
 * route and in the spec that pins them (tests/contacts-import.spec.ts). The
 * route does the lookups (who is already a contact, who asked to stop, who
 * asked to be erased) and hands them in as plain sets; the verdict on each row
 * is made here and nowhere else, so the preview and the commit cannot disagree.
 *
 * THE BROWSER IS NEVER TRUSTED. The sheet only uploads the file; both steps
 * (check, then import) re-read it on the server.
 *
 * CSV only. An .xlsx is a zip of XML and the repo has a writer for one
 * (lib/xlsx.ts) but no reader; a package for it is not worth one button.
 * ponytail: CSV only; add an .xlsx reader (stored + deflate zip entries) if people ask.
 */

export const MAX_ROWS = 5000;
export const MAX_BYTES = 2 * 1024 * 1024;
export const MAX_TAGS_PER_ROW = 10;

export const SAMPLE_HEADER = ["email", "name", "phone", "tags", "marketing", "source"] as const;
export const SAMPLE_ROWS: string[][] = [
  ["ada@example.com", "Ada Obi", "+234 803 555 0142", "client;web", "yes", "Newsletter form"],
  ["kemi@example.com", "Kemi Bello", "", "lead", "no", "Contact page"],
  ["tunde@example.com", "Tunde A.", "+234 805 555 0111", "newsletter", "yes", "Event sign-up sheet"],
];

/** The sample file, with the BOM Excel needs to read it as UTF-8. No note rows: the header and three examples. */
export function sampleCsv(): string {
  const cell = (c: string) => (/[",\r\n]/.test(c) ? `"${c.replaceAll('"', '""')}"` : c);
  return `﻿${[SAMPLE_HEADER as readonly string[], ...SAMPLE_ROWS].map((r) => r.map(cell).join(",")).join("\r\n")}\r\n`;
}

/** The same loose shape check the newsletter uses (lib/newsletter.ts), kept here so this file stays pure. */
export function looksLikeEmail(value: string): boolean {
  if (value.length < 6 || value.length > 254) return false;
  if (/\s/.test(value)) return false;
  const at = value.indexOf("@");
  if (at < 1 || at !== value.lastIndexOf("@")) return false;
  const domain = value.slice(at + 1);
  if (domain.length < 4 || !domain.includes(".")) return false;
  if (domain.startsWith(".") || domain.endsWith(".") || domain.includes("..")) return false;
  return true;
}

/** A tag as the rest of the app writes it (lib/contacts.ts cleanTag): lower case, letters, digits, dashes. */
export const cleanTag = (t: string) => t.trim().toLowerCase().replace(/[^a-z0-9 _-]/g, "").replace(/\s+/g, "-").slice(0, 40);

/** Phone numbers match on their last ten digits, so +234 803 555 0142 and 0803 555 0142 are one person. */
export function phoneKey(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 7 ? digits.slice(-10) : "";
}

/**
 * CSV text to rows. Quotes, doubled quotes, CRLF, a BOM and commas or tabs as
 * the separator (a sheet saved from some Excel locales uses tabs). Blank lines
 * are dropped. Semicolons are NOT separators: they split tags inside a cell.
 */
export function parseCSV(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const firstLine = text.split(/\r\n|\r|\n/, 1)[0] ?? "";
  const sep = firstLine.includes(",") || !firstLine.includes("\t") ? "," : "\t";
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  const endRow = () => { row.push(cell); cell = ""; if (row.some((c) => c.trim())) rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; endRow(); }
    else cell += ch;
  }
  if (cell || row.length) endRow();
  return rows;
}

/** Our own exports guard a leading = + - @ with an apostrophe (lib/admin/csv.ts); reading the file back undoes it. */
const unguard = (c: string) => (/^'[=+\-@\t\r]/.test(c) ? c.slice(1) : c);

const HEADER_ALIASES: Record<string, string> = {
  "e-mail": "email", "email address": "email", "e-mail address": "email",
  tag: "tags", "phone number": "phone", mobile: "phone", whatsapp: "phone", "full name": "name",
  "asked to hear from us": "marketing", consent: "marketing",
};

export type ParsedRow = {
  /** The row's line in the file as a person counts it: the header is row 1. */
  n: number;
  email: string; name: string; phone: string; tags: string[]; source: string;
  /** null when the cell held something other than yes or no. */
  marketing: boolean | null;
};
export type Parsed = { error: string } | { rows: ParsedRow[] };

/** Size, header and shape checks, then one ParsedRow per data line. Lookups come later. */
export function parseImport(text: string, bytes = text.length): Parsed {
  if (bytes > MAX_BYTES) return { error: "That file is over 2 MB. Split it and import the parts one at a time." };
  const table = parseCSV(text);
  if (!table.length) return { error: "That file is empty." };
  const head = table[0].map((h) => { const k = h.trim().toLowerCase(); return HEADER_ALIASES[k] ?? k; });
  const col = (k: string) => head.indexOf(k);
  if (col("email") < 0) return { error: "The first row must have a column named email." };
  const body = table.slice(1);
  if (!body.length) return { error: "The file has no rows under the header." };
  if (body.length > MAX_ROWS) return { error: `That file has ${body.length.toLocaleString("en-GB")} rows. The limit is ${MAX_ROWS.toLocaleString("en-GB")} at a time.` };
  const get = (r: string[], k: string) => unguard((col(k) < 0 ? "" : r[col(k)] ?? "").trim());
  const rows = body.map((r, i): ParsedRow => {
    const mk = get(r, "marketing").toLowerCase();
    return {
      n: i + 2,
      email: get(r, "email").toLowerCase(),
      name: get(r, "name").slice(0, 120),
      phone: get(r, "phone").slice(0, 40),
      tags: [...new Set(get(r, "tags").split(";").map(cleanTag).filter(Boolean))].slice(0, MAX_TAGS_PER_ROW),
      source: get(r, "source").slice(0, 120),
      marketing: ["yes", "y", "true", "1"].includes(mk) ? true : ["", "no", "n", "false", "0"].includes(mk) ? false : null,
    };
  });
  return { rows };
}

/** What the route found out about the addresses and numbers in the file. */
export type Lookups = {
  /** Lower-case emails that asked to stop, bounced, complained, or asked to be erased. Never added back. */
  stopped: ReadonlySet<string>;
  /** Lower-case emails that are already contacts. */
  existing: ReadonlySet<string>;
  /** phoneKey -> the email of the contact who has that number. */
  phones: ReadonlyMap<string, string>;
};

export type Verdict = "new" | "update" | "refused";
export type Result = {
  n: number; email: string; name: string; phone: string; tags: string[]; source: string; marketing: boolean;
  verdict: Verdict; why: string;
  /** For an update found by phone: the existing contact's email. The file's own address is not stored. */
  matchedEmail?: string;
};

export function checkRows(rows: ParsedRow[], look: Lookups): Result[] {
  const firstSeen = new Map<string, number>();
  return rows.map((r): Result => {
    const out: Result = { n: r.n, email: r.email, name: r.name, phone: r.phone, tags: r.tags, source: r.source, marketing: r.marketing === true, verdict: "refused", why: "" };
    const refuse = (why: string) => { out.why = why; return out; };
    if (!looksLikeEmail(r.email)) return refuse(r.email ? "Not a valid email" : "No email on this row");
    if (refusedEmail(r.email)) return refuse("Temporary or anonymous inbox");
    const earlier = firstSeen.get(r.email);
    if (earlier !== undefined) return refuse(`Appears twice in the file (first on row ${earlier})`);
    firstSeen.set(r.email, r.n);
    if (look.stopped.has(r.email)) return refuse("Asked to stop, never added back");
    if (r.marketing === null) return refuse("marketing must be yes or no");
    if (r.marketing && !r.source) return refuse("Marketing yes needs a source (how they agreed)");
    if (look.existing.has(r.email)) { out.verdict = "update"; out.why = "Already a contact, will be updated"; return out; }
    const owner = r.phone ? look.phones.get(phoneKey(r.phone)) : undefined;
    if (owner) {
      /* One record per person: the same number is the same person. Their record is filled in; the file's
         address is not stored, and consent given for it is not carried to the other address. */
      out.verdict = "update"; out.matchedEmail = owner; out.marketing = false;
      out.why = "Same phone number as an existing contact, will be updated";
      return out;
    }
    out.verdict = "new";
    return out;
  });
}

export const countBy = (results: Result[], v: Verdict) => results.filter((r) => r.verdict === v).length;
