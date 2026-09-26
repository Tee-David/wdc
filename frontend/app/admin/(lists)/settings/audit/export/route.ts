import { NextResponse } from "next/server";
import { getAdminRequest } from "@/lib/admin/session";
import { audit } from "@/lib/admin/store";
import { csvBody, CSV_HEADERS } from "@/lib/admin/csv";
import { listAudit, readAuditFilters } from "@/lib/audit-db";
import { KIND_LABEL } from "@/lib/audit-events";
import { verbOf } from "@/lib/audit-verbs";

export const dynamic = "force-dynamic";

/**
 * THE AUDIT LOG AS CSV, the rows the screen's filters select, up to 5,000.
 * Owner only, and an export is itself written to the log: who took a copy of
 * the history is part of the history.
 */
export async function GET(request: Request) {
  const { session } = await getAdminRequest();
  const user = session?.user as (NonNullable<typeof session>["user"] & { role?: string }) | undefined;
  if (!user || user.role !== "owner") return new NextResponse("Not found", { status: 404 });

  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const filters = { ...readAuditFilters(sp), page: 1 };
  const rows: string[][] = [];
  /* listAudit is bounded at 200 a read; walk the pages up to the cap. */
  for (let page = 1; page <= 25; page++) {
    const { entries } = await listAudit({ ...filters, limit: 200, page });
    for (const e of entries) {
      rows.push([
        new Date(e.at).toISOString(), e.actor, verbOf(e.action).label, e.action, KIND_LABEL[e.kind],
        e.subject, e.subjectId, e.field ?? "", e.from ?? "", e.to ?? "", e.note ?? "",
      ]);
    }
    if (entries.length < 200) break;
  }
  audit({
    actor: user.name?.trim() || user.email || "Owner", kind: "setting", subjectId: "audit-log", subject: "Audit log",
    action: "exported", note: `${rows.length} ${rows.length === 1 ? "row" : "rows"} as CSV`,
  });
  const header = ["When (UTC)", "Who", "Action", "Recorded as", "Area", "Record", "Record ID", "Field", "Before", "After", "Note"];
  return new NextResponse(csvBody([header, ...rows]), { headers: CSV_HEADERS("wdc-audit-log.csv") });
}
