import "server-only";

import { FORMS, type FormDef } from "./registry";
import { listCustomForms, toFormDef } from "./custom";
import { cellText, listEntries, readFilters, type Entry, type Filters } from "./entries";

/**
 * EVERY FORM'S ENTRIES IN ONE LIST (the Entries card on /admin/forms).
 *
 * The newsletter is people, not entries, so it stays on its own page. Each
 * form is asked for its newest `page * per` rows and the lot is merged and
 * sliced, which is exact for any page and costs one query per form.
 * ponytail: the window is capped at MAX_WINDOW rows per form; past it, narrow
 * with the search or the dates. A UNION over the four tables replaces this
 * if the studio ever has tens of thousands of entries.
 */
export const MAX_WINDOW = 500;

export const COLUMNS = [
  { key: "form", label: "Form" },
  { key: "serial", label: "No." },
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "when", label: "Received" },
  { key: "client", label: "Client" },
  { key: "state", label: "State" },
] as const;
export type ColumnKey = (typeof COLUMNS)[number]["key"];
export const DEFAULT_COLUMNS: ColumnKey[] = ["form", "name", "email", "when", "client", "state"];

export function readColumns(v: string | string[] | undefined): ColumnKey[] {
  const raw = (Array.isArray(v) ? v.join(",") : v) ?? "";
  const picked = COLUMNS.map((c) => c.key).filter((k) => raw.split(",").includes(k));
  return picked.length ? picked : DEFAULT_COLUMNS;
}

export type Row = Entry & { form: FormDef };

export async function entryForms(): Promise<FormDef[]> {
  const built = (await listCustomForms().catch(() => [])).map(toFormDef);
  return [...FORMS, ...built].filter((f) => f.source !== "newsletter");
}

export async function listAll(
  sp: Record<string, string | string[] | undefined>,
  opts: { everything?: boolean } = {},
): Promise<{ rows: Row[]; total: number; filters: Filters; forms: FormDef[] }> {
  const forms = await entryForms();
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const only = one(sp.form);
  const chosen = only ? forms.filter((f) => f.key === only) : forms;
  /* Tab is whatever each form calls its default; the list is the received entries, drafts excluded. */
  const f = readFilters(chosen[0] ?? forms[0], { ...sp, tab: undefined }, undefined);
  const window = opts.everything ? 5_000 : Math.min(MAX_WINDOW, f.page * f.per);
  const parts = await Promise.all(chosen.map(async (form) => {
    const r = await listEntries(form, { ...f, tab: readFilters(form, {}).tab, page: 1, per: window });
    return { total: r.total, rows: r.rows.map((e) => ({ ...e, form })) };
  }));
  const total = parts.reduce((n, p) => n + p.total, 0);
  const merged = parts.flatMap((p) => p.rows).sort((a, b) =>
    f.sort === "name" ? a.name.localeCompare(b.name)
      : f.sort === "oldest" ? a.at.localeCompare(b.at) : b.at.localeCompare(a.at));
  const rows = opts.everything ? merged : merged.slice((f.page - 1) * f.per, f.page * f.per);
  return { rows, total, filters: f, forms };
}

export function cell(r: Row, key: ColumnKey): string {
  switch (key) {
    case "form": return r.form.title;
    case "state": return r.draft ? "Draft" : [r.read ? "Read" : "Unread", r.starred ? "Starred" : ""].filter(Boolean).join(", ");
    default: return cellText(r.form, r, key);
  }
}
