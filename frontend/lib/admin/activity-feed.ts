import "server-only";
import { listAudit } from "@/lib/audit-db";
import type { AuditEntry, AuditKind } from "@/lib/admin/types";
import { whenWords } from "@/lib/admin/when";

/**
 * RECENT ACTIVITY AS SENTENCES, from the audit log (never typed): "Funmi
 * issued INV-26-9QX4LM". Money kinds are left out for staff. `subjectIds`
 * narrows it to one client or one project and the records under it.
 */
export type FeedItem = { id: string; who: string; what: string; kind: AuditKind; when: string; at: string; href?: string };

const MONEY: AuditKind[] = ["invoice", "payment", "expense"];

export async function activityFeed({ money, subjectIds, limit = 5, kinds }: { money: boolean; subjectIds?: string[]; limit?: number; kinds?: AuditKind[] }): Promise<FeedItem[]> {
  try {
    const { entries } = await listAudit({ range: "all", subjectIds, limit: 80 });
    const now = Date.now();
    return entries
      .filter((e: AuditEntry) => (money || !MONEY.includes(e.kind)) && (!kinds || kinds.includes(e.kind)) && e.kind !== "setting")
      .slice(0, limit)
      .map((e) => ({
        id: e.id, who: e.actor, kind: e.kind, at: e.at, when: whenWords(e.at, now),
        what: `${e.action} ${e.subject}${e.field && e.to ? `, ${e.field} to ${e.to}` : ""}`,
        href: e.kind === "client" ? `/admin/clients/${e.subjectId}` : e.kind === "project" ? `/admin/projects/${e.subjectId}` : e.kind === "invoice" && money ? `/admin/money/${e.subjectId}` : undefined,
      }));
  } catch { return []; }
}
