import type { Design, Vars } from "./email-design";

/**
 * THE EMAILS THE BUILDER CAN RESTYLE. Each names who it goes to, which merge
 * tags make sense in it (with a sample for previews), where its footer rule
 * lives, and a starter design that reproduces today's message. The coded
 * template stays each one's default: a saved design replaces it only while
 * switched on, and Reset deletes the design.
 *
 * Invoice, receipt and reminder emails are not here: they carry money lines
 * and stay in code until the owner decides to move them (see plans).
 */
export type Tag = { key: string; label: string; sample: string };
export type EmailKind = {
  key: string;
  name: string;
  line: string;
  audience: "client" | "visitor" | "subscriber";
  manage?: "client" | "staff";
  unsubscribe: boolean;
  why: string;
  tags: Tag[];
  starters: { name: string; design: Design }[];
};

const b = (id: string) => id;
const common: Tag[] = [
  { key: "studio.name", label: "Studio name", sample: "We Dig Creativity" },
  { key: "studio.email", label: "Studio email", sample: "hello@wedigcreativity.com" },
];

export const EMAIL_KINDS: EmailKind[] = [
  {
    key: "enquiry-receipt", name: "Enquiry received", line: "Sent when someone uses the contact form.",
    audience: "visitor", unsubscribe: true, why: "You get this because you sent us a message on the site.",
    tags: [{ key: "contact.first_name", label: "First name", sample: "Tobi" }, { key: "contact.topic", label: "Topic they chose", sample: "a new website" }, ...common],
    starters: [{ name: "Plain and warm", design: { subject: "We received your message", preheader: "Your message about {{contact.topic}} is with us. We reply the same working day.", heading: "Your message is with us.", blocks: [
      { id: b("a1"), type: "text", text: "Hi {{contact.first_name | \"there\"}}," },
      { id: b("a2"), type: "text", text: "Your message about **{{contact.topic}}** reached us, and somebody on the team will read it properly rather than reply automatically. You can expect an answer within the same working day." },
      { id: b("a3"), type: "text", text: "If anything has changed since you wrote, or you left something out, reply to this email and it lands on the same thread." },
      { id: b("a4"), type: "note", text: "A copy was sent automatically so you know the form worked." },
    ] } }],
  },
  {
    key: "support-reply", name: "Support reply", line: "Sent when the studio answers a client's question.",
    audience: "client", manage: "client", unsubscribe: false, why: "You get this when we answer a question you asked.",
    tags: [{ key: "client.first_name", label: "Client first name", sample: "Ada" }, { key: "ticket.subject", label: "Question subject", sample: "Logo files" }, { key: "reply.body", label: "The reply", sample: "Your files are in the portal under Deliverables." }, { key: "reply.author", label: "Who replied", sample: "Babatope" }, { key: "links.thread", label: "Link to the conversation", sample: "https://wedigcreativity.com/portal/support/t_1" }, ...common],
    starters: [{ name: "Reply and a button", design: { subject: "Re: {{ticket.subject}}", preheader: "{{reply.author}} replied to your question.", heading: "We replied to your question.", blocks: [
      { id: "s1", type: "text", text: "Hi {{client.first_name | \"there\"}}," },
      { id: "s2", type: "text", text: "{{reply.author}} replied about **{{ticket.subject}}**:" },
      { id: "s3", type: "facts", rows: [{ label: "Reply", value: "{{reply.body}}" }] },
      { id: "s4", type: "button", label: "Read it in your portal", url: "{{links.thread}}" },
    ] } }],
  },
  {
    key: "project-stage", name: "Project moved", line: "Sent when a project moves to a new stage.",
    audience: "client", manage: "client", unsubscribe: true, why: "You get project updates while we work on your project.",
    tags: [{ key: "client.first_name", label: "Client first name", sample: "Ada" }, { key: "project.title", label: "Project", sample: "Identity system" }, { key: "project.from", label: "Was", sample: "Discovery" }, { key: "project.to", label: "Now", sample: "In progress" }, { key: "project.note", label: "Studio note", sample: "First routes are underway." }, { key: "links.project", label: "Link to the project", sample: "https://wedigcreativity.com/portal/projects/p_1" }, ...common],
    starters: [{ name: "Was and now", design: { subject: "{{project.title}} is now at {{project.to}}", preheader: "Moved from {{project.from}} to {{project.to}}.", heading: "{{project.title}} is now at {{project.to}}.", blocks: [
      { id: "p1", type: "text", text: "Hi {{client.first_name | \"there\"}}," },
      { id: "p2", type: "facts", rows: [{ label: "Was", value: "{{project.from}}" }, { label: "Now", value: "{{project.to}}" }] },
      { id: "p3", type: "text", text: "{{project.note}}" },
      { id: "p4", type: "button", label: "See the project", url: "{{links.project}}" },
      { id: "p5", type: "note", text: "Nothing is needed from you unless we have asked for it separately." },
    ] } }],
  },
  {
    key: "deliverable-ready", name: "Ready for approval", line: "Sent when a deliverable is ready for the client's review.",
    audience: "client", manage: "client", unsubscribe: false, why: "You get this when something is ready for you to review.",
    tags: [{ key: "client.first_name", label: "Client first name", sample: "Ada" }, { key: "project.title", label: "Project", sample: "Identity system" }, { key: "deliverable.name", label: "Deliverable", sample: "Logo routes" }, { key: "deliverable.respond_by", label: "We have held until", sample: "20 October 2026" }, { key: "links.review", label: "Link to review it", sample: "https://wedigcreativity.com/portal/projects/p_1" }, ...common],
    starters: [{ name: "Review and approve", design: { subject: "{{deliverable.name}} is ready for your approval", preheader: "{{deliverable.name}} for {{project.title}} is ready.", heading: "{{deliverable.name}} is ready for you.", blocks: [
      { id: "d1", type: "text", text: "Hi {{client.first_name | \"there\"}}," },
      { id: "d2", type: "text", text: "{{deliverable.name}} for **{{project.title}}** is ready. Open it, leave comments directly on it, and either approve it or send it back with changes." },
      { id: "d3", type: "button", label: "Review and approve", url: "{{links.review}}" },
      { id: "d4", type: "facts", rows: [{ label: "Project", value: "{{project.title}}" }, { label: "We have held", value: "{{deliverable.respond_by}}" }] },
    ] } }],
  },
  {
    key: "newsletter", name: "Newsletter issue", line: "The layout campaigns start from.",
    audience: "subscriber", unsubscribe: true, why: "You are getting this because you subscribed on our site.",
    tags: [{ key: "contact.first_name", label: "First name", sample: "Tobi" }, { key: "campaign.title", label: "Issue title", sample: "October notes" }, ...common],
    starters: [{ name: "One story and a button", design: { subject: "{{campaign.title}}", preheader: "What we have been making.", heading: "{{campaign.title}}", blocks: [
      { id: "n1", type: "text", text: "Hi {{contact.first_name | \"there\"}}," },
      { id: "n2", type: "text", text: "Write the issue here. Keep it short, one idea to a paragraph." },
      { id: "n3", type: "button", label: "Read more", url: "https://wedigcreativity.com/blog" },
    ] } }],
  },
];

export const kindByKey = (key: string) => EMAIL_KINDS.find((k) => k.key === key);

/** Sample values for a preview. */
export function sampleVars(kind: EmailKind): Vars {
  return Object.fromEntries(kind.tags.map((t) => [t.key, t.sample]));
}
