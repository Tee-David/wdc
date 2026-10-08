import { after, NextRequest, NextResponse } from "next/server";
import { hydrateSettings } from "@/lib/settings/store";
import { formByKey } from "@/lib/forms/registry";
import { availability, getFormSettings } from "@/lib/forms/settings-db";
import { confirmation, sendFormEmail } from "@/lib/forms/notify";
import { formEmail } from "@/lib/forms/emails";
import { CONTACT_EMAIL } from "@/lib/site";
import { looksLikeEmail, newsletterIsConfigured, normaliseEmail, subscribe, unsubscribeUrl } from "@/lib/newsletter";
import { callerKey, rateLimit } from "@/lib/rate-limit";
import { REFUSED_EMAIL_MESSAGE, refusedEmail } from "@/lib/email-domains";
import { requestConfirmation } from "@/lib/newsletter-doi";
import { newsletterConfirmEmail } from "@/lib/email-templates";
import { sendLogged } from "@/lib/outbox";
import { SITE_URL } from "@/lib/site";

/* Same ceiling and the same reason as the contact route: this mail server's
   first connection of an instance's life takes about 23 seconds, and a
   platform default expiring before our own timeout fails the request AND
   leaves nothing saying why. The subscribe itself is a single INSERT; it is
   the courtesy mail behind the response that needs the room. */
export const maxDuration = 60;

/* TIGHTER THAN THE CONTACT FORM, because the shapes of abuse differ. An
   enquiry costs the sender a message worth writing; a subscribe box costs one
   address, so it is the one that gets scripted. Three in ten minutes is more
   than any real person needs and far less than a list-poisoning run wants.

   Worth saying plainly, as lib/rate-limit.ts does: this is a sliding window in
   ONE instance's memory. On a platform running several, the real ceiling is
   this times the number of warm instances, and a cold start forgives
   everything. It is abuse control, not a quota. */
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 3;

