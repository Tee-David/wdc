import { NextResponse } from "next/server";
import { allow } from "@/lib/admin/guard";
import { findForm } from "@/lib/forms/find";
import { getEntry } from "@/lib/forms/entries";
import { entryPdf, entryPdfName } from "@/lib/forms/entry-pdf";

export const dynamic = "force-dynamic";

/**
 * One entry as a PDF (lib/forms/entry-pdf.ts). Whoever may read the entry may
 * download it; anyone else gets the same 404 as a missing entry, so the route
 * does not confirm what exists. Newsletter sign-ups have nothing to print.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ form: string; entry: string }> }) {
  if (await allow("forms")) return new NextResponse("Not found", { status: 404 });
  const { form: key, entry: id } = await params;
  const form = await findForm(key);
  if (!form || form.source === "newsletter") return new NextResponse("Not found", { status: 404 });
  const entry = await getEntry(form, id).catch(() => null);
  if (!entry) return new NextResponse("Not found", { status: 404 });
  let bytes: Uint8Array;
  try { bytes = await entryPdf(form, entry); } catch (error) {
    console.error("Entry PDF failed", error instanceof Error ? error.message : "unknown error");
    return new NextResponse("The PDF could not be made just now. Try again in a minute.", { status: 503 });
  }
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${entryPdfName(form, entry)}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
