import { NextResponse, type NextRequest } from "next/server";
import { allow } from "@/lib/admin/guard";
import { csvBody, CSV_HEADERS } from "@/lib/admin/csv";
import { xlsxBody, XLSX_HEADERS } from "@/lib/xlsx";
import { sameOrigin } from "@/lib/meetings/policy";
import { exportContacts, exportCount, openRate, opensFor, type ExportQuery } from "@/lib/contacts";
import { exportTable, readCols, readFormat, readScope } from "@/lib/contacts-export";

export const dynamic = "force-dynamic";

/** One place reads the request, so the link (GET) and the sheet (POST) can never mean different things. */
function read(get: (k: string) => string | null, ids: string[]) {
  const stopped = get("stopped") === "1";
  const q: ExportQuery = {
    scope: readScope(get("scope")), stopped, ids,
    filters: { q: (get("q") ?? "").trim().slice(0, 120), tag: get("tag") ?? "", type: get("type") ?? "", status: get("status") ?? "", marketing: get("marketing") ?? "", page: 1, per: 100 },
  };
  return { q, cols: readCols(get("cols"), stopped), format: readFormat(get("fmt")) };
}

async function respond(r: ReturnType<typeof read>) {
  const rows = await exportContacts(r.q);
  if (!rows) return new NextResponse("The contacts could not be read just now.", { status: 503 });
  const opens = new Map<string, number>();
  if (r.cols.includes("opens")) for (const [id, o] of await opensFor(rows.map((c) => c.id))) { const p = openRate(o); if (p !== null) opens.set(id, p); }
  const table = exportTable(rows, r.cols, opens);
  const name = `wdc-contacts-${new Date().toISOString().slice(0, 10)}`;
  if (r.format === "xlsx") return new NextResponse(Buffer.from(xlsxBody(table, "Contacts")), { headers: XLSX_HEADERS(`${name}.xlsx`) });
  return new NextResponse(csvBody(table), { headers: CSV_HEADERS(`${name}.csv`) });
}

/**
 * The contact list as a file. Owner only; a refusal is a 404.
 * GET: the current view's filters in the address (the old CSV link), or `count=1` for
 * how many people the sheet's choices would export, so its button can say so truthfully.
 */
export async function GET(request: NextRequest) {
  if (await allow("exports") || await allow("settings")) return new NextResponse("Not found", { status: 404 });
  const sp = request.nextUrl.searchParams;
  const r = read((k) => sp.get(k), []);
  if (sp.get("count") === "1") {
    const n = await exportCount(r.q);
    return n === null ? new NextResponse("The contacts could not be read just now.", { status: 503 }) : NextResponse.json({ n }, { headers: { "Cache-Control": "private, no-store" } });
  }
  return respond(r);
}

/** POST: the Export sheet's own form, so ticked rows can travel as `ids` and the browser saves the answer as a file. Same-origin only. */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request.headers.get("origin"), request.nextUrl.origin)) return new NextResponse("Not found", { status: 404 });
  if (await allow("exports") || await allow("settings")) return new NextResponse("Not found", { status: 404 });
  const form = await request.formData();
  const ids = form.getAll("ids").map(String).filter((x) => x && x.length < 80).slice(0, 20_000);
  return respond(read((k) => (typeof form.get(k) === "string" ? String(form.get(k)) : null), ids));
}
