import { CONTACT_EMAIL } from "@/lib/site";
import { NETWORKS, parseSocial, shippedSocial, socialKey } from "@/lib/social";
import { SERVICES } from "@/lib/services";
import { CASE_STUDIES } from "@/lib/work";

/**
 * Every row on the Settings screen, declared once.
 *
 * A SETTING IS ONLY EDITABLE WHEN SOMETHING READS IT. Five of these rows used
 * to take an edit and reply "The site shows it now" while nothing on the site
 * read the override, which is the one thing a settings screen must never do.
 * They are listed here as read-only, with the reason, until each has a
 * consumer wired in the same change that makes it editable.
 *
 * `parse` is the only way a value gets in: the server action refuses a key
 * that is not here, and a value this rejects.
 */

export type SettingDef = {
  key: string;
  label: string;
  note: string;
  /** What shipped in git, as the screen shows it. */
  shipped: () => string;
  /** Present only when the site reads this setting. */
  parse?: (raw: string) => { ok: true; value: string } | { ok: false; error: string };
  /** Why it cannot be edited yet, for a read-only row. */
  readOnly?: string;
  /** Pages to re-render after a change. */
  revalidate: string[];
};

const number = (min: number, max: number, whole: boolean, what: string) => (raw: string) => {
  const t = raw.trim();
  const n = Number(t);
  if (!t || !Number.isFinite(n)) return { ok: false as const, error: `A number, ${what}.` };
  if (whole && !Number.isInteger(n)) return { ok: false as const, error: `A whole number, ${what}.` };
  if (n < min || n > max) return { ok: false as const, error: `Between ${min} and ${max}.` };
  return { ok: true as const, value: String(whole ? Math.trunc(n) : Math.round(n * 100) / 100) };
};

const flag = (raw: string) => (raw === "1" || raw === "0"
  ? { ok: true as const, value: raw }
  : { ok: false as const, error: "On or off." });

/** Days from the due date a reminder goes: before (negative), on, or after. */
export const REMINDER_DAYS = [
  { value: "-3", label: "3 days before" },
  { value: "0", label: "On the due date" },
  { value: "7", label: "7 days late" },
  { value: "14", label: "14 days late" },
  { value: "30", label: "30 days late" },
];
const reminders = (raw: string) => {
  const t = raw.trim();
  if (t === "off") return { ok: true as const, value: "off" };
  const days = [...new Set(t.split(",").map((d) => d.trim()).filter(Boolean))];
  if (!days.length) return { ok: true as const, value: "off" };
  if (!days.every((d) => REMINDER_DAYS.some((r) => r.value === d))) return { ok: false as const, error: "Pick from the listed days." };
  return { ok: true as const, value: days.sort((a, b) => Number(a) - Number(b)).join(",") };
};
const text = (min: number, max: number, what: string) => (raw: string) => {
  const t = raw.trim().replace(/\s+/g, " ");
  if (t.length < min) return { ok: false as const, error: `Add ${what}.` };
  if (t.length > max) return { ok: false as const, error: `Keep it to ${max} characters.` };
  if (/[<>\r\n]/.test(t)) return { ok: false as const, error: "Letters, numbers and punctuation only." };
  return { ok: true as const, value: t };
};
const email = (raw: string) => {
  const t = raw.trim().toLowerCase();
  if (!t) return { ok: true as const, value: "" };
  if (t.length > 254 || !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(t)) return { ok: false as const, error: "Enter an email like name@example.com." };
  return { ok: true as const, value: t };
};

export const SETTINGS: SettingDef[] = [
  {
    key: "contact.email", label: "Contact email", shipped: () => CONTACT_EMAIL,
    note: "The address on the contact page, the footer and every email.",
    readOnly: "Not editable yet: it is read from the code in a dozen places, and an edit here would change none of them.",
    revalidate: [],
  },
  /* The studio's profiles (lib/social.ts), drawn in every email's footer by
     sendMail once settings are read; Settings > Business profile. */
  ...NETWORKS.map((n): SettingDef => ({
    key: socialKey(n.network), label: n.label, shipped: () => shippedSocial(n.network),
    note: `The ${n.label} mark in every email's footer. Empty draws none.`,
    parse: parseSocial(n.network),
    revalidate: [],
  })),
  {
    key: "services", label: "Services", shipped: () => `${SERVICES.length} services`,
    note: "Names, blurbs and deliverables. The slugs are not editable: the work URLs are built from them.",
    readOnly: "Not editable yet: the service pages read lib/services.ts directly.",
    revalidate: [],
  },
  {
    key: "work", label: "Case studies", shipped: () => `${CASE_STUDIES.length} published`,
    note: "Copy and figures. Adding one still needs its images.",
    readOnly: "Not editable yet: the work pages read lib/work.ts directly.",
    revalidate: [],
  },
  {
    key: "legal", label: "Legal documents", shipped: () => "4 documents",
    note: "Privacy, terms, cookies and the engagement policy.",
    readOnly: "Not editable yet, and deliberately: a change to a legal text should go through review, not a text box.",
    revalidate: [],
  },
  {
    key: "finance.vatRate", label: "Default VAT %", shipped: () => "7.5",
    note: "Pre-fills a new invoice or estimate. Editing an existing one is unaffected: its own figure always wins.",
    parse: number(0, 100, false, "like 7.5"),
    revalidate: ["/admin/money", "/admin/clients", "/admin/projects"],
  },
  {
    key: "finance.dueInDays", label: "Default days to pay", shipped: () => "30",
    note: "How far out a new invoice's due date starts.",
    parse: number(1, 365, true, "of days"),
    revalidate: ["/admin/money", "/admin/clients", "/admin/projects"],
  },
  {
    key: "finance.vatOn", label: "Add VAT to new invoices", shipped: () => "1",
    note: "Off, a new invoice or estimate starts at 0% and VAT is added per invoice.",
    parse: flag, revalidate: ["/admin/money", "/admin/clients", "/admin/projects"],
  },
  {
    key: "finance.reminders", label: "Payment reminders", shipped: () => "off",
    note: "Days around the due date the daily job emails a reminder on an unpaid invoice.",
    parse: reminders, revalidate: [],
  },
  {
    key: "notify.tickets", label: "Support tickets", shipped: () => "1",
    note: "Email the studio when a client opens or replies to a ticket.",
    parse: flag, revalidate: [],
  },
  {
    key: "notify.payments", label: "Payments", shipped: () => "1",
    note: "Email the studio when a client pays online.",
    parse: flag, revalidate: [],
  },
  {
    key: "mail.fromName", label: "Sender name", shipped: () => process.env.SMTP_FROM_NAME?.trim() || "WDC Solutions",
    note: "The name in the From line of every email.",
    parse: text(2, 60, "a sender name"), revalidate: [],
  },
  {
    key: "mail.replyTo", label: "Replies go to", shipped: () => process.env.SMTP_REPLY_TO?.trim() || "",
    note: "Where a reply to one of our emails lands, and where studio notices go.",
    parse: email, revalidate: [],
  },
];

export const settingDef = (key: string) => SETTINGS.find((s) => s.key === key);
export const editableKeys = () => SETTINGS.filter((s) => s.parse).map((s) => s.key);
