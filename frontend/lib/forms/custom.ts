import "server-only";

import { db } from "@/lib/db/pool";
import type { FormDef } from "./registry";
import { answerText, cleanDef, type Answers, type CustomFormDef } from "./custom-def";

/**
 * FORMS BUILT IN THE ADMIN, kept in the database beside the ones in code.
 *
 * A form has a DRAFT (what the builder edits) and PUBLISHED VERSIONS. Each
 * publish writes the definition as a new numbered version and never changes
 * an old one, so an entry keeps the exact questions it answered: a question
 * reworded or removed later does not rewrite what somebody said. Entries
 * share the admin's entries screens (lib/forms/entries.ts, source "custom").
 *
 * The tables make themselves on first use, like the admin's kept records
 * (lib/admin/persist.ts), so a deploy whose migration was not run by hand
 * still works.
 */

export type CustomFormRow = {
  key: string; slug: string; status: "draft" | "live" | "closed"; version: number;
  draft: CustomFormDef; published: CustomFormDef | null;
  createdBy: string; createdAt: string; updatedAt: string; publishedAt: string | null;
};

const configured = () => Boolean(process.env.DATABASE_URL || process.env.COCKROACHDB_URL);
const G = globalThis as typeof globalThis & { __wdcCustomForms?: Promise<void> };

