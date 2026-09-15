import { after, NextResponse, type NextRequest } from "next/server";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";
import { escapeHtml, mailIsConfigured, sendMail, sendTemplate } from "@/lib/email";
import { siteReportEmail } from "@/lib/email-templates";
import { fetchPage } from "@/lib/fetch-page";
import { findings, read } from "@/lib/seo-audit";
import { runPsi } from "@/lib/psi";
import { callerKey, rateLimit } from "@/lib/rate-limit";

/**
 * "Where should we send the full report?", from /tools/seo.
 *
 * THIS IS THE WHOLE TRICK OF THE TOOL. The reader already has every on-page
 * finding, free and instantly; what they do not have is Lighthouse, which
 * takes the better part of a minute to run. So the slow thing becomes the
 * reason to leave an address instead of a spinner nobody waits through -- and
 * because it runs behind the response, the reader is never waiting on it.
 *
 * NOTHING SHOWN IS TAKEN AWAY. The snapshot stays on the page whether or not
 * an address is given, and the mail carries it either way. That is rule 1 of
 * `docs/tools-programme.md`: the metered call is an upgrade on an answer we
 * already gave, never the answer itself.
 *
 * THE PAGE IS READ AGAIN HERE. The browser could post its findings and save a
 * fetch; it will not, because those findings would then be a stranger's text
 * inside an email over the studio's name. The URL is the only thing taken from
 * the request.
 *
 * MAXDURATION, AND THE ARITHMETIC BEHIND IT. Everything after the response is
 * still this function's time: one page fetch (6s at worst), one Lighthouse run
 * (45s at worst), one mail on a server whose first connection of an instance's
 * life takes about 23 seconds. 300 leaves room for all three with the ceiling
 * never being the thing that fails. Where a platform clamps it lower, the
 * degraded path -- no key, or a spent budget -- skips Lighthouse entirely and
 * lands well inside a minute.
 */
export const runtime = "nodejs";
export const maxDuration = 300;

/* Same shape as the newsletter box: this one costs an address, so it is the
   one that gets scripted. */
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 3;

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: NextRequest) {
  const limit = rateLimit(callerKey(request, "tools-seo-report"), LIMIT, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Please wait a few minutes before asking for another report." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (clean(body.company, 200)) return NextResponse.json({ ok: true });

  const email = clean(body.email, 254).toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "That does not look like an email address." }, { status: 422 });
  }

  const raw = clean(body.url, 2_000);
  if (!raw) return NextResponse.json({ error: "We lost the address. Run the check again." }, { status: 422 });
  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  if (!mailIsConfigured()) {
    return NextResponse.json(
      { error: `Email is being set up. Send the address to ${CONTACT_EMAIL} and we will run it by hand.` },
      { status: 503 },
    );
  }

  /* ANSWERED FIRST, WORKED AFTERWARDS. The reader is told the report is
     coming; everything slow happens once that sentence is on their screen. */
  after(async () => {
    try {
      const page = await fetchPage(url);
      if (!page.ok) {
        console.error("SEO report fetch failed", url, page.reason);
        return;
      }
      const facts = read(page.html, page.url, page.bytes);
      const list = findings(facts);

      /* THE METERED HALF, AND THE ONLY THING ON THIS SITE THAT IS. It returns
         a reason rather than throwing when the budget is spent or no key is
         configured, and the mail below simply changes shape. */
      const psi = await runPsi(page.url);

      await sendTemplate(
        email,
        siteReportEmail({
          site: page.url,
          findings: list.map((f) => ({ label: f.label, detail: f.detail })),
          scores: psi.ok ? psi.scores.map((s) => ({ label: s.label, score: s.score })) : [],
          opportunities: psi.ok ? psi.opportunities : [],
          url: `${SITE_URL}/contact`,
        }),
        { replyTo: process.env.SMTP_REPLY_TO || CONTACT_EMAIL },
      );

      /* THE LEAD, and rule 4 of the programme in practice: the day the budget
         runs out is the day this line tells somebody to run it by hand. It is
         a better outcome than the automated one, so it is written as a task
         rather than as an apology. */
      const worst = list.filter((f) => f.verdict === "missing" || f.verdict === "weak");
      await sendMail({
        to: process.env.SMTP_REPLY_TO || CONTACT_EMAIL,
        replyTo: email,
        subject: `Site report sent: ${page.url}${psi.ok ? "" : " (Lighthouse not run)"}`,
        text: [
          `${email} asked for the report on ${page.url}.`,
          "",
          psi.ok
            ? `Lighthouse: ${psi.scores.map((s) => `${s.label} ${s.score}`).join(", ")}`
            : `Lighthouse did NOT run (${psi.reason}). They have been told somebody will run it by hand — please do.`,
          "",
          `${worst.length} thing(s) worth fixing:`,
          ...worst.map((f) => `- ${f.label}: ${f.detail}`),
        ].join("\n"),
        html:
          `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#11113a;max-width:620px">` +
          `<p style="font-size:12px;font-weight:700;letter-spacing:.12em;color:#ff6500">SITE REPORT LEAD</p>` +
          `<h1 style="font-size:22px;margin:12px 0">${escapeHtml(page.url)}</h1>` +
          `<p><b>From:</b> ${escapeHtml(email)}</p>` +
          `<p><b>Lighthouse:</b> ${psi.ok
            ? escapeHtml(psi.scores.map((s) => `${s.label} ${s.score}`).join(", "))
            : `did not run (${escapeHtml(psi.reason)}) &mdash; they were told a person would run it, so please do`}</p>` +
          `<hr style="border:0;border-top:1px solid #e7e7ef">` +
          worst.map((f) => `<p style="margin:0 0 8px"><b>${escapeHtml(f.label)}</b><br>${escapeHtml(f.detail)}</p>`).join("") +
          `</div>`,
      });
    } catch (error) {
      console.error("SEO report failed", error instanceof Error ? error.message : "unknown error");
    }
  });

  return NextResponse.json({ ok: true });
}
