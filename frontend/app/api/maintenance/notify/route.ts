import { NextRequest, NextResponse } from "next/server";
import { maintenance } from "@/lib/maintenance";
import { joinWaitlist, REASONS, setWaitlistReason, waitlistIsConfigured, type Reason } from "@/lib/maintenance-waitlist";
import { looksLikeEmail, normaliseEmail } from "@/lib/newsletter";
import { callerKey, rateLimit } from "@/lib/rate-limit";
import { CONTACT_EMAIL } from "@/lib/site";
import { REFUSED_EMAIL_MESSAGE, refusedEmail } from "@/lib/email-domains";

/**
 * "Notify me" on the maintenance page, and its optional follow-up question.
 *
 * Nothing is sent from here. The row is the promise; the one email goes out
 * when maintenance is switched off (lib/maintenance-waitlist.ts), so a
 * sign-up costs one INSERT and never waits on the mail server.
 *
 * RATE LIMITS BELONG TO THE ACTION. Signing up is the path worth scripting,
 * so it gets the tight limit; answering "what brings you here" is a tap on a
 * row that already exists, so it gets a loose one. Both are one instance's
 * memory (lib/rate-limit.ts): abuse control, not a quota.
 *
 * FAILS CLOSED ON ORIGIN. A browser posting from this page sends an Origin
 * header naming this host; a request with none, or another, is refused. The
 * page and this route are the same site, so nothing legitimate is lost.
 */
const JOIN = { limit: 5, windowMs: 10 * 60 * 1000 };
const REASON = { limit: 30, windowMs: 10 * 60 * 1000 };

function clean(v: unknown, max: number) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === (request.headers.get("x-forwarded-host") || request.headers.get("host"));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const asking = "reason" in body;
  const rule = asking ? REASON : JOIN;
  const limit = rateLimit(callerKey(request, asking ? "maintenance-reason" : "maintenance-notify"), rule.limit, rule.windowMs);
  if (!limit.ok) {
    return NextResponse.json({ error: "Please wait a few minutes before trying again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  }

  /* The honeypot: a bot that fills every field is told it worked, and nothing is written. */
  if (clean(body.company, 200)) return NextResponse.json({ ok: true });

  const typed = clean(body.email, 254);
  if (!looksLikeEmail(normaliseEmail(typed))) {
    return NextResponse.json({ error: "That does not look like an email address." }, { status: 422 });
  }
  if (refusedEmail(typed)) return NextResponse.json({ error: REFUSED_EMAIL_MESSAGE }, { status: 422 });

  const m = await maintenance();
  if (!m.on || !m.since) return NextResponse.json({ error: "The site is back, so there is nothing to wait for." }, { status: 409 });
  if (!waitlistIsConfigured()) {
    return NextResponse.json({ error: `We cannot take addresses just now. Email ${CONTACT_EMAIL} and we will tell you ourselves.` }, { status: 503 });
  }

  try {
    if (asking) {
      const r = clean(body.reason, 20);
      const reason = (REASONS as readonly string[]).includes(r) ? (r as Reason) : null;
      if (r && !reason) return NextResponse.json({ error: "Unknown answer." }, { status: 422 });
      await setWaitlistReason(typed, reason, m.since);
    } else {
      await joinWaitlist(typed, m.since);
    }
  } catch (error) {
    console.error("Maintenance notify failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "We could not save that just now. Please try again shortly." }, { status: 502 });
  }
  /* One answer whether the address was new or already on the list: this box
     must not tell a stranger who else is waiting. */
  return NextResponse.json({ ok: true });
}