export function ensureCustomForms(): Promise<void> {
  if (!configured()) return Promise.resolve();
  G.__wdcCustomForms ??= (async () => {
    await db.query(`CREATE TABLE IF NOT EXISTS custom_forms (
      key STRING PRIMARY KEY, slug STRING NOT NULL UNIQUE, status STRING NOT NULL DEFAULT 'draft',
      version INT8 NOT NULL DEFAULT 0, draft JSONB NOT NULL, published JSONB,
      created_by STRING NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), published_at TIMESTAMPTZ)`);
    await db.query(`CREATE TABLE IF NOT EXISTS custom_form_versions (
      form_key STRING NOT NULL, version INT8 NOT NULL, definition JSONB NOT NULL,
      published_by STRING NOT NULL DEFAULT '', published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (form_key, version))`);
    await db.query(`CREATE TABLE IF NOT EXISTS custom_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), form_key STRING NOT NULL, version INT8 NOT NULL,
      serial INT8, name STRING, email STRING, phone STRING, answers JSONB NOT NULL,
      read_at TIMESTAMPTZ, starred BOOL NOT NULL DEFAULT false, box STRING NOT NULL DEFAULT 'inbox', box_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    await db.query("CREATE INDEX IF NOT EXISTS custom_entries_form_idx ON custom_entries (form_key, created_at)");
    await db.query(`CREATE TABLE IF NOT EXISTS form_counters (form_key STRING PRIMARY KEY, last INT8 NOT NULL DEFAULT 0)`).catch(() => undefined);
  })().catch((e) => { G.__wdcCustomForms = undefined; throw e; });
  return G.__wdcCustomForms;
}

type Row = {
  key: string; slug: string; status: string; version: string; draft: unknown; published: unknown;
  created_by: string; created_at: Date; updated_at: Date; published_at: Date | null;
};
const toRow = (r: Row): CustomFormRow => ({
  key: r.key, slug: r.slug, status: (["draft", "live", "closed"].includes(r.status) ? r.status : "draft") as CustomFormRow["status"],
  version: Number(r.version), draft: cleanDef(r.draft).def, published: r.published ? cleanDef(r.published).def : null,
  createdBy: r.created_by, createdAt: new Date(r.created_at).toISOString(), updatedAt: new Date(r.updated_at).toISOString(),
  publishedAt: r.published_at ? new Date(r.published_at).toISOString() : null,
});

export async function listCustomForms(): Promise<CustomFormRow[]> {
  if (!configured()) return [];
  await ensureCustomForms();
  const r = await db.query<Row>("SELECT * FROM custom_forms ORDER BY created_at DESC LIMIT 200");
  return r.rows.map(toRow);
}

export async function getCustomForm(key: string): Promise<CustomFormRow | null> {
  if (!configured() || !/^form-[a-z0-9-]{1,48}$/.test(key)) return null;
  await ensureCustomForms();
  const r = await db.query<Row>("SELECT * FROM custom_forms WHERE key = $1", [key]);
  return r.rows[0] ? toRow(r.rows[0]) : null;
}

export async function customFormBySlug(slug: string): Promise<CustomFormRow | null> {
  if (!configured() || !/^[a-z0-9-]{1,48}$/.test(slug)) return null;
  await ensureCustomForms();
  const r = await db.query<Row>("SELECT * FROM custom_forms WHERE slug = $1", [slug]);
  return r.rows[0] ? toRow(r.rows[0]) : null;
}

/** The definition an entry answered: its own version, else the current one. */
export async function versionDef(key: string, version: number): Promise<CustomFormDef | null> {
  if (!configured()) return null;
  await ensureCustomForms();
  const r = await db.query<{ definition: unknown }>("SELECT definition FROM custom_form_versions WHERE form_key = $1 AND version = $2", [key, version]);
  return r.rows[0] ? cleanDef(r.rows[0].definition).def : null;
}

export async function createCustomForm(slug: string, def: CustomFormDef, by: string): Promise<CustomFormRow | "taken"> {
  await ensureCustomForms();
  const key = `form-${slug}`;
  try {
    await db.query("INSERT INTO custom_forms (key, slug, draft, created_by) VALUES ($1, $2, $3::JSONB, $4)", [key, slug, JSON.stringify(def), by]);
  } catch (e) {
    if (/duplicate|unique/i.test(e instanceof Error ? e.message : "")) return "taken";
    throw e;
  }
  return (await getCustomForm(key))!;
}

export async function saveCustomDraft(key: string, def: CustomFormDef) {
  await ensureCustomForms();
  await db.query("UPDATE custom_forms SET draft = $2::JSONB, updated_at = now() WHERE key = $1", [key, JSON.stringify(def)]);
}

/** Publish the draft as the next version. The old versions are never touched. */
export async function publishCustomForm(key: string, by: string): Promise<number | null> {
  await ensureCustomForms();
  const f = await getCustomForm(key);
  if (!f) return null;
  const version = f.version + 1;
  await db.query("INSERT INTO custom_form_versions (form_key, version, definition, published_by) VALUES ($1, $2, $3::JSONB, $4)", [key, version, JSON.stringify(f.draft), by]);
  await db.query("UPDATE custom_forms SET published = draft, version = $2, status = 'live', published_at = now(), updated_at = now() WHERE key = $1", [key, version]);
  return version;
}

export async function setCustomStatus(key: string, status: "live" | "closed") {
  await ensureCustomForms();
  await db.query("UPDATE custom_forms SET status = $2, updated_at = now() WHERE key = $1 AND version > 0", [key, status]);
}

/** A custom form as the entries screens see it: columns from its current questions. */
export function toFormDef(f: CustomFormRow): FormDef {
  const def = f.published ?? f.draft;
  const questions = def.fields.filter((x) => x.type !== "heading").map((x) => ({ key: `q:${x.id}`, label: x.label }));
  return {
    key: f.key, title: def.title, group: "custom", source: "custom",
    publicPath: `/f/${f.slug}`, publicLabel: `/f/${f.slug}`, noun: "Entry",
    columns: [{ key: "serial", label: "#" }, { key: "name", label: "Name" }, { key: "email", label: "Email" }, ...questions, { key: "when", label: "Received" }],
    defaultColumns: ["serial", "name", "email", ...questions.slice(0, 3).map((q) => q.key), "when"],
    inbox: true,
    custom: { slug: f.slug, status: f.status, version: f.version },
  };
}

/** An entry, stored with the version it answered, and numbered. */
export async function saveCustomEntry(key: string, version: number, answers: Answers, who: { name: string; email: string; phone: string }): Promise<{ id: string; serial: number | null }> {
  await ensureCustomForms();
  const r = await db.query<{ id: string }>(
    "INSERT INTO custom_entries (form_key, version, name, email, phone, answers) VALUES ($1, $2, $3, $4, $5, $6::JSONB) RETURNING id",
    [key, version, who.name || null, who.email || null, who.phone || null, JSON.stringify(answers)],
  );
  const id = r.rows[0].id;
  let serial: number | null = null;
  try {
    const s = await db.query<{ serial: string }>(`
      WITH n AS (
        INSERT INTO form_counters (form_key, last) VALUES ($1, 1)
        ON CONFLICT (form_key) DO UPDATE SET last = form_counters.last + 1
        RETURNING last
      )
      UPDATE custom_entries SET serial = n.last FROM n WHERE custom_entries.id = $2 AND custom_entries.serial IS NULL
      RETURNING custom_entries.serial`, [key, id]);
    serial = s.rows[0] ? Number(s.rows[0].serial) : null;
  } catch { /* A missing number is a gap, not a failed submission. */ }
  return { id, serial };
}

/** The answers as labelled lines, in the order the questions were asked. */
export function answerLines(def: CustomFormDef, answers: Answers): [string, string][] {
  return def.fields.filter((f) => f.type !== "heading" && answers[f.id] !== undefined).map((f) => [f.label, answerText(answers[f.id])]);
}
