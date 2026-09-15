import { after, NextResponse, type NextRequest } from "next/server";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";
import { escapeHtml, mailIsConfigured, sendMail, sendTemplate } from "@/lib/email";
import { scopeEstimateEmail } from "@/lib/email-templates";
import { callerKey, rateLimit } from "@/lib/rate-limit";
import {
  QUESTIONS, RATE_CARD, describe, estimate, fullNaira, shortDollars, shortNaira,
  type Answers,
} from "@/lib/estimate";

/**
 * "Email me this estimate", from /tools/estimate.
 *
 * THE ANSWERS ARE POSTED, THE FIGURES ARE NOT. The browser holds the same
 * arithmetic -- `lib/estimate.ts` is pure and runs as the visitor answers --
 * and that is exactly why nothing it computed may be trusted here. A posted
 * total is a number a stranger chose, and this route puts numbers in an email
 * over the studio's name. So the answers come in, every key is checked against
 * the question set, and the estimate is computed again on this side. The worst
 * a tampered payload can now do is pick a different answer to a question we
 * asked.
 *
 * TIGHT LIMIT, BECAUSE IT SENDS MAIL. Same shape as the newsletter box rather
 * than the contact form: an enquiry costs the sender a message worth writing,
 * a "send it to me" button costs one address, so it is the one that gets
 * scripted. Three in ten minutes is more than anybody needs and far less than
 * a run wants.
 *
 * ALSO SAME CEILING, AND THE SAME REASON: this mail server's first connection
 * of an instance's life takes about 23 seconds, and a platform default
 * expiring before our own timeout fails the request AND leaves nothing saying
 * why.
 */
export const maxDuration = 60;

const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 3;

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/**
 * The posted answers, reduced to ones we actually asked for.
 *
 * Unknown questions are dropped and unknown options are dropped, so the result
 * is either a set `lib/estimate.ts` recognises or an incomplete one -- and an
 * incomplete one returns no estimate at all, which is the failure we want.
 */
function readAnswers(raw: unknown): Answers {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const answers: Answers = {};
  for (const question of QUESTIONS) {
    const picked = clean(source[question.key], 40);
    if (question.options.some((option) => option.key === picked)) {
      answers[question.key] = picked;
    }
  }
  return answers;
}

export async function POST(request: NextRequest) {
  const limit = rateLimit(callerKey(request, "tools-estimate"), LIMIT, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Please wait a few minutes before sending another copy." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  /* The honeypot, same field name and same silent success as the other two
     forms on the site. A bot that fills every input is told it worked. */
  if (clean(body.company, 200)) return NextResponse.json({ ok: true });

  const email = clean(body.email, 254).toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json(
      { error: "That does not look like an email address." },
      { status: 422 },
    );
  }

  const answers = readAnswers(body.answers);
  const result = estimate(answers);
  if (!result) {
    return NextResponse.json(
      { error: "Answer all eight questions and the estimate will be ready to send." },
      { status: 422 },
    );
  }

  /* FAIL CLOSED AND SAY SO. A button that reports success while the mail path
     is unconfigured is the exact thing the checklist forbids: a control shown
     as working before its backend is. The visitor still has the estimate on
     the page, and now has an address to send it to themselves. */
  if (!mailIsConfigured()) {
    return NextResponse.json(
      { error: `Email is being set up. Print the estimate, or send it to ${CONTACT_EMAIL} and we will reply.` },
      { status: 503 },
    );
  }

  const rangeNgn = `${shortNaira(result.ngn.low)} to ${shortNaira(result.ngn.high)}`;
  const rangeUsd = `${shortDollars(result.usd.low)} to ${shortDollars(result.usd.high)}`;
  const rows = describe(answers);

  try {
    /* THE VISITOR'S COPY IS THE AUTHORITATIVE SEND, which inverts the contact
       form and for the same underlying reason. There, the enquiry reaching the
       studio is the thing that was asked for and the receipt is a courtesy.
       Here the copy IS what the button promised, so its failure is the one the
       reader has to be told about, and the studio's notification is the one
       that goes behind the response. Two sends in series would put roughly
       forty seconds between the click and the answer. */
    await sendTemplate(
      email,
      scopeEstimateEmail({
        rangeNgn,
        rangeUsd,
        days: result.days,
        phases: result.phases.map((phase) => ({
          label: phase.label,
          range: `${shortNaira(phase.ngn.low)} to ${shortNaira(phase.ngn.high)}`,
        })),
        answers: rows,
        assumptions: result.assumptions,
        url: `${SITE_URL}/contact`,
      }),
      /* A reply goes to a person, not into the void. */
      { replyTo: process.env.SMTP_REPLY_TO || CONTACT_EMAIL },
    );

    after(async () => {
      try {
        /* THE LEAD. Written as an internal note rather than through the
           template set, like the contact form's own studio copy: it is read by
           us, it needs the exact figures rather than the rounded ones, and it
           carries the answers so whoever replies knows what was priced without
           opening anything. */
        await sendMail({
          to: process.env.SMTP_REPLY_TO || CONTACT_EMAIL,
          replyTo: email,
          subject: `Estimator: ${rangeNgn} — ${email}`,
          text: [
            `${email} asked for a copy of their estimate.`,
            "",
            `Range: ${fullNaira(result.ngn.low)} to ${fullNaira(result.ngn.high)} (${rangeUsd})`,
            `Days: ${result.days} at ${fullNaira(RATE_CARD.dayRateNgn)} a day`,
            "",
            ...rows.map((row) => `${row.question} ${row.answer}`),
          ].join("\n"),
          html:
            `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#11113a;max-width:620px">` +
            `<p style="font-size:12px;font-weight:700;letter-spacing:.12em;color:#ff6500">ESTIMATOR LEAD</p>` +
            `<h1 style="font-size:24px;margin:12px 0">${escapeHtml(rangeNgn)}</h1>` +
            `<p><b>From:</b> ${escapeHtml(email)}</p>` +
            `<p><b>Exact range:</b> ${escapeHtml(fullNaira(result.ngn.low))} to ${escapeHtml(fullNaira(result.ngn.high))} ` +
            `&middot; ${escapeHtml(String(result.days))} days</p>` +
            `<hr style="border:0;border-top:1px solid #e7e7ef">` +
            rows.map((row) => `<p style="margin:0 0 8px"><b>${escapeHtml(row.question)}</b><br>${escapeHtml(row.answer)}</p>`).join("") +
            `</div>`,
        });
      } catch (error) {
        console.error("Estimator lead failed", error instanceof Error ? error.message : "unknown error");
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Estimate email failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json(
      { error: "That did not send. The estimate is still on this page — print it, or try again in a moment." },
      { status: 502 },
    );
  }
}
