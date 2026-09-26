import { after, NextRequest, NextResponse } from "next/server";
import { hydrateSettings } from "@/lib/settings/store";
import { formByKey } from "@/lib/forms/registry";
import { hasBlockedWord } from "@/lib/forms/settings";
import { availability, getFormSettings } from "@/lib/forms/settings-db";
import { confirmation, sendFormEmail } from "@/lib/forms/notify";
import { formEmail, type FormEmailData } from "@/lib/forms/emails";
import { randomUUID } from "node:crypto";
import { mailIsConfigured } from "@/lib/email";
import { enquiriesAreConfigured, saveEnquiry, settleEnquiry } from "@/lib/enquiries";
import { callerKey, rateLimit } from "@/lib/rate-limit";
import { REFUSED_EMAIL_MESSAGE, refusedEmail } from "@/lib/email-domains";

/* THE PLATFORM MUST NOT CUT THE SEND OFF BEFORE OUR OWN TIMEOUTS DO.

   This mail server's first connection of an instance's life is slow, and the
   transport now waits up to 30 seconds for it. Without a stated ceiling here
   the function's default could expire first, which fails the enquiry AND
   leaves nothing in the log to say why. */
export const maxDuration = 60;

const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 5;
function clean(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }

export async function POST(request: NextRequest) {
  /* Studio notices go to "Replies go to" from Settings, Email. */
  await hydrateSettings();
  /* Moved onto the shared limiter, which sweeps. The old local Map never
     removed anything, so a long-lived instance kept one array per distinct
     address for its entire life. */
  const limit = rateLimit(callerKey(request, "contact"), LIMIT, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Please wait a few minutes before trying again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (clean(body.company, 200)) return NextResponse.json({ ok: true });

  const first = clean(body.first, 80), last = clean(body.last, 80);
  const email = clean(body.email, 320).toLowerCase();
  const phone = clean(body.phone, 40), topic = clean(body.topic, 120), message = clean(body.message, 5_000);
  if (!first || !last || !topic || message.length < 10 || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Please complete all required fields with valid details." }, { status: 422 });
  }
  if (refusedEmail(email)) return NextResponse.json({ error: REFUSED_EMAIL_MESSAGE, field: "email" }, { status: 422 });
  /* THE FORM'S OWN SETTINGS, checked here rather than only on the page, so a
     closed form refuses the POST as well as the visit. A blocked word does
     not refuse: the enquiry is kept in Spam, the visitor is thanked as usual,
     and nobody is emailed about it. */
  const form = formByKey("contact")!;
  const settings = await getFormSettings(form);
  const open = await availability(form, settings);
  if (!open.open) return NextResponse.json({ error: open.message, closed: true }, { status: 403 });
  const spam = hasBlockedWord(settings.blockedWords, first, last, email, topic, message);
  const tokens = { first_name: first, topic };

  /* STORED FIRST, WHEN THERE IS SOMEWHERE TO STORE IT. With a row, the
     enquiry exists whatever the mail server does next, so the visitor is
     answered straight away and both emails go behind the response. Without
     a database this falls back to the old path, where the studio's copy is
     the only record and so has to succeed before we say thanks. */
  const storable = enquiriesAreConfigured();
  if (!storable && !mailIsConfigured()) {
    return NextResponse.json({ error: "Email delivery is being configured. Please email us directly for now." }, { status: 503 });
  }

  const name = `${first} ${last}`;

  let enquiryId: string | null = null;
  let serial: number | null = null;
  if (storable) {
    try {
      ({ id: enquiryId, serial } = await saveEnquiry({ firstName: first, lastName: last, email, phone, topic, message, box: spam ? "spam" : "inbox" }));
    } catch (error) {
      console.error("Contact enquiry could not be stored", error instanceof Error ? error.message : "unknown error");
      if (!mailIsConfigured()) {
        return NextResponse.json({ error: "Your message could not be sent right now. Please try again or email us directly." }, { status: 502 });
      }
    }
  }
  if (spam && enquiryId) {
    await settleEnquiry(enquiryId, "skipped", "Held as spam by the form's blocked words.").catch(() => {});
    return NextResponse.json({ ok: true, confirmation: confirmation(settings, tokens) });
  }
  const eventId = enquiryId ?? randomUUID();
  const studioTokens = { ...tokens, serial: serial ? String(serial) : "" };
  const data: FormEmailData = { id: enquiryId ?? "", serial, first, last, email, phone, company: "", topic, message, source: "" };
  const studioCopy = formEmail(form, "studio-notice", data)!;
  const log = { summary: `Enquiry from ${name} about ${topic}.`, dedupeKey: `enquiry:${eventId}` };

  /* THE RECEIPT IS SENT AFTER THE RESPONSE, ALWAYS.

     The enquiry reaching the studio is the authoritative success; the copy
     to the visitor is a courtesy, and its failure must never tell them to
     resubmit and create a duplicate enquiry.

     This mail server is slow: measured at about 23 seconds just to complete
     the TLS handshake and authenticate, from two different networks. `after`
     runs the receipt once the response has already gone, so the visitor is
     never waiting on the courtesy. The real fix is a transactional mail
     provider; this is the honest interim. */
  const sendReceipt = async () => {
    try {
      await sendFormEmail(form, settings, "receipt",
        formEmail(form, "receipt", data)!,
        { summary: `Receipt for an enquiry about ${topic}.`, dedupeKey: `enquiry-receipt:${eventId}` },
        tokens,
      );
    } catch (receiptError) {
      console.error("Contact receipt failed", receiptError instanceof Error ? receiptError.message : "unknown error");
    }
  };

  if (enquiryId) {
    const stored = enquiryId;
    after(async () => {
      try {
        const sent = await sendFormEmail(form, settings, "studio-notice", studioCopy, log, studioTokens, stored);
        await settleEnquiry(stored, sent === "skipped" ? "skipped" : "sent", sent === "skipped" ? "Switched off in the form's settings." : undefined);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "unknown error";
        console.error("Contact email failed", reason);
        /* The enquiry is safe in the table; the row says the notice did not go
           so the admin can see it rather than the studio never hearing. */
        await settleEnquiry(stored, "failed", reason).catch(() => {});
      }
      await sendReceipt();
    });
    return NextResponse.json({ ok: true, confirmation: confirmation(settings, tokens) });
  }

  try {
    await sendFormEmail(form, settings, "studio-notice", studioCopy, log, studioTokens);
    after(sendReceipt);
    return NextResponse.json({ ok: true, confirmation: confirmation(settings, tokens) });
  } catch (error) {
    console.error("Contact email failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Your message could not be sent right now. Please try again or email us directly." }, { status: 502 });
  }
}
