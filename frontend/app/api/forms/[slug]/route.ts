import { after, NextRequest, NextResponse } from "next/server";
import { requestOriginIsAllowed } from "@/lib/onboarding-server";
import { callerKey, rateLimit } from "@/lib/rate-limit";
import { customFormBySlug, saveCustomEntry, toFormDef, answerLines } from "@/lib/forms/custom";
import { checkAnswers, whoFrom } from "@/lib/forms/custom-def";
import { availability, getFormSettings } from "@/lib/forms/settings-db";
import { hasBlockedWord } from "@/lib/forms/settings";
import { sendFormEmail } from "@/lib/forms/notify";
import { composeEmailHtml, emailButton, emailPanel } from "@/lib/email-templates";
import { studioInbox } from "@/lib/email";
import { hydrateSettings } from "@/lib/settings/store";
import { SITE_URL } from "@/lib/site";

/**
 * AN ENTRY TO A FORM BUILT IN THE ADMIN.
 *
 * Fails closed: no origin, the wrong origin, a closed form, or answers that do
 * not pass the form's own rules are refused before anything is written. Every
 * answer is checked again here with the same rules the page used
 * (lib/forms/custom-def.ts); a file answer must be one this form's upload
 * route signed. The studio's notice goes behind the response, with its row
 * written first (lib/outbox.ts), and can be switched off in the form's
 * settings like every other form's.
 *
 * Rate limit: per caller, in one instance's memory (lib/rate-limit.ts). Abuse
 * control, not a quota.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!requestOriginIsAllowed(request)) return NextResponse.json({ error: "This request could not be verified." }, { status: 403 });
  const limit = rateLimit(callerKey(request, "custom-form"), 8, 10 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: "Too many sends. Give it a few minutes." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });

  const { slug } = await params;
  const row = await customFormBySlug(slug).catch(() => null);
  if (!row || !row.published || row.status !== "live") return NextResponse.json({ error: "This form is not taking entries." }, { status: 404 });
  const form = toFormDef(row);
  const settings = await getFormSettings(form);
  const open = await availability(form, settings);
  if (!open.open) return NextResponse.json({ error: open.message || "This form is not taking entries right now." }, { status: 409 });

  let body: { answers?: unknown; website?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "The answers could not be read." }, { status: 400 }); }
  /* The hidden field only a bot fills in: thanked, and dropped. */
  if (typeof body.website === "string" && body.website.trim()) return NextResponse.json({ ok: true, message: row.published.successMessage });

  const def = row.published;
  const { answers, errors } = checkAnswers(def, body.answers, `forms/${row.slug}/`);
  if (Object.keys(errors).length) return NextResponse.json({ error: "Some answers need another look.", errors }, { status: 422 });
  const lines = answerLines(def, answers);
  if (settings.blockedWords.length && hasBlockedWord(settings.blockedWords, ...lines.map(([, v]) => v))) {
    return NextResponse.json({ ok: true, message: def.successMessage });
  }

  const who = whoFrom(def, answers);
  let saved: { id: string; serial: number | null };
  try { saved = await saveCustomEntry(row.key, row.version, answers, who); } catch {
    return NextResponse.json({ error: "Your answers could not be saved just now. Try again in a minute." }, { status: 503 });
  }

  await hydrateSettings();
  const inbox = studioInbox();
  after(async () => {
    const url = new URL(`/admin/forms/${row.key}/entries/${saved.id}`, SITE_URL).toString();
    const title = `${def.title}${saved.serial ? ` #${saved.serial}` : ""}`;
    try {
      await sendFormEmail(form, settings, "studio-notice", {
        to: inbox, replyTo: who.email || undefined,
        subject: `New entry: ${title}`,
        text: `${title}\n\n${lines.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nIn the admin: ${url}`,
        html: composeEmailHtml({
          title: `New entry: ${title}`, preheader: lines.slice(0, 2).map(([, v]) => v).join(" · "), heading: `New entry: ${title}`,
          blocks: [emailPanel(lines.slice(0, 30)), emailButton("Open the entry", url)],
          why: "You get this because notices for this form are on.", manage: "staff",
        }),
      }, { summary: `A new entry to ${def.title}.`, dedupeKey: `custom-notice:${saved.id}`, by: "Website" }, { form: def.title, serial: String(saved.serial ?? "") }, saved.id);
    } catch { /* The row records the failure. */ }
  });

  return NextResponse.json({ ok: true, message: def.successMessage });
}
