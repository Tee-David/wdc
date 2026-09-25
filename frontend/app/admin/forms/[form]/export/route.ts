import { NextResponse, type NextRequest } from "next/server";
import { allow } from "@/lib/admin/guard";
import { csvBody, CSV_HEADERS } from "@/lib/admin/csv";
import { xlsxBody, XLSX_HEADERS } from "@/lib/xlsx";
import { formByKey } from "@/lib/forms/registry";
import { cellText, exportEntries, readFilters, type Entry } from "@/lib/forms/entries";

export const dynamic = "force-dynamic";

/**
 * A form's entries as CSV or XLSX.
 *
 * THE LIST'S OWN QUERY. The same filters the table read from the URL (tab,
 * search, dates, sort), so the file holds what was on screen; with ticked
 * ids it holds exactly those. Every column the form has, not only the ones
 * this viewer chose to see, because an export is usually for somebody else.
 *
 * Exports are the owner's (lib/admin/permissions.ts), and a refusal is a 404,
 * like every other admin export, so the route does not confirm what exists.
 */
function state(e: Entry, inbox: boolean) {
  if (e.unsubscribedAt !== undefined) return e.unsubscribedAt ? "Unsubscribed" : "Subscribed";
  if (!inbox) return "";
  return [e.box === "inbox" ? (e.draft ? "Draft" : "Inbox") : e.box === "spam" ? "Spam" : "Trash", e.read ? "Read" : "Unread", e.starred ? "Starred" : ""]
    .filter(Boolean).join(", ");
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ form: string }> }) {
  if (await allow("exports")) return new NextResponse("Not found", { status: 404 });
  const { form: key } = await params;
  const form = formByKey(key);
  if (!form) return new NextResponse("Not found", { status: 404 });

  const sp = Object.fromEntries(request.nextUrl.searchParams.entries());
  const ids = request.nextUrl.searchParams.getAll("id");
  const filters = readFilters(form, sp);
  let entries: Entry[];
  try { entries = await exportEntries(form, filters, ids); } catch {
    return new NextResponse("The entries could not be read just now.", { status: 503 });
  }

  const cols = form.columns;
  const header = [...cols.map((c) => (c.key === "serial" ? `${form.noun} #` : c.label)), ...(form.inbox ? ["State"] : [])];
  const rows = entries.map((e) => [
    ...cols.map((c) => cellText(form, e, c.key)),
    ...(form.inbox ? [state(e, form.inbox)] : []),
  ]);
  const stamp = new Date().toISOString().slice(0, 10);
  const name = `wdc-${form.key}-${ids.length ? "selected" : filters.tab}-${stamp}`;

  if (request.nextUrl.searchParams.get("format") === "xlsx") {
    return new NextResponse(Buffer.from(xlsxBody([header, ...rows], form.title)), { headers: XLSX_HEADERS(`${name}.xlsx`) });
  }
  return new NextResponse(csvBody([header, ...rows]), { headers: CSV_HEADERS(`${name}.csv`) });
}
