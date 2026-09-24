import { after, NextRequest, NextResponse } from "next/server";
import { callerKey, rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db/pool";
import { mailIsConfigured } from "@/lib/email";
import { secretKey, sendLogged } from "@/lib/outbox";
import { composeEmailHtml, emailButton, emailP, emailSmall } from "@/lib/email-templates";
import {
  cleanAnswers, cleanService, cleanStep, cookieToken, draftFromToken, issueToken,
  normalizeEmail, requestOriginIsAllowed, RESUME_TTL_SECONDS, setOnboardingCookie, tokenHash,
} from "@/lib/onboarding-server";

export async function GET(request: NextRequest) {
  const token = cookieToken(request);
  const draft = token ? await draftFromToken(token) : null;
  return NextResponse.json({ draft });
}

/* A draft saves on a timer as the client types, so the allowance has to be
   generous enough for a real person filling in a long form and still small
   enough that a script cannot sit here writing rows. */
/* TWO LIMITS, BECAUSE ONLY ONE OF THE TWO THINGS THIS ROUTE DOES IS ABUSABLE.
 *
 * With a valid draft cookie this UPDATES one existing row. The form autosaves
 * 1.2 seconds after every answer, so a client working through forty questions
 * makes forty calls in the ordinary course of filling it in, and a careful one
 * who revises their answers makes considerably more. A tight limit here does
 * not stop an attacker -- it locks a paying client out of a form they are in
 * the middle of. (I set this to 40 first, which is roughly the number of calls
 * a normal completion makes. The test suite found it by tripping over it.)
 *
 * WITHOUT a cookie it INSERTS a new row, and that is the one worth guarding:
 * it is the only path that can grow the table, so it gets the tight number.
 */
const UPDATE_LIMIT = 300;
const CREATE_LIMIT = 6;
const DRAFT_WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
  if (!requestOriginIsAllowed(request)) {
    return NextResponse.json({ error: "This request could not be verified." }, { status: 403 });
  }

  /* Read the cookie before limiting, so the limit can tell the two cases
     apart. An invalid or expired token counts as creating. */
  const existingToken = cookieToken(request);
  const existingDraft = existingToken ? await draftFromToken(existingToken) : null;
  const creating = !existingDraft;

  const limit = creating
    ? rateLimit(callerKey(request, "onboarding-draft-new"), CREATE_LIMIT, DRAFT_WINDOW_MS)
    : rateLimit(callerKey(request, "onboarding-draft-save"), UPDATE_LIMIT, DRAFT_WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: creating
          ? "Too many forms started from here. Give it a few minutes."
          : "That is a lot of saving at once. Your answers are safe; give it a minute and carry on.",
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
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

  let token = existingToken;
  let draft = existingDraft;
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
  /* THE LINK GOES BEHIND THE RESPONSE. This used to be awaited, which put
     the mail server's 23-second handshake between the click and the saved
     message. The reply now says the link is on its way rather than that it
     arrived, which is also the more honest sentence: acceptance by our mail
     server was never delivery to the client's inbox. The outbox row is where
     a failure shows up. */
  let emailSent = false;
  if (requestedEmail && body.emailLink === true && mailIsConfigured()) {
    const to = requestedEmail;
    const linkToken = token;
    after(async () => {
      try {
        await sendLogged({
          to,
          subject: "Continue your WDC onboarding form",
          text: `Your onboarding answers are saved. Continue within three days: ${resumeUrl}\n\nIf you did not request this link, you can ignore this email.`,
          html: composeEmailHtml({
            title: "Your answers are saved",
            preheader: "Continue your onboarding form on any device within three days.",
            heading: "Your answers are saved",
            blocks: [
              emailP("Continue on any device within three days."),
              emailButton("Continue onboarding", resumeUrl),
              emailSmall("If you did not request this link, you can ignore this email."),
            ],
          }),
        }, {
          summary: "A link to continue a saved onboarding form.",
          dedupeKey: secretKey("onboarding-resume", linkToken),
        });
      } catch (error) {
        console.error("Onboarding resume email failed", error instanceof Error ? error.message : "unknown error");
      }
    });
    emailSent = true;
  }

  const response = NextResponse.json({ draft, resumeUrl, emailSent });
  setOnboardingCookie(response, token);
  return response;
}
