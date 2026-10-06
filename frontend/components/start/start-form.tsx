"use client";

import { CustomFormView, type Sender } from "@/components/forms/custom-form-view";
import type { CustomFormDef } from "@/lib/forms/custom-def";
import { ENQUIRY_TOPICS, TOPIC_BY_SERVICE } from "@/lib/contact";
import { SERVICES } from "@/lib/services";

/**
 * START A PROJECT, as a conversation: four screens of two questions. It is the
 * form builder's conversation layout (components/forms/custom-form-view.tsx)
 * with the questions written here and the answers handed to the enquiry
 * endpoint, so an enquiry from /start lands in the same inbox, with the same
 * emails and the same spam checks, as one from /contact.
 */
const DEF: CustomFormDef = {
  title: "Start a project",
  intro: "",
  submitLabel: "Send it to us",
  successMessage: "Thank you. We have it, and we will review your project and get back to you.",
  layout: "conversation",
  perScreen: 2,
  fields: [
    { id: "topic", type: "select", label: "What do you need help with?", required: true, options: [...ENQUIRY_TOPICS] },
    { id: "message", type: "textarea", label: "Tell us about it", help: "A few lines is plenty. What are you trying to achieve?", required: true, placeholder: "We want to…" },
    { id: "timeline", type: "radio", label: "When would you like to start?", options: ["As soon as possible", "In the next one to three months", "Later this year", "I'm not sure, please advise me"] },
    { id: "budget", type: "select", label: "Roughly what budget do you have in mind?", placeholder: "Choose one", options: ["Under ₦1m", "₦1m to ₦3m", "₦3m to ₦10m", "Over ₦10m", "I'm not sure, please advise me"] },
    { id: "first", type: "text", label: "Your first name", required: true },
    { id: "last", type: "text", label: "Your last name", required: true },
    { id: "email", type: "email", label: "Your email", required: true },
    { id: "phone", type: "phone", label: "Phone or WhatsApp", help: "Optional. Only if you would rather we call." },
  ],
};

const text = (v: unknown) => (typeof v === "string" ? v : "");

const send: Sender = async (a) => {
  const extras = [text(a.timeline) && `Start: ${text(a.timeline)}`, text(a.budget) && `Budget: ${text(a.budget)}`].filter(Boolean).join("\n");
  const response = await fetch("/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      first: text(a.first), last: text(a.last), email: text(a.email), phone: text(a.phone), topic: text(a.topic),
      message: `${text(a.message)}${extras ? `\n\n${extras}` : ""}`,
    }),
  });
  const body = (await response.json().catch(() => ({}))) as { error?: string; confirmation?: { message?: string } };
  if (!response.ok) return { ok: false, error: body.error || "Your answers could not be sent. Try again in a minute." };
  return { ok: true, message: body.confirmation?.message };
};

/** `services` comes from /services (`/start?services=web,seo`): the first sets
    the topic, and the message starts with the whole list so nothing is lost. */
export default function StartForm({ services = [] }: { services?: string[] }) {
  const known = services.filter((s) => s in TOPIC_BY_SERVICE);
  const initial = known.length
    ? {
        topic: TOPIC_BY_SERVICE[known[0]],
        message: `We are interested in: ${known.map((k) => SERVICES.find((s) => s.slug === k)?.name ?? k).join(", ")}.\n\n`,
      }
    : undefined;
  return <CustomFormView def={DEF} send={send} initial={initial} />;
}
