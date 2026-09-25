/**
 * A FORM BUILT IN THE ADMIN (Forms, New form): its definition, and the rules
 * that check both the definition and the answers to it.
 *
 * Pure, no server imports: the builder, the public form and the route that
 * saves an entry all use it, so the browser's checks and the server's are the
 * same code and cannot disagree. The server runs them again regardless.
 */

import { DIAL_CODES } from "@/lib/dial-codes";

export const FIELD_TYPES = [
  { type: "text", label: "Short answer" },
  { type: "textarea", label: "Long answer" },
  { type: "email", label: "Email" },
  { type: "phone", label: "Phone" },
  { type: "number", label: "Number" },
  { type: "date", label: "Date" },
  { type: "url", label: "Website address" },
  { type: "country", label: "Country" },
  { type: "address", label: "Address" },
  { type: "select", label: "Dropdown" },
  { type: "radio", label: "One choice" },
  { type: "checkboxes", label: "Several choices" },
  { type: "consent", label: "Consent tick box" },
  { type: "file", label: "File upload" },
  { type: "heading", label: "Section heading" },
] as const;

export type FieldType = (typeof FIELD_TYPES)[number]["type"];

export type CustomField = {
  /** Stable within the form: the key its answers are stored under. */
  id: string;
  type: FieldType;
  label: string;
  help?: string;
  placeholder?: string;
  required?: boolean;
  /** Dropdown, one choice, several choices. */
  options?: string[];
  /** Number: the range allowed. */
  min?: number;
  max?: number;
  /** Shown only when another field has one of these answers. */
  showIf?: { field: string; equals: string[] };
};

export type CustomFormDef = {
  title: string;
  intro: string;
  submitLabel: string;
  successMessage: string;
  fields: CustomField[];
};

/* EVERY COUNTRY, by name, from the dialling list the phone field already
   ships and the platform's own names for the codes, so no second list can
   drift from the first. Nigeria first, because most people filling these in
   are here; everyone else in alphabetical order. */
const REGION = new Intl.DisplayNames(["en"], { type: "region" });
export const COUNTRIES: string[] = (() => {
  const names = [...new Set(DIAL_CODES.map((d) => { try { return REGION.of(d.iso) ?? ""; } catch { return ""; } }))]
    .filter((n) => n && n.length > 2 && n !== "Unknown Region")
    .sort((a, b) => a.localeCompare(b));
  return ["Nigeria", ...names.filter((n) => n !== "Nigeria")];
})();

/** An address answer's four parts, in the order they are stored. */
export const ADDRESS_PARTS = [
  { key: "street", label: "Street address", required: true },
  { key: "city", label: "City or town", required: true },
  { key: "state", label: "State or region", required: false },
  { key: "country", label: "Country", required: true },
] as const;

export const LIMITS = { fields: 60, options: 50, label: 160, help: 300, text: 2_000, long: 10_000, title: 120, intro: 1_000, files: 5 } as const;

export const FILE_MAX_BYTES = 15 * 1024 * 1024;
/** What a file field takes: documents and pictures, never anything that runs. */
export const FILE_TYPES: Readonly<Record<string, string>> = {
  pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp",
  doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain", csv: "text/csv", zip: "application/zip",
};

export type FileAnswer = { key: string; name: string; size: number };
export type Answer = string | string[] | FileAnswer[];
export type Answers = Record<string, Answer>;

export const slugify = (v: string) => v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);

export function blankForm(title = "Untitled form"): CustomFormDef {
  return {
    title, intro: "", submitLabel: "Send", successMessage: "Thank you. We have your answers and will be in touch.",
    fields: [
      { id: "name", type: "text", label: "Your name", required: true },
      { id: "email", type: "email", label: "Email", required: true },
    ],
  };
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max) : "");
const isType = (v: unknown): v is FieldType => FIELD_TYPES.some((f) => f.type === v);
const CHOICE: FieldType[] = ["select", "radio", "checkboxes"];

