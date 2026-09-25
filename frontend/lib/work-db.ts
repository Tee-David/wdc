import "server-only";

import { db } from "@/lib/db/pool";
import { CASE_STUDIES, type CaseStudy } from "./work";
import { kindOf, type CaseKind } from "./work-def";

/**
 * CASE STUDIES EDITED IN THE ADMIN, kept beside the ones written in code.
 *
 * The seventeen in lib/work.ts stay as they are and remain the starting
 * point. A row here is either a new case study, or the admin's version of one
 * from code (same slug), or a code one that has been hidden. Each row has a
 * DRAFT (what the editor saves) and a LIVE copy (what the site shows); saving
 * never changes the live copy, publishing copies the draft across.
 *
 * The site reads case studies synchronously in a dozen places, so, like the
 * settings (lib/settings/store.ts), memory is a cache of the table: every
 * page that shows work calls `hydrateCaseStudies()` first, which folds the
 * live rows into `CASE_STUDIES` in place and re-reads at most every 20
 * seconds. A database that does not answer leaves the code list untouched.
 */

export type CaseRow = {
  slug: string;
  draft: CaseStudy & { kind?: CaseKind };
  live: (CaseStudy & { kind?: CaseKind }) | null;
  hidden: boolean;
  fromCode: boolean;
  updatedAt: string;
  updatedBy: string;
  publishedAt: string | null;
};

const configured = () => Boolean(process.env.DATABASE_URL || process.env.COCKROACHDB_URL);
/* The code list as it shipped, before any row was folded in. */
const BASE: CaseStudy[] = CASE_STUDIES.map((c) => ({ ...c }));
const BASE_SLUGS = new Set(BASE.map((c) => c.slug));

declare global {
  var __wdcCasesTable: Promise<void> | undefined;
  var __wdcCasesLoaded: Promise<void> | undefined;
  var __wdcCasesAt: number | undefined;
}

function ensureTable(): Promise<void> {
  globalThis.__wdcCasesTable ??= db.query(`CREATE TABLE IF NOT EXISTS case_studies (
    slug STRING PRIMARY KEY, draft JSONB NOT NULL, live JSONB, hidden BOOL NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_by STRING NOT NULL DEFAULT '',
    published_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`)
    .then(() => undefined)
    .catch((e) => { globalThis.__wdcCasesTable = undefined; throw e; });
  return globalThis.__wdcCasesTable;
}

type Raw = { slug: string; draft: CaseRow["draft"]; live: CaseRow["live"]; hidden: boolean; updated_at: Date; updated_by: string; published_at: Date | null; created_at: Date };
const toRow = (r: Raw): CaseRow => ({
  slug: r.slug, draft: r.draft, live: r.live, hidden: r.hidden, fromCode: BASE_SLUGS.has(r.slug),
  updatedAt: new Date(r.updated_at).toISOString(), updatedBy: r.updated_by,
  publishedAt: r.published_at ? new Date(r.published_at).toISOString() : null,
});

const FRESH_MS = 20_000;

/** Fold the live rows into CASE_STUDIES. Never throws. */
export function hydrateCaseStudies(force = false): Promise<void> {
  if (!configured()) return Promise.resolve();
  if (!force && globalThis.__wdcCasesLoaded && Date.now() - (globalThis.__wdcCasesAt ?? 0) < FRESH_MS) return globalThis.__wdcCasesLoaded;
  globalThis.__wdcCasesAt = Date.now();
  globalThis.__wdcCasesLoaded = (async () => {
    try {
      await ensureTable();
      const r = await db.query<Raw>("SELECT * FROM case_studies ORDER BY created_at DESC");
      const rows = r.rows.map(toRow);
      const byslug = new Map(rows.map((x) => [x.slug, x]));
      /* New ones first, newest first; then the code list with any admin
         version swapped in and hidden ones left out. */
      const fresh = rows.filter((x) => !x.fromCode && x.live && !x.hidden).map((x) => x.live!);
      const kept = BASE.flatMap((c) => {
        const row = byslug.get(c.slug);
        if (row?.hidden) return [];
        return [row?.live ?? c];
      });
      CASE_STUDIES.splice(0, CASE_STUDIES.length, ...fresh, ...kept);
    } catch (error) {
      console.error("[case-studies] could not load; showing the list from code.", error);
    }
  })();
  return globalThis.__wdcCasesLoaded;
}

