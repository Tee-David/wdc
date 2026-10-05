import { after, NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/pool";
import { hash, validSignature } from "@/lib/meetings/policy";
import { recover } from "@/lib/meetings/store";

export const maxDuration = 60;
export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (raw.length > 128000) return new NextResponse(null, { status: 413 });
  if (!validSignature(raw, request.headers.get("x-cal-signature-256"), process.env.CAL_WEBHOOK_SECRET)) return new NextResponse(null, { status: 401 });
  let body;
  try { body = JSON.parse(raw); } catch { return new NextResponse(null, { status: 400 }); }
  const uid = body.payload?.uid, kind = body.triggerEvent;
  if (typeof uid !== "string" || uid.length > 100 || typeof kind !== "string" || !kind.startsWith("BOOKING_")) return new NextResponse(null, { status: 422 });
  try {
    await db.query("INSERT INTO wdc_meeting_webhooks (digest,booking_uid,kind) VALUES ($1,$2,$3) ON CONFLICT (digest) DO NOTHING", [hash(raw), uid, kind]);
    after(() => recover());
    return new NextResponse(null, { status: 202 });
  } catch { return new NextResponse(null, { status: 503 }); }
}