/** A definition from anywhere, rebuilt from what is allowed; nothing else survives. */
export function cleanDef(raw: unknown): { def: CustomFormDef; errors: string[] } {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const errors: string[] = [];
  const seen = new Set<string>();
  const fields: CustomField[] = [];
  for (const f of Array.isArray(o.fields) ? o.fields.slice(0, LIMITS.fields) : []) {
    const r = (f && typeof f === "object" ? f : {}) as Record<string, unknown>;
    if (!isType(r.type)) continue;
    let id = slugify(str(r.id, 48)).replace(/-/g, "_") || `field_${fields.length + 1}`;
    while (seen.has(id)) id = `${id}_2`;
    seen.add(id);
    const label = str(r.label, LIMITS.label);
    if (!label) errors.push(`Field ${fields.length + 1} needs a label.`);
    const field: CustomField = { id, type: r.type, label: label || "Untitled question" };
    const help = str(r.help, LIMITS.help); if (help) field.help = help;
    const ph = str(r.placeholder, LIMITS.label); if (ph && r.type !== "heading") field.placeholder = ph;
    if (r.required === true && r.type !== "heading") field.required = true;
    if (CHOICE.includes(r.type)) {
      const opts = [...new Set((Array.isArray(r.options) ? r.options : []).map((x) => str(x, LIMITS.label)).filter(Boolean))].slice(0, LIMITS.options);
      if (opts.length < 2) errors.push(`"${field.label}" needs at least two choices.`);
      field.options = opts;
    }
    if (r.type === "number") {
      const min = Number(r.min), max = Number(r.max);
      if (r.min !== undefined && r.min !== "" && Number.isFinite(min)) field.min = min;
      if (r.max !== undefined && r.max !== "" && Number.isFinite(max)) field.max = max;
    }
    const si = (r.showIf && typeof r.showIf === "object" ? r.showIf : null) as Record<string, unknown> | null;
    if (si) {
      const target = str(si.field, 48);
      const equals = (Array.isArray(si.equals) ? si.equals : []).map((x) => str(x, LIMITS.label)).filter(Boolean);
      if (target && equals.length) field.showIf = { field: target, equals };
    }
    fields.push(field);
  }
  /* A condition may only point at a choice question above it. */
  for (const [i, f] of fields.entries()) {
    if (!f.showIf) continue;
    const at = fields.findIndex((x) => x.id === f.showIf!.field);
    if (at < 0 || at >= i || !CHOICE.includes(fields[at].type)) { errors.push(`"${f.label}" is shown depending on a question that is not a choice above it.`); delete f.showIf; }
  }
  const def: CustomFormDef = {
    title: str(o.title, LIMITS.title) || "Untitled form",
    intro: str(o.intro, LIMITS.intro),
    submitLabel: str(o.submitLabel, 40) || "Send",
    successMessage: str(o.successMessage, 400) || "Thank you. We have your answers.",
    fields,
  };
  if (!fields.some((f) => f.type !== "heading")) errors.push("Add at least one question.");
  return { def, errors };
}

/** Whether a field is showing, given the answers so far. */
export function visible(field: CustomField, answers: Answers): boolean {
  if (!field.showIf) return true;
  const v = answers[field.showIf.field];
  const got = Array.isArray(v) ? (v as unknown[]).map(String) : typeof v === "string" ? [v] : [];
  return got.some((x) => field.showIf!.equals.includes(x));
}

const EMAIL = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[a-z]{2,}$/i;
const extOf = (name: string) => name.match(/\.([a-zA-Z0-9]{1,8})$/)?.[1]?.toLowerCase() ?? "";

/**
 * Every answer checked against its question: required, format, range, and
 * choices from the list. Hidden questions are dropped, not checked. Returns
 * the cleaned answers (what is stored) and an error per field id.
 */
