"use server";

import { emailReminder } from "@/lib/admin/actions";
import { inviteClient } from "@/lib/admin/invite-actions";
import { findDuplicateClient } from "@/lib/admin/store";
import { allow } from "@/lib/admin/guard";
import { syncStore } from "@/lib/admin/persist";

/**
 * The two deck cards on Clients that do the thing themselves. Each wraps an
 * existing action, so every check it makes (owner only, nothing outstanding,
 * opted out, a real address) still runs on the server, and each is safe to run
 * twice: a reminder is at most one a day and a new invitation replaces the last.
 */
type Said = { ok: boolean; message?: string };

export async function remindInvoice(id: string): Promise<Said> {
  const fd = new FormData();
  fd.set("id", String(id));
  const r = await emailReminder({ ok: false }, fd);
  return { ok: r.ok, message: r.message };
}

export async function reinviteClient(clientId: string): Promise<Said> {
  const fd = new FormData();
  fd.set("clientId", String(clientId));
  const r = await inviteClient({ ok: false }, fd);
  return { ok: r.ok, message: r.message };
}

/**
 * Does a client already use this email or phone? Asked while the New client
 * sheet is open, so the person is told before they press Save (the save still
 * refuses a duplicate on its own). Returns only what the sheet shows.
 */
export async function findClientMatch(email: string, phone: string): Promise<{ id: string; company: string; name: string; archived: boolean } | null> {
  if (await allow("clients")) return null;
  await syncStore();
  const e = String(email ?? "").slice(0, 200), p = String(phone ?? "").slice(0, 60);
  if (!e.includes("@") && p.replace(/\D/g, "").length < 7) return null;
  const hit = findDuplicateClient(e.includes("@") ? e : "no-email-given@invalid", p.replace(/\D/g, "").length >= 7 ? p : "");
  return hit ? { id: hit.id, company: hit.company, name: hit.name, archived: Boolean(hit.archived) } : null;
}
