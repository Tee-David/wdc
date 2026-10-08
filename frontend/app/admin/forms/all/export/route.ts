import { NextResponse, type NextRequest } from "next/server";
import { allow } from "@/lib/admin/guard";
import { csvBody, CSV_HEADERS } from "@/lib/admin/csv";
import { xlsxBody, XLSX_HEADERS } from "@/lib/xlsx";
import { COLUMNS, cell, listAll, readColumns } from "@/lib/forms/all-entries";

export const dynamic = "force-dynamic";

/** The All entries table as a file: the same filters, the same chosen columns, every page of it. Owner only; a refusal is a 404. */
export async function GET(request: NextRequest) {
  if (await allow("exports")) return new NextResponse("Not found", { status: 404 });
  const sp: Record<string, string | string[]> = {};
  for (const k of new Set(request.nextUrl.searchParams.keys())) {
    const all = request.nextUrl.searchParams.getAll(k);
    sp[k] = all.length > 1 ? all : all[0];
  }
  let rows;
  try { rows = (await listAll(sp, { everything: true })).rows; } catch {
    return new NextResponse("The entries could not be read just now.", { status: 503 });
  }
  const cols = readColumns(sp.cols);
  const table = [cols.map((k) => COLUMNS.find((c) => c.key === k)?.label ?? k), ...rows.map((r) => cols.map((k) => cell(r, k)))];
  const name = `wdc-all-entries-${new Date().toISOString().slice(0, 10)}`;
  if (request.nextUrl.searchParams.get("format") === "xlsx") {
    return new NextResponse(Buffer.from(xlsxBody(table, "All entries")), { headers: XLSX_HEADERS(`${name}.xlsx`) });
  }
  return new NextResponse(csvBody(table), { headers: CSV_HEADERS(`${name}.csv`) });
}