export function checkAnswers(def: CustomFormDef, raw: unknown, fileKeyPrefix?: string): { answers: Answers; errors: Record<string, string> } {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const answers: Answers = {};
  const errors: Record<string, string> = {};
  for (const f of def.fields) {
    if (f.type === "heading") continue;
    if (!visible(f, answers)) continue;
    const v = input[f.id];
    const missing = () => { if (f.required) errors[f.id] = f.type === "consent" ? "Tick this to continue." : "This one is needed."; };
    switch (f.type) {
      case "checkboxes": {
        const picked = (Array.isArray(v) ? v : []).map((x) => str(x, LIMITS.label)).filter((x) => f.options?.includes(x));
        if (!picked.length) missing(); else answers[f.id] = [...new Set(picked)];
        break;
      }
      case "address": {
        /* Four parts, stored in order; street, city and country are needed
           when the question is required, and a country must be a real one. */
        const parts = ADDRESS_PARTS.map((p, i) => str(Array.isArray(v) ? v[i] : (v as Record<string, unknown> | undefined)?.[p.key], 200));
        if (!parts.some(Boolean)) { missing(); break; }
        const gap = ADDRESS_PARTS.find((p, i) => p.required && !parts[i]);
        if (gap) { errors[f.id] = `Add the ${gap.label.toLowerCase()}.`; break; }
        if (!COUNTRIES.includes(parts[3])) { errors[f.id] = "Pick the country from the list."; break; }
        answers[f.id] = parts;
        break;
      }
      case "consent": {
        if (v === true || v === "yes" || v === "on") answers[f.id] = "Yes"; else missing();
        break;
      }
      case "file": {
        const files = (Array.isArray(v) ? v : []).slice(0, LIMITS.files).flatMap((x) => {
          const r = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
          const key = str(r.key, 300), name = str(r.name, 200), size = Number(r.size);
          if (!key || !name || !FILE_TYPES[extOf(name)] || !(size > 0 && size <= FILE_MAX_BYTES)) return [];
          if (fileKeyPrefix && !key.startsWith(fileKeyPrefix)) return [];
          return [{ key, name, size }];
        });
        if (!files.length) missing(); else answers[f.id] = files;
        break;
      }
      default: {
        const s = str(v, f.type === "textarea" ? LIMITS.long : LIMITS.text);
        if (!s) { missing(); break; }
        if (f.type === "email" && !EMAIL.test(s)) { errors[f.id] = "Enter an email like name@example.com."; break; }
        if (f.type === "phone" && !/^[+()\d\s-]{7,20}$/.test(s)) { errors[f.id] = "Enter a phone number, digits only."; break; }
        if (f.type === "url" && !/^(https?:\/\/)?[^\s.]+\.[^\s]{2,}$/i.test(s)) { errors[f.id] = "Enter a website address, like example.com."; break; }
        if (f.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(s)) { errors[f.id] = "Pick a date."; break; }
        if (f.type === "number") {
          const n = Number(s);
          if (!Number.isFinite(n)) { errors[f.id] = "Enter a number."; break; }
          if (f.min !== undefined && n < f.min) { errors[f.id] = `At least ${f.min}.`; break; }
          if (f.max !== undefined && n > f.max) { errors[f.id] = `At most ${f.max}.`; break; }
        }
        if ((f.type === "select" || f.type === "radio") && !f.options?.includes(s)) { errors[f.id] = "Pick one of the choices."; break; }
        if (f.type === "country" && !COUNTRIES.includes(s)) { errors[f.id] = "Pick the country from the list."; break; }
        answers[f.id] = s;
      }
    }
  }
  return { answers, errors };
}

/** The answer as one line of text, for the table, the export and the email. */
export function answerText(a: Answer | undefined): string {
  if (a == null) return "";
  if (typeof a === "string") return a;
  if (a.length && typeof a[0] === "object") return (a as FileAnswer[]).map((f) => f.name).join(", ");
  return (a as string[]).filter(Boolean).join(", ");
}

/** The first answer that is an email address, and the first that reads as a name. */
export function whoFrom(def: CustomFormDef, answers: Answers) {
  const email = def.fields.find((f) => f.type === "email" && typeof answers[f.id] === "string");
  const name = def.fields.find((f) => f.type === "text" && /name/i.test(f.label) && typeof answers[f.id] === "string");
  const phone = def.fields.find((f) => f.type === "phone" && typeof answers[f.id] === "string");
  return {
    email: email ? String(answers[email.id]).toLowerCase() : "",
    name: name ? String(answers[name.id]) : "",
    phone: phone ? String(answers[phone.id]) : "",
  };
}
