import { after, NextRequest, NextResponse } from "next/server";
import { assignSerial } from "@/lib/forms/serial";
import { CONTACT_EMAIL } from "@/lib/site";
import { composeEmailHtml, emailPanel, onboardingNextStepsEmail } from "@/lib/email-templates";
import { sendLogged } from "@/lib/outbox";
import { SERVICES } from "@/lib/services";
import { callerKey, rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db/pool";
import { problemWith, stepsFor, type Field } from "@/lib/onboarding";
import {
  cleanAnswers, cleanService, clearOnboardingCookie, cookieToken, draftFromToken,
  normalizeEmail, requestOriginIsAllowed,
} from "@/lib/onboarding-server";

type Answers = Record<string, string | string[]>;

function isVisible(field: Field, answers: Answers) {
  if (!field.showIf) return true;
  const value = answers[field.showIf.key];
  return Array.isArray(value)
    ? value.some((item) => field.showIf!.equals.includes(item))
    : typeof value === "string" && field.showIf.equals.includes(value);
}

export async function POST(request: NextRequest) {
  if (!requestOriginIsAllowed(request)) {
    return NextResponse.json({ error: "This request could not be verified." }, { status: 403 });
  }

  /* Finishing an onboarding form is a once-per-project event. Five in ten
     minutes leaves room for a client who hits a validation error and resubmits
     a few times, and nothing like enough for a script. */
  const limit = rateLimit(callerKey(request, "onboarding-submit"), 5, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "That form has been submitted several times already. Give it a minute." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "The submission could not be read." }, { status: 400 }); }

  const service = cleanService(body.service);
  const answers = cleanAnswers(body.answers);
  if (!service || !answers) {
    return NextResponse.json({ error: "Please check the form details and try again." }, { status: 422 });
  }

  const problems = stepsFor(service).flatMap((step) =>
    step.fields
      .filter((field) => isVisible(field, answers))
      .map((field) => ({ key: field.key, message: problemWith(field, answers[field.key]) }))
      .filter((problem): problem is { key: string; message: string } => problem.message !== null),
  );
  if (problems.length) {
    return NextResponse.json({ error: "Some questions still need attention.", problems }, { status: 422 });
  }

  const token = cookieToken(request);
  const draft = token ? await draftFromToken(token) : null;
  if (!draft) {
    return NextResponse.json({ error: "Save this form before submitting it." }, { status: 401 });
  }
  if (draft.status === "submitted") {
    return NextResponse.json({ ok: true, submissionId: draft.id, alreadySubmitted: true });
  }

  const email = normalizeEmail(answers.email) ?? draft.email;
  const result = await db.query<{ id: string }>(`
    UPDATE onboarding_submissions
    SET service = $2, status = 'submitted', current_step = 4,
        answers = $3::JSONB, email = COALESCE($4, email), updated_at = now(), submitted_at = now()
    WHERE id = $1 AND status = 'in_progress'
    RETURNING id
  `, [draft.id, service, JSON.stringify(answers), email]);
  if (!result.rows[0]) {
    return NextResponse.json({ error: "This form could not be submitted again." }, { status: 409 });
  }

  const submissionId = result.rows[0].id;
  /* "Brief #12", counted per service. */
  await assignSerial("onboarding_submissions", `onboarding-${service}`, submissionId);

  /* THE THANK-YOU AND THE STUDIO'S NOTICE, BEHIND THE RESPONSE. The row above
     is the submission; both mails are about it, and neither is worth making a
     client watch a 23-second handshake for. The dedupe key is the submission,
     so a double-click that races past the status check still sends once. */
  const first = typeof answers.first_name === "string" ? answers.first_name.trim() : "";
  const last = typeof answers.last_name === "string" ? answers.last_name.trim() : "";
  const company = typeof answers.company === "string" ? answers.company.trim() : "";
  const serviceName = SERVICES.find((s) => s.slug === service)?.name ?? service;
  after(async () => {
    if (email) {
      try {
        await sendLogged(
          { to: email, ...onboardingNextStepsEmail({ name: first || "there", service: serviceName, company: company || undefined }) },
          { summary: `Next steps after the ${serviceName} brief.`, dedupeKey: `onboarding-next-steps:${submissionId}` },
        );
      } catch (error) {
        console.error("Onboarding next-steps email failed", error instanceof Error ? error.message : "unknown error");
      }
    }
    try {
      const who = [first, last].filter(Boolean).join(" ") || "A client";
      await sendLogged({
        to: process.env.SMTP_REPLY_TO || CONTACT_EMAIL,
        replyTo: email ?? undefined,
        subject: `Onboarding brief: ${serviceName}${company ? ` for ${company}` : ""}`,
        text: `${who}${email ? ` <${email}>` : ""} submitted the ${serviceName} onboarding form.\nSubmission ${submissionId}.`,
        html: composeEmailHtml({
          title: `Onboarding brief: ${serviceName}`,
          preheader: `${who} submitted the ${serviceName} onboarding form.`,
          heading: `New ${serviceName} brief`,
          blocks: [
            emailPanel([["From", who], ...(email ? [["Email", email] as [string, string]] : []), ...(company ? [["Company", company] as [string, string]] : []), ["Submission", submissionId]]),
          ],
        }),
      }, { summary: `${who} submitted the ${serviceName} brief.`, dedupeKey: `onboarding-notice:${submissionId}` });
    } catch (error) {
      console.error("Onboarding notice failed", error instanceof Error ? error.message : "unknown error");
    }
  });

  const response = NextResponse.json({ ok: true, submissionId });
  clearOnboardingCookie(response);
  return response;
}
