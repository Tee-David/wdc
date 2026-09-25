import { CONTACT_EMAIL, SOCIAL_LINKS } from "@/lib/site";
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

export const SETTINGS: SettingDef[] = [
  {
    key: "contact.email", label: "Contact email", shipped: () => CONTACT_EMAIL,
    note: "The address on the contact page, the footer and every email.",
    readOnly: "Not editable yet: it is read from the code in a dozen places, and an edit here would change none of them.",
    revalidate: [],
  },
  {
    key: "contact.socials", label: "Social links",
    shipped: () => (SOCIAL_LINKS.length ? `${SOCIAL_LINKS.length} linked` : "None yet"),
    note: "The row of marks in the footer and in every email. It draws nothing while the list is empty.",
    readOnly: "Not editable yet: the list is `SOCIAL_LINKS` in lib/site.ts, and it is empty.",
    revalidate: [],
  },
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
];

export const settingDef = (key: string) => SETTINGS.find((s) => s.key === key);
export const editableKeys = () => SETTINGS.filter((s) => s.parse).map((s) => s.key);
