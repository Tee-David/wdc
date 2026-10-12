import { NextResponse, type NextRequest } from "next/server";
import { allow } from "@/lib/admin/guard";
import { CSV_HEADERS, csvBody } from "@/lib/admin/csv";
import { syncStore } from "@/lib/admin/persist";
import { listDepartments } from "@/lib/departments";
import { readFilters } from "@/lib/admin/reports/filters";
import { buildScope } from "@/lib/admin/reports/scope";
import { REPORTS, datasets, header, stack, type ReportKey } from "@/lib/admin/reports/datasets";
import { XLSX_HEADERS, xlsxBody } from "@/lib/xlsx";

export const dynamic = "force-dynamic";

/**
 * A report as a file, for the same filters as the screen. `report` picks one of
 * the named reports (or `all` for everything the filters can see); `format` is
 * csv or xlsx. The books are the owner's: a refusal is a 404, as on the page.
 */
export async function GET(request: NextRequest) {
  if (await allow("exports") || await allow("money")) return new NextResponse("Not found", { status: 404 });
  await syncStore();
  const sp = Object.fromEntries(request.nextUrl.searchParams.entries());
  const f = readFilters(sp, Date.now());
  const key = (REPORTS.find(([k]) => k === sp.report)?.[0] ?? "all") as ReportKey | "all";
  const scope = buildScope(f, Date.now());
  const sections = datasets(key, scope, await listDepartments());
  const name = REPORTS.find(([k]) => k === key)?.[1] ?? "Full report";
  const rows = stack(header(f, { from: f.from, to: f.to }, name), sections);
  const file = `wdc-${key}-${f.from}-to-${f.to}`;
  if (sp.format === "xlsx") return new NextResponse(Buffer.from(xlsxBody(rows, name.slice(0, 30))), { headers: XLSX_HEADERS(`${file}.xlsx`) });
  return new NextResponse(csvBody(rows), { headers: CSV_HEADERS(`${file}.csv`) });
}