/** Every case study the admin can edit: the code list and the table, as one. */
export async function adminCaseList(): Promise<{ slug: string; data: CaseStudy; kind: CaseKind; state: "live" | "draft" | "hidden" | "changed"; fromCode: boolean; updatedAt: string | null; updatedBy: string }[]> {
  let rows: CaseRow[] = [];
  if (configured()) {
    await ensureTable();
    rows = (await db.query<Raw>("SELECT * FROM case_studies ORDER BY created_at DESC")).rows.map(toRow);
  }
  const byslug = new Map(rows.map((x) => [x.slug, x]));
  const fresh = rows.filter((x) => !x.fromCode).map((x) => ({
    slug: x.slug, data: x.draft, kind: x.draft.kind ?? kindOf(x.draft), fromCode: false,
    state: (x.hidden ? "hidden" : !x.live ? "draft" : JSON.stringify(x.live) !== JSON.stringify(x.draft) ? "changed" : "live") as "live" | "draft" | "hidden" | "changed",
    updatedAt: x.updatedAt, updatedBy: x.updatedBy,
  }));
  const code = BASE.map((c) => {
    const x = byslug.get(c.slug);
    const data = x?.draft ?? c;
    return {
      slug: c.slug, data, kind: (data as { kind?: CaseKind }).kind ?? kindOf(data), fromCode: true,
      state: (x?.hidden ? "hidden" : x && JSON.stringify(x.live ?? c) !== JSON.stringify(x.draft) ? "changed" : "live") as "live" | "draft" | "hidden" | "changed",
      updatedAt: x?.updatedAt ?? null, updatedBy: x?.updatedBy ?? "",
    };
  });
  return [...fresh, ...code];
}

/** One case study for the editor: its draft, or the code version untouched. */
export async function caseForEditor(slug: string): Promise<{ data: CaseStudy & { kind?: CaseKind }; row: CaseRow | null; fromCode: boolean } | null> {
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) return null;
  const base = BASE.find((c) => c.slug === slug) ?? null;
  let row: CaseRow | null = null;
  if (configured()) {
    await ensureTable();
    const r = await db.query<Raw>("SELECT * FROM case_studies WHERE slug = $1", [slug]);
    row = r.rows[0] ? toRow(r.rows[0]) : null;
  }
  if (!row && !base) return null;
  return { data: row?.draft ?? base!, row, fromCode: Boolean(base) };
}

export const slugTaken = async (slug: string) =>
  BASE_SLUGS.has(slug) || (configured() && Boolean((await ensureTable().then(() => db.query("SELECT 1 FROM case_studies WHERE slug = $1", [slug]))).rowCount));

/** Save the draft; the live copy is untouched until `publish`. */
export async function saveCaseDraft(slug: string, data: CaseStudy & { kind: CaseKind }, by: string) {
  await ensureTable();
  await db.query(`INSERT INTO case_studies (slug, draft, updated_by) VALUES ($1, $2::JSONB, $3)
    ON CONFLICT (slug) DO UPDATE SET draft = excluded.draft, updated_at = now(), updated_by = excluded.updated_by`,
  [slug, JSON.stringify(data), by]);
}

export async function publishCase(slug: string, by: string) {
  await ensureTable();
  await db.query("UPDATE case_studies SET live = draft, hidden = false, published_at = now(), updated_at = now(), updated_by = $2 WHERE slug = $1", [slug, by]);
  await hydrateCaseStudies(true);
}

/** Take it off the site without deleting what was written. */
export async function setCaseHidden(slug: string, hidden: boolean, by: string) {
  await ensureTable();
  const base = BASE.find((c) => c.slug === slug);
  await db.query(`INSERT INTO case_studies (slug, draft, live, hidden, updated_by) VALUES ($1, $2::JSONB, $2::JSONB, $3, $4)
    ON CONFLICT (slug) DO UPDATE SET hidden = excluded.hidden, updated_at = now(), updated_by = excluded.updated_by`,
  [slug, JSON.stringify(base ?? {}), hidden, by]);
  await hydrateCaseStudies(true);
}
