import "server-only";

import { SERVICES } from "@/lib/services";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";
import { escapeHtml } from "@/lib/email";
import { composeEmailHtml, emailP, emailPanel, emailSmall, enquiryReceiptEmail, onboardingNextStepsEmail } from "@/lib/email-templates";
import type { FormDef } from "./registry";
import type { Entry } from "./entries";

/**
 * Every email a form sends, built in one place.
 *
 * The route that saves an entry, the Resend button on the entry page and the
 * preview on the Settings tab all build the same message from here, so a
 * resend cannot drift from the original and a preview shows what is really
 * sent. The wording is code; what the settings change (on/off, recipients,
 * copies, subject) is applied afterwards by `sendFormEmail`.
 */

export type FormEmailData = {
  id: string;
  serial: number | null;
  first: string;
  last: string;
  email: string;
  phone: string;
  company: string;
  topic: string;
  message: string;
  source: string;
};

export type BuiltEmail = { to: string; replyTo?: string; subject: string; text: string; html: string; unsubscribe?: boolean };

const studioInbox = () => process.env.SMTP_REPLY_TO || CONTACT_EMAIL;
const adminUrl = (form: FormDef, id: string) => new URL(`/admin/forms/${form.key}/entries/${id}`, SITE_URL).toString();

export function dataFromEntry(form: FormDef, e: Entry): FormEmailData {
  const first = form.source === "onboarding" ? String(e.answers.first_name ?? "").trim() : e.name.split(" ")[0] ?? "";
  const last = form.source === "onboarding" ? String(e.answers.last_name ?? "").trim() : e.name.split(" ").slice(1).join(" ");
  return {
    id: e.id, serial: e.serial, first, last, email: e.email, phone: e.phone,
    company: String(e.answers.company ?? "").trim(), topic: e.topic ?? "", message: e.message ?? "", source: e.source ?? "footer",
  };
}

/** The message for one of a form's emails, or null when the form has no such email or it has nowhere to go. */
export function formEmail(form: FormDef, key: string, d: FormEmailData, opts: { unsubscribeUrl?: string } = {}): BuiltEmail | null {
  const name = [d.first, d.last].filter(Boolean).join(" ");
  const link = d.id ? adminUrl(form, d.id) : "";

  if (form.source === "contact" && key === "studio-notice") {
    const detail = [`Name: ${name}`, `Email: ${d.email}`, d.phone ? `Phone: ${d.phone}` : null, `About: ${d.topic}`, "", d.message].filter(Boolean).join("\n");
    return {
      to: studioInbox(), replyTo: d.email,
      subject: `Website enquiry: ${d.topic}`,
      text: link ? `${detail}\n\nOpen it in the admin: ${link}` : detail,
      html: composeEmailHtml({
        title: `Website enquiry: ${d.topic}`,
        preheader: `${name} wrote about ${d.topic}.`,
        heading: d.topic,
        blocks: [
          emailPanel([["From", name], ["Email", d.email], ...(d.phone ? [["Phone", d.phone] as [string, string]] : [])]),
          emailP(escapeHtml(d.message).replace(/\n/g, "<br>")),
          ...(link ? [emailP(`<a href="${escapeHtml(link)}">Open it in the admin</a>`)] : []),
        ],
      }),
    };
  }
  if (form.source === "contact" && key === "receipt") {
    if (!d.email) return null;
    return { to: d.email, ...enquiryReceiptEmail({ firstName: d.first, topic: d.topic }) };
  }

  if (form.source === "newsletter" && key === "welcome") {
    if (!d.email) return null;
    const out = opts.unsubscribeUrl
      ? `To stop, open ${opts.unsubscribeUrl} and nothing else will arrive.`
      : "If this was not you, ignore this message and nothing else will arrive.";
    return {
      to: d.email,
      subject: "We Dig Creativity: you are on the list",
      /* A newsletter is the case the List-Unsubscribe header exists for. */
      unsubscribe: true,
      text: `You asked to hear from We Dig Creativity.\n\nWe write when we have something worth your time: work we have shipped, what it cost, and what we learned. Not weekly, and never a digest of other people's links.\n\n${out}\n\nWe Dig Creativity\n${CONTACT_EMAIL}`,
      html: composeEmailHtml({
        title: "You are on the list",
        preheader: "We write when we have something worth your time.",
        heading: "You are on the list",
        blocks: [
          emailP("We write when we have something worth your time: work we have shipped, what it cost, and what we learned. Not weekly, and never a digest of other people&rsquo;s links."),
          emailSmall(opts.unsubscribeUrl
            ? `To stop, <a href="${escapeHtml(opts.unsubscribeUrl)}">unsubscribe here</a> and nothing else will arrive.`
            : "If this was not you, ignore this message and nothing else will arrive."),
        ],
        unsubscribe: true,
      }),
    };
  }
  if (form.source === "newsletter" && key === "studio-notice") {
    return {
      to: studioInbox(),
      subject: "New newsletter subscriber",
      text: `${d.email}\nFrom: ${d.source}`,
      html: composeEmailHtml({
        title: "New newsletter subscriber",
        preheader: `${d.email} subscribed from the ${d.source}.`,
        heading: "New newsletter subscriber",
        blocks: [emailPanel([["Email", d.email], ["Signed up from", d.source]])],
      }),
    };
  }

  if (form.source === "onboarding") {
    const serviceName = SERVICES.find((s) => s.slug === form.service)?.name ?? String(form.service);
    if (key === "next-steps") {
      if (!d.email) return null;
      return { to: d.email, ...onboardingNextStepsEmail({ name: d.first || "there", service: serviceName, company: d.company || undefined }) };
    }
    if (key === "studio-notice") {
      const who = name || "A client";
      return {
        to: studioInbox(),
        replyTo: d.email || undefined,
        subject: `Onboarding brief: ${serviceName}${d.company ? ` for ${d.company}` : ""}`,
        text: `${who}${d.email ? ` <${d.email}>` : ""} submitted the ${serviceName} onboarding form.\n${d.serial ? `Brief #${d.serial}. ` : ""}${link ? `Open it in the admin: ${link}` : ""}`,
        html: composeEmailHtml({
          title: `Onboarding brief: ${serviceName}`,
          preheader: `${who} submitted the ${serviceName} onboarding form.`,
          heading: `New ${serviceName} brief`,
          blocks: [
            emailPanel([["From", who], ...(d.email ? [["Email", d.email] as [string, string]] : []), ...(d.company ? [["Company", d.company] as [string, string]] : []), ["Brief", d.serial ? `#${d.serial}` : d.id]]),
            ...(link ? [emailP(`<a href="${escapeHtml(link)}">Open it in the admin</a>`)] : []),
          ],
        }),
      };
    }
  }
  return null;
}

/** The dedupe key an email about this entry was first sent under. */
export function originalKey(form: FormDef, key: string, d: FormEmailData) {
  if (form.source === "contact") return key === "receipt" ? `enquiry-receipt:${d.id}` : `enquiry:${d.id}`;
  if (form.source === "onboarding") return key === "next-steps" ? `onboarding-next-steps:${d.id}` : `onboarding-notice:${d.id}`;
  return `newsletter-${key === "welcome" ? "welcome" : "notice"}:${d.email}`;
}

/** Tokens a subject may use, for this entry. */
export function tokensFor(form: FormDef, d: FormEmailData): Record<string, string> {
  return {
    first_name: d.first, topic: d.topic, company: d.company, email: d.email,
    serial: d.serial ? String(d.serial) : "",
    service: SERVICES.find((s) => s.slug === form.service)?.short ?? "",
  };
}
