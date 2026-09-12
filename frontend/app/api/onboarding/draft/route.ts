import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/pool";
import { escapeHtml, sendMail } from "@/lib/email";
import {
  cleanAnswers, cleanService, cleanStep, cookieToken, draftFromToken, issueToken,
  normalizeEmail, requestOriginIsAllowed, RESUME_TTL_SECONDS, setOnboardingCookie, tokenHash,
} from "@/lib/onboarding-server";

export async function GET(request: NextRequest) {
  const token = cookieToken(request);
  const draft = token ? await draftFromToken(token) : null;
  return NextResponse.json({ draft });
}

export async function POST(request: NextRequest) {
  if (!requestOriginIsAllowed(request)) {
    return NextResponse.json({ error: "This request could not be verified." }, { status: 403 });
  }
  const size = Number(request.headers.get("content-length") || 0);
  if (size > 130_000) return NextResponse.json({ error: "This draft is too large." }, { status: 413 });

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "The draft could not be read." }, { status: 400 }); }

  const service = cleanService(body.service);
  const answers = cleanAnswers(body.answers);
  const currentStep = cleanStep(body.currentStep);
  const requestedEmail = body.email === undefined || body.email === "" ? null : normalizeEmail(body.email);
  if (!service || !answers || (body.email && !requestedEmail)) {
    return NextResponse.json({ error: "Please check the draft details and try again." }, { status: 422 });
  }

  let token = cookieToken(request);
  let draft = token ? await draftFromToken(token) : null;
  if (draft?.status === "submitted") {
    return NextResponse.json({ error: "This onboarding form has already been submitted." }, { status: 409 });
  }

  if (draft) {
    const result = await db.query<{ email: string | null }>(`
      UPDATE onboarding_submissions
      SET service = $2, current_step = $3, answers = $4::JSONB,
          email = COALESCE($5, email), updated_at = now()
      WHERE id = $1 AND status = 'in_progress'
      RETURNING email
    `, [draft.id, service, currentStep, JSON.stringify(answers), requestedEmail]);
    draft = { ...draft, service, currentStep, answers, email: result.rows[0]?.email ?? draft.email };
  } else {
    token = issueToken();
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const inserted = await client.query<{ id: string }>(`
        INSERT INTO onboarding_submissions (service, current_step, answers, email)
        VALUES ($1, $2, $3::JSONB, $4)
        RETURNING id
      `, [service, currentStep, JSON.stringify(answers), requestedEmail]);
      const submissionId = inserted.rows[0].id;
      await client.query(`
        INSERT INTO onboarding_resume_tokens (submission_id, token_hash, email, expires_at)
        VALUES ($1, $2, $3, $4)
      `, [submissionId, tokenHash(token), requestedEmail, new Date(Date.now() + RESUME_TTL_SECONDS * 1000)]);
      await client.query("COMMIT");
      draft = await draftFromToken(token);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  if (!draft || !token) {
    return NextResponse.json({ error: "The draft could not be saved." }, { status: 500 });
  }

  if (body.rotateLink === true || body.emailLink === true) {
    const previousHash = tokenHash(token);
    const nextToken = issueToken();
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await client.query(`
        UPDATE onboarding_resume_tokens
        SET revoked_at = now()
        WHERE token_hash = $1 AND used_at IS NULL AND revoked_at IS NULL
      `, [previousHash]);
      await client.query(`
        INSERT INTO onboarding_resume_tokens (submission_id, token_hash, email, expires_at)
        VALUES ($1, $2, $3, $4)
      `, [draft.id, tokenHash(nextToken), requestedEmail ?? draft.email, new Date(Date.now() + RESUME_TTL_SECONDS * 1000)]);
      await client.query("COMMIT");
      token = nextToken;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  const resumeUrl = `${request.nextUrl.origin}/onboarding?resume=${encodeURIComponent(token)}`;
  let emailSent = false;
  if (requestedEmail && body.emailLink === true) {
    try {
      await sendMail({
        to: requestedEmail,
        subject: "Continue your WDC onboarding form",
        text: `Your onboarding answers are saved. Continue within three days: ${resumeUrl}\n\nIf you did not request this link, you can ignore this email.`,
        html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#11113a;max-width:560px"><p style="font-size:12px;font-weight:700;letter-spacing:.12em;color:#ff6500">WE DIG CREATIVITY</p><h1 style="font-size:28px;margin:12px 0">Your answers are saved.</h1><p>Use the button below to continue on any device within three days.</p><p><a href="${escapeHtml(resumeUrl)}" style="display:inline-block;background:#ff6500;color:#ffffff;padding:13px 20px;border-radius:999px;font-weight:700;text-decoration:none">Continue onboarding</a></p><p style="color:#666680;font-size:13px">If you did not request this link, you can ignore this email.</p></div>`,
      });
      emailSent = true;
    } catch (error) {
      console.error("Onboarding resume email failed", error instanceof Error ? error.message : "unknown error");
    }
  }

  const response = NextResponse.json({ draft, resumeUrl, emailSent });
  setOnboardingCookie(response, token);
  return response;
}
