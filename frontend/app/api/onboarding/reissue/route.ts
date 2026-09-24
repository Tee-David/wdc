import { after, NextRequest, NextResponse } from "next/server";
import { callerKey, rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db/pool";
import { escapeHtml, mailIsConfigured } from "@/lib/email";
import { secretKey, sendLogged } from "@/lib/outbox";
import {
  issueToken, normalizeEmail, requestOriginIsAllowed, RESUME_TTL_SECONDS, tokenHash,
} from "@/lib/onboarding-server";

/**
 * "My resume link expired, send me another one."
 *
 * WHY THIS EXISTS. The resume route answered an expired link with "Request a
 * new link from WDC", which is an instruction to go and find a human. A client
 * who set the form aside for four days had a complete draft sitting in the
 * database and no way to reach it, and the only route back was an email to
 * somebody who then had to do this by hand.
 *
 * ---------------------------------------------------------------------------
 * THE ANSWER IS ALWAYS THE SAME, and that is the point.
 *
 * This endpoint is unauthenticated and takes an email address, so a truthful
 * answer would turn it into an oracle: ask it about an address and learn
 * whether that person has an unfinished WDC onboarding. That is a real
 * disclosure about somebody who is not the caller. So the response is
 * identical whether the address has a draft, has none, or is not an address we
 * would ever have seen, and it never says which.
 *
 * The link goes to the ADDRESS ON THE DRAFT. There is no field here that lets
 * a caller nominate where it is sent, which is what stops this being a way to
 * forward somebody else's answers to yourself.
 *
 * Old links die when a new one is issued. A reissue revokes every outstanding
 * unused token for that draft in the same transaction, so a link recovered
 * from an old mailbox is not a second key.
 */

/* Low, because a real person does this once. The window is long for the same
   reason: someone who has genuinely lost their link does not need five goes in
   a minute, and an enumerator does. */
const LIMIT = 4;
const WINDOW_MS = 15 * 60 * 1000;

/* Said to everyone, always. */
const SAME_ANSWER = {
  ok: true,
  message:
    "If that address has an unfinished form, we have sent a fresh link to it. It is good for three days.",
};

export async function POST(request: NextRequest) {
  /* FAIL CLOSED ON ORIGIN, like every other write route here. A missing or
     foreign origin is not valid input. */
  if (!requestOriginIsAllowed(request)) {
    return NextResponse.json({ error: "This request could not be verified." }, { status: 403 });
  }

  const limit = rateLimit(callerKey(request, "onboarding-reissue"), LIMIT, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Please wait a little before asking for another link." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON." }, { status: 400 });
  }

  const email = normalizeEmail((body as { email?: unknown })?.email);
  /* A malformed address is the one case that gets a different answer, because
     it says nothing about anybody: it is a typo, and telling the client that
     is more useful than pretending we sent mail to something with no @ in it. */
  if (!email) {
    return NextResponse.json({ error: "Please enter the email address you used." }, { status: 400 });
  }

  try {
    /* The newest unfinished draft for that address. `status = 'in_progress'`
       matters: a client who already SUBMITTED has nothing to resume, and
       handing them an editable link to a finished submission would let them
       change answers we have already acted on. */
    const found = await db.query<{ id: string; email: string }>(`
      SELECT id, email
      FROM onboarding_submissions
      WHERE lower(email) = lower($1) AND status = 'in_progress'
      ORDER BY updated_at DESC
      LIMIT 1
    `, [email]);

    const draft = found.rows[0];
    if (draft && mailIsConfigured()) {
      const token = issueToken();
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        /* Every outstanding link for this draft stops working now. */
        await client.query(`
          UPDATE onboarding_resume_tokens
          SET revoked_at = now()
          WHERE submission_id = $1 AND used_at IS NULL AND revoked_at IS NULL
        `, [draft.id]);
        await client.query(`
          INSERT INTO onboarding_resume_tokens (submission_id, token_hash, email, expires_at)
          VALUES ($1, $2, $3, $4)
        `, [draft.id, tokenHash(token), draft.email, new Date(Date.now() + RESUME_TTL_SECONDS * 1000)]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }

      const url = `${request.nextUrl.origin}/onboarding?resume=${encodeURIComponent(token)}`;
      /* BEHIND THE RESPONSE, and this is measured rather than stylistic: this
         mail server takes about 23 seconds just to authenticate, and the
         client is staring at a button. `after` rather than a bare `void`,
         because a platform may freeze the function once the response is sent
         and a floating promise has nobody keeping it alive. Nothing
         downstream depends on the send, because the answer does not reveal
         whether one happened. */
      const to = draft.email;
      after(async () => {
        try {
          await sendLogged({
            to,
            subject: "Your onboarding link",
            text:
              `Here is a fresh link to your unfinished WDC onboarding form.\n\n${url}\n\n` +
              `It works for three days, and any earlier link you had has now stopped working.\n\n` +
              `If you did not ask for this, you can ignore it. Nothing has changed on your form.`,
            html:
              `<p>Here is a fresh link to your unfinished WDC onboarding form.</p>` +
              `<p><a href="${escapeHtml(url)}">Pick up where you left off</a></p>` +
              `<p>It works for three days, and any earlier link you had has now stopped working.</p>` +
              `<p>If you did not ask for this, you can ignore it. Nothing has changed on your form.</p>`,
            unsubscribe: false,
          }, {
            summary: "A fresh link to an unfinished onboarding form.",
            dedupeKey: secretKey("onboarding-reissue", token),
          });
        } catch {
          /* Swallowed on purpose. A failed send must not change the response,
             or the timing and the status become the oracle this route exists
             to avoid being. The outbox row records the failure. */
        }
      });
    }
  } catch {
    /* Even a database failure answers the same way. An error here that differs
       from the success case is still a signal about the address. */
  }

  return NextResponse.json(SAME_ANSWER, { headers: { "cache-control": "no-store" } });
}
