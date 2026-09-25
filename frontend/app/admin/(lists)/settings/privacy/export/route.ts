import { NextRequest, NextResponse } from "next/server";
import { adminRole, actorName } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { audit } from "@/lib/admin/store";
import { csvBody } from "@/lib/admin/csv";
import { countOf, findPersonalData, flatten, hashEmail, logRequest, looksEmail } from "@/lib/privacy/requests";
import { persistSoon, syncStore } from "@/lib/admin/persist";

/**
 * Everything held about one address, as a file for the person who asked.
 * The owner's; anybody else gets a 404, the same as a page that is not there.
 * Every download is logged.
 */
export async function GET(request: NextRequest) {
  await syncStore();
  persistSoon();
  if (!can(await adminRole(), "settings")) return new NextResponse("Not found", { status: 404 });
  const email = (request.nextUrl.searchParams.get("email") ?? "").trim().toLowerCase();
  if (!looksEmail(email)) return new NextResponse("An email address is needed.", { status: 400 });
  const format = request.nextUrl.searchParams.get("format") === "csv" ? "csv" : "json";
  const found = await findPersonalData(email);
  const by = await actorName();
  const counts = countOf(found);
  await logRequest(email, "export", counts, by);
  audit({ actor: by, kind: "setting", subjectId: `privacy:${hashEmail(email).slice(0, 8)}`, subject: "Personal data request", action: `exported the records for one address as ${format.toUpperCase()}`, note: `request ${hashEmail(email).slice(0, 8)}` });
  const name = `personal-data-${new Date().toISOString().slice(0, 10)}`;
  const headers = {
    "content-disposition": `attachment; filename="${name}.${format}"`,
    "cache-control": "private, no-store",
    "x-content-type-options": "nosniff",
    "content-type": format === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
  };
  if (format === "csv") return new NextResponse(csvBody(flatten(found)), { headers });
  return new NextResponse(JSON.stringify({ email, exportedAt: new Date().toISOString(), ...found }, null, 2), { headers });
}
