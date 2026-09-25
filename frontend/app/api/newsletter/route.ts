import { after, NextRequest, NextResponse } from "next/server";
import { formByKey } from "@/lib/forms/registry";
import { availability, getFormSettings } from "@/lib/forms/settings-db";
import { confirmation, sendFormEmail } from "@/lib/forms/notify";
import { formEmail } from "@/lib/forms/emails";
import { CONTACT_EMAIL } from "@/lib/site";
import { looksLikeEmail, newsletterIsConfigured, normaliseEmail, subscribe, unsubscribeUrl } from "@/lib/newsletter";
import { callerKey, rateLimit } from "@/lib/rate-limit";

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

     Nothing is sent for a repeat submission. Pressing the button twice should
     not produce two welcomes, and the studio should not be told twice about
     one subscriber. */
  if (result.kind === "added") {
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

  /* ONE ANSWER FOR BOTH OUTCOMES. "You are already subscribed" would turn this
     box into a way of testing whether a given person is on our list, which is
     not something a stranger is owed about somebody else. */
  return NextResponse.json({ ok: true, confirmation: confirmation(settings, {}) });
}
