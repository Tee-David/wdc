import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/pool";
import {
  draftFromToken, requestOriginIsAllowed, setOnboardingCookie, tokenHash,
} from "@/lib/onboarding-server";

export async function POST(request: NextRequest) {
  if (!requestOriginIsAllowed(request)) {
    return NextResponse.json({ error: "This request could not be verified." }, { status: 403 });
  }
  let token = "";
  try {
    const body = await request.json();
    token = typeof body.token === "string" ? body.token : "";
  } catch {
    return NextResponse.json({ error: "This resume link is invalid." }, { status: 400 });
  }
  if (!/^[A-Za-z0-9_-]{40,80}$/.test(token)) {
    return NextResponse.json({ error: "This resume link is invalid." }, { status: 400 });
  }

  const result = await db.query<{ used_at: Date | null; expires_at: Date; revoked_at: Date | null }>(`
    SELECT used_at, expires_at, revoked_at
    FROM onboarding_resume_tokens
    WHERE token_hash = $1
    LIMIT 1
  `, [tokenHash(token)]);
  const state = result.rows[0];
  if (!state || state.revoked_at) {
    return NextResponse.json({ error: "This resume link is invalid." }, { status: 404 });
  }
  if (state.expires_at.getTime() <= Date.now()) {
    /* `canReissue` is what turns these from a dead end into a button. The
       client asks for a fresh link themselves at /api/onboarding/reissue
       rather than emailing somebody who then does it by hand. */
    return NextResponse.json(
      { error: "This resume link has expired. We can send you a fresh one.", canReissue: true },
      { status: 410 },
    );
  }
  if (state.used_at) {
    return NextResponse.json(
      { error: "This resume link has already been used. Continue on the device where you opened it, or we can send you a fresh one.", canReissue: true },
      { status: 409 },
    );
  }

  const claimed = await db.query(`
    UPDATE onboarding_resume_tokens
    SET used_at = now()
    WHERE token_hash = $1 AND used_at IS NULL AND revoked_at IS NULL AND expires_at > now()
  `, [tokenHash(token)]);
  if (!claimed.rowCount) {
    return NextResponse.json({ error: "This resume link has already been used." }, { status: 409 });
  }
  const draft = await draftFromToken(token);
  if (!draft) return NextResponse.json({ error: "This saved form is no longer available." }, { status: 404 });

  const response = NextResponse.json({ draft });
  setOnboardingCookie(response, token);
  return response;
}