const SOURCES = new Set(["footer"]);

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: NextRequest) {
  /* Studio notices go to "Replies go to" from Settings, Email. */
  await hydrateSettings();
  const limit = rateLimit(callerKey(request, "newsletter"), LIMIT, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Please wait a few minutes before trying again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  /* The honeypot, the same field name and the same silent success the contact
     form uses. A bot that fills every input is told it worked and nothing is
     written; telling it the truth only improves the next attempt. */
  if (clean(body.company, 200)) return NextResponse.json({ ok: true });

  const typed = clean(body.email, 254);
  const email = normaliseEmail(typed);
  if (!looksLikeEmail(email)) {
    return NextResponse.json(
      { error: "That does not look like an email address." },
      { status: 422 },
    );
  }
  if (refusedEmail(email)) return NextResponse.json({ error: REFUSED_EMAIL_MESSAGE }, { status: 422 });

  /* THE SOURCE IS CHOSEN FROM A LIST, never taken as typed. It is written to a
     row the studio reads and, further down, interpolated into a mail; a field
     the browser controls has no business doing either. An unknown value is not
     worth failing a subscription over, so it falls back. */
  const wanted = clean(body.source, 40);
  const source = SOURCES.has(wanted) ? wanted : "footer";

  /* FAIL CLOSED, AND SAY SO. A subscribe box reporting success while the list
     it writes to is unreachable is the exact thing the checklist forbids: a
     control shown as working before its backend is. The visitor gets an
     address they can use instead of a lie. */
  if (!newsletterIsConfigured()) {
    return NextResponse.json(
      { error: `Subscriptions are being set up. Email ${CONTACT_EMAIL} and we will add you.` },
      { status: 503 },
    );
  }

  /* Closed in the form's settings refuses here, not only on the page. */
  const form = formByKey("newsletter")!;
  const settings = await getFormSettings(form);
  const open = await availability(form, settings);
  if (!open.open) return NextResponse.json({ error: open.message, closed: true }, { status: 403 });

  /* DOUBLE OPT-IN FIRST: the address waits until its owner presses the link we
     mail. If the table for it is not there yet (migration 0042), the old
     immediate path below still works, so the form never breaks. */
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 64) || null;
  const pending = await requestConfirmation(typed, source, ip);
  if (pending.kind === "already") {
    return NextResponse.json({ ok: true, status: "already", confirmation: { message: "You are already on the list, so there is nothing more to do." } });
  }
  if (pending.kind === "wait") {
    return NextResponse.json({ ok: true, status: "pending", confirmation: { message: "We sent you a confirmation a moment ago. Check your inbox (and spam) and press the link." } });
  }
  if (pending.kind === "sent") {
    const url = new URL("/api/newsletter/confirm", SITE_URL);
    url.searchParams.set("e", email);
    url.searchParams.set("t", pending.token);
    after(async () => {
      try {
        const mail = newsletterConfirmEmail({ url: url.toString(), hours: 48 });
        await sendLogged({ to: email, ...mail }, { summary: "Newsletter confirmation (double opt-in).", dedupeKey: `newsletter-confirm:${email}:${pending.token.slice(0, 8)}` });
      } catch (error) { console.error("Newsletter confirmation failed", error instanceof Error ? error.message : "unknown"); }
    });
    return NextResponse.json({ ok: true, status: "pending", confirmation: { message: "Almost done. We sent you an email: press the link in it to join the list." } });
  }

  let result;
  try {
    result = await subscribe(typed, source);
  } catch (error) {
    console.error("Newsletter subscribe failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json(
      { error: "We could not save that just now. Please try again shortly." },
      { status: 502 },
    );
  }

  /* THE ROW IS THE SUBSCRIPTION; the two mails are courtesies. Both go behind
     the response, because a mail server that takes 23 seconds to authenticate
     must never be what a visitor waits on, and because a failed courtesy must
     never tell somebody the subscription did not happen when it did.

     Nothing is sent for somebody already on the list. Pressing the button twice
     should not produce two welcomes, and the studio should not be told twice
     about one subscriber. Somebody coming BACK after unsubscribing is welcomed
     like a new subscriber. */
  if (result.kind === "added" || result.kind === "returned") {
    const base = { id: "", serial: null, first: "", last: "", email, phone: "", company: "", topic: "", message: "", source };
    after(async () => {
      try {
        const unsubscribeLink = unsubscribeUrl(email) ?? undefined;
        const welcome = formEmail(form, "welcome", { ...base, email }, { unsubscribeUrl: unsubscribeLink })!;
        await sendFormEmail(form, settings, "welcome", { ...welcome, unsubscribeUrl: unsubscribeLink }, {
          summary: `Welcome to the newsletter, from the ${source}.`,
          /* The day is in the key: one welcome per address per day, however
             many times the button is pressed, and a returning subscriber next
             month still gets one. */
          dedupeKey: `newsletter-welcome:${email}:${new Date().toISOString().slice(0, 10)}`,
        }, { email });
      } catch (welcomeError) {
        console.error("Newsletter welcome failed", welcomeError instanceof Error ? welcomeError.message : "unknown error");
      }

      try {
        await sendFormEmail(form, settings, "studio-notice", formEmail(form, "studio-notice", { ...base, email, source })!, {
          summary: `New subscriber from the ${source}.`,
          dedupeKey: `newsletter-notice:${email}:${new Date().toISOString().slice(0, 10)}`,
        }, { email });
      } catch (noticeError) {
        console.error("Newsletter notice failed", noticeError instanceof Error ? noticeError.message : "unknown error");
      }
    });
  }

  /* THE ANSWER SAYS WHICH IT WAS (the owner's call, 2026-10-05): somebody who
     types an address that is already on the list is told so, rather than
     thanked for subscribing twice. The studio's own confirmation words, when it
     has set some, are for a new subscriber. See SubscribeResult for the cost. */
  const status = result.kind;
  return NextResponse.json({
    ok: true,
    status,
    confirmation:
      status === "already"
        ? { message: "You are already on the list, so there is nothing more to do." }
        : status === "returned"
          ? { message: "Welcome back. You are on the list again." }
          : confirmation(settings, {}),
  });
}
