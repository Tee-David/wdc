"use server";

import { revalidatePath } from "next/cache";
import * as db from "@/lib/admin/store";
import { allow, actorName } from "@/lib/admin/guard";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import { FAIL, OK, looksEmail, type ActionState } from "@/lib/admin/validate";
import { refusedEmail } from "@/lib/email-domains";
import { SERVICES, type ServiceSlug } from "@/lib/services";

/**
 * Add clients from a spreadsheet. The browser reads the file and sends rows;
 * every row is checked again here, one at a time, exactly as the New client
 * sheet checks one: a company, a contact and a usable email are required, a
 * temporary inbox is refused, and a row that matches an existing client (or an
 * earlier row) by email or phone is skipped, so nobody gets a second record.
 * Nothing is half applied: each row either lands or is counted as skipped.
 * At most 300 rows a time.
 */
type Row = { company?: unknown; name?: unknown; email?: unknown; phone?: unknown; sector?: unknown; services?: unknown };
const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

export async function importClients(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await allow("clients");
  if (refused) return refused;
  let rows: Row[];
  try { rows = JSON.parse(String(fd.get("rows") ?? "[]")); } catch { return FAIL({}, "That file could not be read. Save it as CSV and try again."); }
  if (!Array.isArray(rows) || !rows.length) return FAIL({}, "The file has no rows to add.");
  if (rows.length > 300) return FAIL({}, "Add up to 300 clients at a time. Split the file and import it in parts.");
  const actor = await actorName();
  let added = 0, dupes = 0;
  const bad: string[] = [];
  rows.forEach((raw, i) => {
    const company = text(raw?.company, 120), name = text(raw?.name, 120) || company, email = text(raw?.email, 200).toLowerCase(), phone = text(raw?.phone, 40);
    if (!company || !looksEmail(email) || refusedEmail(email)) { bad.push(`row ${i + 2}`); return; }
    if (db.findDuplicateClient(email, phone)) { dupes += 1; return; }
    const wanted = text(raw?.services, 200).toLowerCase().split(/[;,|]/).map((s) => s.trim()).filter(Boolean);
    const services = SERVICES.filter((s) => wanted.includes(s.slug) || wanted.includes(s.short.toLowerCase()) || wanted.includes(s.name.toLowerCase())).map((s) => s.slug as ServiceSlug);
    db.addClient({ company, name, email, phone, services, sector: text(raw?.sector, 80), tags: [], contacts: [] }, actor);
    added += 1;
  });
  revalidatePath("/admin/clients");
  const parts = [`${added} added`, dupes ? `${dupes} already clients` : "", bad.length ? `${bad.length} skipped without a company or a usable email (${bad.slice(0, 5).join(", ")}${bad.length > 5 ? " and more" : ""})` : ""].filter(Boolean);
  if (!added) return FAIL({}, `Nothing was added. ${parts.slice(1).join(". ") || "Check the columns."}`);
  return OK(`Saved. ${parts.join(", ")}.`);
}
