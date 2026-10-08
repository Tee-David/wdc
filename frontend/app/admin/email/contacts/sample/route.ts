import { NextResponse } from "next/server";
import { allow } from "@/lib/admin/guard";
import { CSV_HEADERS } from "@/lib/admin/csv";
import { sampleCsv } from "@/lib/contacts-import";

export const dynamic = "force-dynamic";

/** The sample file the Import sheet offers: the header and three examples, in the columns the import reads. */
export async function GET() {
  if (await allow("settings")) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(sampleCsv(), { headers: CSV_HEADERS("wdc-contacts-sample.csv") });
}
