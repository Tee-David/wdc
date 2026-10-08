import { after, NextRequest, NextResponse } from "next/server";
import { hydrateSettings } from "@/lib/settings/store";
import { formByKey } from "@/lib/forms/registry";
import { getFormSettings } from "@/lib/forms/settings-db";
import { sendFormEmail } from "@/lib/forms/notify";
import { formEmail } from "@/lib/forms/emails";
import { unsubscribeUrl } from "@/lib/newsletter";
import { confirmSubscription } from "@/lib/newsletter-doi";
import { callerKey, rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

const page = (title: string, body: string, status = 200) =>
  new NextResponse(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title>
<body style="font:16px/1.6 system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1rem;color:#0e0e2c"><h1 style="font-size:1.5rem">${title}</h1><p>${body}</p><p><a href="/" style="color:#c95000">Back to the site</a></p>`,
    { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  );

/**
 * The link in the confirmation email. GET is safe to open twice (the pending
 * row is gone after the first, so a second open says so), and it never
 * subscribes anybody who did not hold the token.
 */
export async function GET(request: NextRequest) {
  if (!rateLimit(callerKey(request, "newsletter-confirm"), 20, 10 * 60 * 1000).ok) return page("Please wait", "Too many tries. Give it a few minutes.", 429);
  await hydrateSettings();
  const email = request.nextUrl.searchParams.get("e") ?? "";
  const token = request.nextUrl.searchParams.get("t") ?? "";
  const out = await confirmSubscription(email, token);
  if (!out.ok) return page("That link did not work", "It may have expired, or already been used. If you are not on the list yet, sign up again from the footer of the site.", 400);

  const form = formByKey("newsletter")!;
  const settings = await getFormSettings(form);
  const base = { id: "", serial: null, first: "", last: "", email: out.email, phone: "", company: "", topic: "", message: "", source: out.source };
  after(async () => {
    try {
      const link = unsubscribeUrl(out.email) ?? undefined;
      const welcome = formEmail(form, "welcome", base, { unsubscribeUrl: link })!;
      await sendFormEmail(form, settings, "welcome", { ...welcome, unsubscribeUrl: link }, {
        summary: `Welcome to the newsletter, confirmed from the ${out.source}.`, dedupeKey: `newsletter-welcome:${out.email}:${new Date().toISOString().slice(0, 10)}`,
      }, { email: out.email });
      await sendFormEmail(form, settings, "studio-notice", formEmail(form, "studio-notice", base)!, {
        summary: `New confirmed subscriber from the ${out.source}.`, dedupeKey: `newsletter-notice:${out.email}:${new Date().toISOString().slice(0, 10)}`,
      }, { email: out.email });
    } catch (error) { console.error("Newsletter welcome failed", error instanceof Error ? error.message : "unknown"); }
  });
  return page("You are subscribed", "Thank you for confirming. A welcome note is on its way, and every email has an unsubscribe link.");
}
