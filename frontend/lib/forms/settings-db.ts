import "server-only";

import { db } from "@/lib/db/pool";
import type { FormDef } from "./registry";
import { defaultSettings, lagosToday, mergeSettings, type FormSettings } from "./settings";

const configured = () => Boolean(process.env.DATABASE_URL || process.env.COCKROACHDB_URL);

/**
 * A form's settings. The defaults when nothing was saved, and also when the
 * database cannot be read: a form that cannot load its settings keeps taking
 * entries rather than turning visitors away over a settings read.
 */
export async function getFormSettings(form: FormDef): Promise<FormSettings & { savedBy?: string; savedAt?: string }> {
  if (!configured()) return defaultSettings(form);
  try {
    const r = await db.query<{ settings: unknown; saved_by: string; saved_at: Date }>(
      "SELECT settings, saved_by, saved_at FROM form_settings WHERE form_key = $1", [form.key],
    );
    const row = r.rows[0];
    return row ? { ...mergeSettings(form, row.settings), savedBy: row.saved_by, savedAt: new Date(row.saved_at).toISOString() } : defaultSettings(form);
  } catch (error) {
    console.error("[forms] settings could not be read; using the defaults:", error instanceof Error ? error.message : error);
    return defaultSettings(form);
  }
}

export async function saveFormSettings(form: FormDef, settings: FormSettings, by: string) {
  await db.query(`
    INSERT INTO form_settings (form_key, settings, saved_by, saved_at) VALUES ($1, $2::JSONB, $3, now())
    ON CONFLICT (form_key) DO UPDATE SET settings = excluded.settings, saved_by = excluded.saved_by, saved_at = now()
  `, [form.key, JSON.stringify(settings), by]);
}

export async function resetFormSettings(form: FormDef) {
  await db.query("DELETE FROM form_settings WHERE form_key = $1", [form.key]);
}

/** Entries in the limit's period, counted the way the limit means them. */
async function countFor(form: FormDef, per: FormSettings["limitPer"]) {
  const since = per === "day" ? "date_trunc('day', now())" : per === "month" ? "date_trunc('month', now())" : null;
  if (form.source === "onboarding") {
    const r = await db.query<{ n: string }>(
      `SELECT count(*) AS n FROM onboarding_submissions WHERE service = $1 AND status = 'submitted' AND box <> 'spam'${since ? ` AND submitted_at >= ${since}` : ""}`,
      [form.service],
    );
    return Number(r.rows[0]?.n ?? 0);
  }
  const table = form.source === "contact" ? "contact_enquiries" : "newsletter_subscribers";
  const extra = form.source === "contact" ? " AND box <> 'spam'" : " AND unsubscribed_at IS NULL";
  const r = await db.query<{ n: string }>(`SELECT count(*) AS n FROM ${table} WHERE true${extra}${since ? ` AND created_at >= ${since}` : ""}`);
  return Number(r.rows[0]?.n ?? 0);
}

export type Availability = { open: true } | { open: false; reason: "closed" | "not-yet" | "ended" | "limit"; message: string };

/**
 * Whether the form takes an entry right now. Checked by the route that saves
 * the entry, not only by the page that draws the form, so a closed form
 * refuses a POST as well as a visit.
 */
export async function availability(form: FormDef, s?: FormSettings): Promise<Availability> {
  const settings = s ?? await getFormSettings(form);
  if (!settings.open) return { open: false, reason: "closed", message: settings.closedMessage };
  const today = lagosToday();
  if (settings.opensOn && today < settings.opensOn) return { open: false, reason: "not-yet", message: settings.closedMessage };
  if (settings.closesOn && today > settings.closesOn) return { open: false, reason: "ended", message: settings.closedMessage };
  if (settings.limit) {
    try {
      if ((await countFor(form, settings.limitPer)) >= settings.limit) return { open: false, reason: "limit", message: settings.limitMessage };
    } catch { /* A count that cannot be read does not close the form. */ }
  }
  return { open: true };
}
