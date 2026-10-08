import { NextResponse, type NextRequest } from "next/server";
import { recordOpen } from "@/lib/campaigns";

export const dynamic = "force-dynamic";

const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

/** The open pixel. Opens are approximate (mail apps preload images), which is why a click counts as an open too. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await recordOpen(token);
  return new NextResponse(GIF, { headers: { "content-type": "image/gif", "cache-control": "no-store, max-age=0" } });
}
