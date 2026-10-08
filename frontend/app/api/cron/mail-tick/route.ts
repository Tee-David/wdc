import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { runBatch } from "@/lib/campaigns";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The campaign sender's heartbeat, called every few minutes by a free GitHub
 * Actions schedule (.github/workflows/mail-tick.yml); Vercel's own cron only
 * runs daily. FAILS CLOSED like the daily one: no secret set, or a wrong one,
 * and nothing runs.
 */
async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set." }, { status: 503 });
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const wanted = Buffer.from(`Bearer ${secret}`);
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  return NextResponse.json(await runBatch());
}
export const GET = handle;
export const POST = handle;
