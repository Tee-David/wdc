import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db/pool";
import { requestOriginIsAllowed } from "@/lib/onboarding-server";
import { callerKey, rateLimit } from "@/lib/rate-limit";
import { supportCookiePresent } from '@/lib/users/support';

/**
 * A signed-in person's tour progress, read and written by the tour provider.
 *
 * ONLY A REAL SESSION. The capture bypass used for screenshots and tests has
 * no account to write against, and an anonymous request has no business here,
 * so the read answers 204, a write answers 401, and the browser simply keeps
 * its local copy. Nothing
 * about a tour is sensitive, but a row keyed to somebody else's id would be
 * a write into their account, so the id always comes from the session and
 * never from the request.
 */

const TOUR = /^[a-z0-9-]{1,60}@\d{1,4}$/;

async function userId(): Promise<string | null> {
  if(await supportCookiePresent())return null;
  if (!process.env.DATABASE_URL && !process.env.COCKROACHDB_URL) return null;
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: await headers() });
    const id=session?.user?.id;
    if(!id)return null;
    const active=await db.query('SELECT 1 FROM "user" WHERE id=$1 AND "deactivatedAt" IS NULL',[id]);
    return active.rowCount?id:null;
  } catch {
    return null;
  }
}

export async function GET() {
  const id = await userId();
  /* 204, not 401, for the read: "no account to sync with" is the normal case
     for the capture bypass, and the browser logs every 401 as an error. */
  if (!id) return new NextResponse(null, { status: 204, headers: { "cache-control": "no-store" } });
  try {
    const rows = await db.query<{ tour: string; status: string; at: Date }>(
      "SELECT tour, status, at FROM tour_progress WHERE user_id = $1 LIMIT 200", [id],
    );
    const records = Object.fromEntries(rows.rows.map((r) => [r.tour, { status: r.status, at: new Date(r.at).toISOString() }]));
    return NextResponse.json({ records,userId:id }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Unavailable." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if(await supportCookiePresent())return NextResponse.json({error:'Exit the read-only support view first.'},{status:403});
  if (!requestOriginIsAllowed(request)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  /* Loose: a tour writes once when it ends. This is abuse control on one
     instance's memory, not a quota -- see lib/rate-limit.ts. */
  const limit = rateLimit(callerKey(request, "tours"), 60, 10 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: "Slow down." }, { status: 429 });

  const id = await userId();
  if (!id) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Bad request." }, { status: 400 }); }
  const tour = typeof body.tour === "string" ? body.tour : "";
  const status = body.status;
  if (!TOUR.test(tour) || !["completed", "skipped", "cleared"].includes(String(status))) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  try {
    if (status === "cleared") {
      await db.query("DELETE FROM tour_progress WHERE user_id = $1 AND tour = $2", [id, tour]);
    } else {
      await db.query(
        `INSERT INTO tour_progress (user_id, tour, status) VALUES ($1, $2, $3)
         ON CONFLICT (user_id, tour) DO UPDATE SET status = excluded.status, at = now()`,
        [id, tour, status],
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unavailable." }, { status: 503 });
  }
}
