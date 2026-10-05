"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { supportCookiePresent } from "./support";
import { db } from "@/lib/db/pool";
import { FAIL, OK, type ActionState } from "@/lib/admin/validate";

export async function securityEmailPreference(_previous: ActionState, fd: FormData): Promise<ActionState> {
  try {
    if (await supportCookiePresent()) return FAIL({}, "Exit the read-only support view first.");
    const h = await headers(); const origin = h.get("origin"); const host = h.get("x-forwarded-host") || h.get("host");
    if (!origin || !host || new URL(origin).host !== host) return FAIL({}, "Reload this page and retry.");
    const session = await auth.api.getSession({ headers: h });
    if (!session) return FAIL({}, "Sign in again, then retry.");
    const active = await db.query(`SELECT 1 FROM "user" WHERE "id"=$1 AND "deactivatedAt" IS NULL`,[session.user.id]);
    if (!active.rowCount) return FAIL({}, "Your account access has ended. Sign in again.");
    const value = fd.get("enabled");
    if (value !== "yes" && value !== "no") return FAIL({}, "Choose whether to receive account-change emails.");
    await db.query(`INSERT INTO user_security_preferences(user_id,email_enabled) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET email_enabled=excluded.email_enabled,updated_at=now()`, [session.user.id, value === "yes"]);
    revalidatePath("/admin/settings/account"); revalidatePath("/portal/settings");
    return OK("Updated. Requested sign-in and recovery links remain available.");
  } catch { return FAIL({}, "The email preference could not be saved. Check the database migration and retry."); }
}
