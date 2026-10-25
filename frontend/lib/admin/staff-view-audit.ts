import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { db } from "@/lib/db/pool";

/**
 * ONE AUDIT LINE FOR A WRITE MADE WHILE THE OWNER WORKS AS STAFF, whatever
 * the write was: the owner, the staff member and the page it came from. The
 * specific change is audited as usual on top of this (its actor already reads
 * "Owner (as Staff)", see actorName), so a write that keeps no audit line of
 * its own, such as a project note, is still on record. Once per request, so a
 * write that passes two guards leaves one line. Never blocks the write: a
 * failed insert is logged and the write goes on.
 */
export const auditStaffViewWrite = cache(async (owner: string, staffId: string, staffName: string) => {
  try {
    const h = await headers();
    let page = "";
    try { page = new URL(h.get("referer") ?? "").pathname; } catch { /* no referrer: the line still names who */ }
    await db.query(
      `INSERT INTO audit_log (at, actor, kind, subject_id, subject, action, note) VALUES (now(), $1, 'setting', $2, $3, 'made a change while working as staff', $4)`,
      [`${owner} (as ${staffName})`.slice(0, 200), staffId, staffName.slice(0, 300), page ? `On ${page.slice(0, 300)}` : null],
    );
  } catch (error) {
    console.error("[staff view] audit line not written", error instanceof Error ? error.message : error);
  }
});
