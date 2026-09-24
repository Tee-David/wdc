import { after, NextRequest, NextResponse } from "next/server";
import { CONTACT_EMAIL } from "@/lib/site";
import { randomUUID } from "node:crypto";
import { escapeHtml, mailIsConfigured } from "@/lib/email";
import { enquiriesAreConfigured, saveEnquiry, settleEnquiry } from "@/lib/enquiries";
import { sendLogged } from "@/lib/outbox";
import { enquiryReceiptEmail } from "@/lib/email-templates";
import { callerKey, rateLimit } from "@/lib/rate-limit";

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
  const detailText = [`Name: ${name}`, `Email: ${email}`, phone ? `Phone: ${phone}` : null, `About: ${topic}`, "", message].filter(Boolean).join("\n");
  const studioCopy = {
    to: process.env.SMTP_REPLY_TO || CONTACT_EMAIL, replyTo: email,
    subject: `Website enquiry: ${topic}`, text: detailText,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#11113a;max-width:620px"><p style="font-size:12px;font-weight:700;letter-spacing:.12em;color:#c95000">NEW WEBSITE ENQUIRY</p><h1 style="font-size:26px;margin:12px 0">${escapeHtml(topic)}</h1><p><b>From:</b> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>${phone ? `<p><b>Phone:</b> ${escapeHtml(phone)}</p>` : ""}<hr style="border:0;border-top:1px solid #e7e7ef"><p>${escapeHtml(message).replace(/\n/g, "<br>")}</p></div>`,
  };

  let enquiryId: string | null = null;
  if (storable) {
    try {
      enquiryId = await saveEnquiry({ firstName: first, lastName: last, email, phone, topic, message });
    } catch (error) {
      console.error("Contact enquiry could not be stored", error instanceof Error ? error.message : "unknown error");
      if (!mailIsConfigured()) {
        return NextResponse.json({ error: "Your message could not be sent right now. Please try again or email us directly." }, { status: 502 });
      }
    }
  }
  const eventId = enquiryId ?? randomUUID();
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
      await sendLogged(
        { to: email, ...enquiryReceiptEmail({ firstName: first, topic }) },
        { summary: `Receipt for an enquiry about ${topic}.`, dedupeKey: `enquiry-receipt:${eventId}` },
      );
    } catch (receiptError) {
      console.error("Contact receipt failed", receiptError instanceof Error ? receiptError.message : "unknown error");
    }
  };

  if (enquiryId) {
    const stored = enquiryId;
    after(async () => {
      try {
        await sendLogged(studioCopy, log);
        await settleEnquiry(stored, "sent");
      } catch (error) {
        const reason = error instanceof Error ? error.message : "unknown error";
        console.error("Contact email failed", reason);
        /* The enquiry is safe in the table; the row says the notice did not go
           so the admin can see it rather than the studio never hearing. */
        await settleEnquiry(stored, "failed", reason).catch(() => {});
      }
      await sendReceipt();
    });
    return NextResponse.json({ ok: true });
  }

  try {
    await sendLogged(studioCopy, log);
    after(sendReceipt);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Contact email failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Your message could not be sent right now. Please try again or email us directly." }, { status: 502 });
  }
}
