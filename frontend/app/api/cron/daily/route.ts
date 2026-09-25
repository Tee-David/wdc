import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { runDaily } from "@/lib/jobs/daily";

export const dynamic = "force-dynamic";

/**
 * The daily tidy, called by the scheduler (vercel.json).
 *
 * FAILS CLOSED. Vercel sends `Authorization: Bearer $CRON_SECRET`; with no
 * secret configured, or a wrong one, nothing runs. The same job can be run by
 * hand from Settings, Email.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set." }, { status: 503 });
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const wanted = Buffer.from(`Bearer ${secret}`);
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  }
  return NextResponse.json(await runDaily("Daily schedule"));
}
