import { NextResponse } from "next/server";
import { getLegalDoc } from "@/lib/legal-store";
import { renderLegalPdf } from "@/lib/legal-pdf";

/**
 * Any policy as a PDF (lib/legal-pdf.ts). Public, because the pages are. Made
 * on request and cached by the CDN for an hour, so a download never waits on a
 * render for long and a policy edit shows up within the hour.
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const doc = await getLegalDoc((await params).slug);
  if (!doc) return new NextResponse("Not found", { status: 404 });
  const tab = new URL(req.url).searchParams.get("tab") ?? undefined;
  if (tab && !doc.tabs?.some((t) => t.id === tab)) return new NextResponse("Not found", { status: 404 });
  let bytes: Uint8Array;
  try { bytes = await renderLegalPdf(doc, tab); } catch (error) {
    console.error("Policy PDF failed", error instanceof Error ? error.message : "unknown error");
    return new NextResponse("The PDF could not be made just now. Try again in a minute.", { status: 503 });
  }
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="wdc-${doc.slug}${tab ? `-${tab}` : ""}.pdf"`,
      "Cache-Control": "public, max-age=300, s-maxage=3600",
    },
  });
}
