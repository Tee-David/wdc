import { SERVICES, type ServiceSlug } from "@/lib/services";
import { stepsFor } from "@/lib/onboarding";

/**
 * The site's forms, as the admin sees them.
 *
 * THE FORMS ARE CODE, and this is the list of them rather than a second
 * definition. Onboarding's questions come from `stepsFor(service)`; contact and
 * newsletter are small literal lists. Nothing here is stored in the database:
 * a form's key is a stable name that its entries, settings and export route
 * hang off, so it must never change once shipped.
 *
 * No `server-only`, so the entries table's column picker can read the labels.
 */

export type FormSource = "onboarding" | "contact" | "newsletter" | "custom";
export type FormGroup = "onboarding" | "website" | "custom";

export type ColumnDef = { key: string; label: string };

export type FormDef = {
  key: string;
  title: string;
  group: FormGroup;
  source: FormSource;
  service?: ServiceSlug;
  /** Where the public form lives. */
  publicPath: string;
  publicLabel: string;
  /** What one entry is called, for "Brief #12". */
  noun: string;
  /** Every column the table can show, in their natural order. */
  columns: ColumnDef[];
  /** What a new viewer sees. */
  defaultColumns: string[];
  /** Read, starred, spam and trash. The newsletter is a list, not an inbox. */
  inbox: boolean;
  /** A form built in the admin (lib/forms/custom.ts). */
  custom?: { slug: string; status: "draft" | "live" | "closed"; version: number };
};

/* Columns every onboarding form offers before its own questions. */
const ONBOARDING_BASE: ColumnDef[] = [
  { key: "serial", label: "#" },
  { key: "name", label: "Name" },
  { key: "company", label: "Business" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "answered", label: "Answered" },
  { key: "client", label: "Client" },
  { key: "when", label: "Submitted" },
];

/* Question keys already covered by a base column. */
const COVERED = new Set(["first_name", "last_name", "company", "email", "phone"]);

function onboardingForm(service: ServiceSlug): FormDef {
  const svc = SERVICES.find((s) => s.slug === service)!;
  const questions = stepsFor(service)
    .flatMap((st) => st.fields)
    .filter((f) => !COVERED.has(f.key))
    .map((f) => ({ key: `q:${f.key}`, label: f.label }));
  return {
    key: `onboarding-${service}`,
    title: `${svc.short} onboarding`,
    group: "onboarding",
    source: "onboarding",
    service,
    publicPath: "/onboarding",
    publicLabel: "/onboarding",
    noun: "Brief",
    columns: [...ONBOARDING_BASE, ...questions],
    defaultColumns: ["serial", "name", "company", "email", "answered", "client", "when"],
    inbox: true,
  };
}

export const FORMS: FormDef[] = [
  ...SERVICES.map((s) => onboardingForm(s.slug)),
  {
    key: "contact",
    title: "Contact",
    group: "website",
    source: "contact",
    publicPath: "/contact",
    publicLabel: "/contact",
    noun: "Enquiry",
    columns: [
      { key: "serial", label: "#" },
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "topic", label: "Topic" },
      { key: "message", label: "Message" },
      { key: "notice", label: "Notice" },
      { key: "when", label: "Received" },
    ],
    defaultColumns: ["serial", "name", "email", "topic", "message", "notice", "when"],
    inbox: true,
  },
  {
    key: "newsletter",
    title: "Newsletter",
    group: "website",
    source: "newsletter",
    publicPath: "/",
    publicLabel: "Footer, every page",
    noun: "Subscriber",
    columns: [
      { key: "email", label: "Email" },
      { key: "source", label: "Source" },
      { key: "status", label: "Status" },
      { key: "when", label: "Subscribed" },
      { key: "unsubscribed", label: "Unsubscribed" },
    ],
    defaultColumns: ["email", "source", "status", "when"],
    inbox: false,
  },
];

export const formByKey = (key: string) => FORMS.find((f) => f.key === key);
export const onboardingFormFor = (service: string) => FORMS.find((f) => f.source === "onboarding" && f.service === service);

/* ----------------------------------------------------------------- tabs */

export type TabDef = { key: string; label: string };

/** The status tabs a form's entries are sorted into; the first is the default. */
export function tabsFor(form: FormDef): TabDef[] {
  if (form.source === "newsletter") return [{ key: "subscribed", label: "Subscribed" }, { key: "unsubscribed", label: "Unsubscribed" }];
  const base = [
    { key: "all", label: form.source === "onboarding" ? "Submitted" : "All" },
    { key: "unread", label: "Unread" },
    { key: "starred", label: "Starred" },
  ];
  return [
    ...base,
    ...(form.source === "onboarding" ? [{ key: "drafts", label: "Drafts" }] : []),
    { key: "spam", label: "Spam" },
    { key: "trash", label: "Trash" },
  ];
}

/* ----------------------------------------------------------- the columns */

/** The viewer's saved choice, cleaned against what the form offers. */
export function chosenColumns(form: FormDef, saved: string | undefined): string[] {
  const offered = new Set(form.columns.map((c) => c.key));
  const picked = (saved ?? "").split(",").map((k) => k.trim()).filter((k) => offered.has(k));
  return picked.length ? [...new Set(picked)] : form.defaultColumns;
}

export const columnCookie = (form: FormDef) => `wdc_cols_${form.key}`;
export const PER_PAGE = [25, 50, 100] as const;
