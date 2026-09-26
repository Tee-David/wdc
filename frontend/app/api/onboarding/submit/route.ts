import { after, NextRequest, NextResponse } from "next/server";
import { hydrateSettings } from "@/lib/settings/store";
import { onboardingFormFor } from "@/lib/forms/registry";
import { hasBlockedWord } from "@/lib/forms/settings";
import { availability, getFormSettings } from "@/lib/forms/settings-db";
import { confirmation, sendFormEmail } from "@/lib/forms/notify";
import { formEmail, type FormEmailData } from "@/lib/forms/emails";
import { assignSerial } from "@/lib/forms/serial";
import { SERVICES } from "@/lib/services";
import { callerKey, rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db/pool";
import { problemWith, stepsFor, type Field } from "@/lib/onboarding";
import {
  cleanAnswers, cleanService, clearOnboardingCookie, cookieToken, draftFromToken,
  normalizeEmail, requestOriginIsAllowed,
} from "@/lib/onboarding-server";
import { REFUSED_EMAIL_MESSAGE, refusedEmail } from "@/lib/email-domains";

type Answers = Record<string, string | string[]>;

function isVisible(field: Field, answers: Answers) {
  if (!field.showIf) return true;
  const value = answers[field.showIf.key];
  return Array.isArray(value)
    ? value.some((item) => field.showIf!.equals.includes(item))
    : typeof value === "string" && field.showIf.equals.includes(value);
}

export async function POST(request: NextRequest) {
  /* Studio notices go to "Replies go to" from Settings, Email. */
  await hydrateSettings();
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

  /* THE FORM'S SETTINGS. A brief already started may still be sent when the
     form is closed (closing pauses NEW briefs, as the settings screen says),
     but not past an entry limit. A blocked word keeps the brief, in Spam,
     and sends nothing about it. */
  const form = onboardingFormFor(service)!;
  const settings = await getFormSettings(form);
  const open = await availability(form, settings);
  if (!open.open && open.reason === "limit") return NextResponse.json({ error: open.message, closed: true }, { status: 403 });
  const spam = hasBlockedWord(settings.blockedWords, ...Object.values(answers).flat().map(String));

  const token = cookieToken(request);
  const draft = token ? await draftFromToken(token) : null;
  if (!draft) {
    return NextResponse.json({ error: "Save this form before submitting it." }, { status: 401 });
  }
  if (draft.status === "submitted") {
    return NextResponse.json({ ok: true, submissionId: draft.id, alreadySubmitted: true });
  }

  const email = normalizeEmail(answers.email) ?? draft.email;
  if (email && refusedEmail(email)) return NextResponse.json({ error: REFUSED_EMAIL_MESSAGE, field: "email" }, { status: 422 });
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
  const serial = await assignSerial("onboarding_submissions", `onboarding-${service}`, submissionId);
  const first0 = typeof answers.first_name === "string" ? answers.first_name.trim() : "";
  const tokens = { first_name: first0, service: SERVICES.find((s) => s.slug === service)?.short ?? service };
  if (spam) {
    await db.query("UPDATE onboarding_submissions SET box = 'spam', box_at = now() WHERE id = $1", [submissionId]).catch(() => {});
    const held = NextResponse.json({ ok: true, submissionId, confirmation: confirmation(settings, tokens) });
    clearOnboardingCookie(held);
    return held;
  }

  /* THE THANK-YOU AND THE STUDIO'S NOTICE, BEHIND THE RESPONSE. The row above
     is the submission; both mails are about it, and neither is worth making a
     client watch a 23-second handshake for. The dedupe key is the submission,
     so a double-click that races past the status check still sends once. */
  const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const data: FormEmailData = {
    id: submissionId, serial, first: text(answers.first_name), last: text(answers.last_name), email: email ?? "",
    phone: text(answers.phone), company: text(answers.company), topic: "", message: "", source: "",
  };
  const serviceName = SERVICES.find((s) => s.slug === service)?.name ?? service;
  after(async () => {
    const next = formEmail(form, "next-steps", data);
    if (next) {
      try {
        await sendFormEmail(form, settings, "next-steps", next,
          { summary: `Next steps after the ${serviceName} brief.`, dedupeKey: `onboarding-next-steps:${submissionId}` },
          tokens,
        );
      } catch (error) {
        console.error("Onboarding next-steps email failed", error instanceof Error ? error.message : "unknown error");
      }
    }
    try {
      const who = [data.first, data.last].filter(Boolean).join(" ") || "A client";
      await sendFormEmail(form, settings, "studio-notice", formEmail(form, "studio-notice", data)!,
        { summary: `${who} submitted the ${serviceName} brief.`, dedupeKey: `onboarding-notice:${submissionId}` },
        { ...tokens, company: data.company, serial: serial ? String(serial) : "" });
    } catch (error) {
      console.error("Onboarding notice failed", error instanceof Error ? error.message : "unknown error");
    }
  });

  const response = NextResponse.json({ ok: true, submissionId, confirmation: confirmation(settings, tokens) });
  clearOnboardingCookie(response);
  return response;
}
