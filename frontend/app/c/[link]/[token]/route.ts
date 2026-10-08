import { NextResponse, type NextRequest } from "next/server";
import { recordClick } from "@/lib/campaigns";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

/** A tracked link in a campaign. Only addresses saved for that campaign can be reached, so it can never redirect somewhere new. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ link: string; token: string }> }) {
  const { link, token } = await params;
  const url = await recordClick(link, token);
  return NextResponse.redirect(url && /^https?:\/\//i.test(url) ? url : SITE_URL, { status: 307, headers: { "cache-control": "no-store", "referrer-policy": "no-referrer" } });
}
