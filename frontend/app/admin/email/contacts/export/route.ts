import { NextResponse, type NextRequest } from "next/server";
import { allow } from "@/lib/admin/guard";
import { csvBody, CSV_HEADERS } from "@/lib/admin/csv";
import { listContacts } from "@/lib/contacts";

export const dynamic = "force-dynamic";

/** The contact list as CSV, the same filters as the screen. Owner only; a refusal is a 404. */
export async function GET(request: NextRequest) {
  if (await allow("exports") || await allow("settings")) return new NextResponse("Not found", { status: 404 });
  const q = request.nextUrl.searchParams;
  const res = await listContacts({ q: q.get("q") ?? "", tag: q.get("tag") ?? "", type: q.get("type") ?? "", status: q.get("status") ?? "", marketing: q.get("marketing") ?? "", page: 1, per: 100 }, true);
  if (!res) return new NextResponse("The contacts could not be read just now.", { status: 503 });
  const rows = [["Name", "Email", "Phone", "Type", "Status", "Asked to hear from us", "Tags", "Source", "Added"],
    ...res.rows.map((c) => [c.name, c.email, c.phone, c.type, c.status, c.marketing ? "yes" : "no", c.tags.join("; "), c.source, c.createdAt.slice(0, 10)])];
  return new NextResponse(csvBody(rows), { headers: CSV_HEADERS(`wdc-contacts-${new Date().toISOString().slice(0, 10)}.csv`) });
}
