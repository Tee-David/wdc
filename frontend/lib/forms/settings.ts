import type { FormDef, FormSource } from "./registry";

/**
 * What the studio can change about a form without touching its code.
 *
 * The fields are the Fluent Forms settings that matter to a small studio:
 * whether the form takes entries, when, how many, what the visitor is told
 * afterwards, which words send an entry to Spam, how long entries are kept,
 * and each email the form sends. Everything else stays in code.
 *
 * NOTHING HERE IS EVER TRUSTED FROM A POST. `parseFormSettings` rebuilds a
 * settings object from whatever arrives, field by field, and anything it does
 * not recognise is dropped. No `server-only`: the settings screen imports the
 * shape and the defaults.
 */

export type LimitPer = "total" | "day" | "month";

export type NotificationSettings = {
  enabled: boolean;
  /** Studio notices only: where they go. Empty means the studio inbox. */
  to: string[];
  cc: string[];
  bcc: string[];
  /** A studio notice's reply goes to the person who wrote, or to the studio. */
  replyTo: "person" | "studio";
  /** Empty means the subject written in code. */
  subject: string;
};

export type FormSettings = {
  open: boolean;
  closedMessage: string;
  /** YYYY-MM-DD, Lagos time. Empty means no date. */
  opensOn: string;
  closesOn: string;
  limit: number | null;
  limitPer: LimitPer;
  limitMessage: string;
  after: "message" | "redirect";
  afterHeading: string;
  afterMessage: string;
  /** A path on this site; an address elsewhere is refused. */
  redirectTo: string;
  blockedWords: string[];
  /** Days to keep entries in Trash before they go for good. */
  trashDays: number;
  notifications: Record<string, NotificationSettings>;
};

export type NotificationDef = {
  key: string;
  name: string;
  audience: "studio" | "person";
  /** What it says when nothing has been changed, for the settings screen. */
  defaultSubject: string;
  /** Tokens the subject may use. */
  tokens: string[];
};

const PERSON_TOKENS = ["{first_name}"];

/** The emails each kind of form sends today, named for the settings screen. */
export const NOTIFICATIONS: Record<FormSource, NotificationDef[]> = {
  contact: [
    { key: "studio-notice", name: "Notice to the studio", audience: "studio", defaultSubject: "Website enquiry: {topic}", tokens: ["{first_name}", "{topic}", "{serial}"] },
    { key: "receipt", name: "Receipt to the sender", audience: "person", defaultSubject: "We have your message", tokens: [...PERSON_TOKENS, "{topic}"] },
  ],
  newsletter: [
    { key: "welcome", name: "Welcome to the subscriber", audience: "person", defaultSubject: "You are on the list", tokens: [] },
    { key: "studio-notice", name: "Notice to the studio", audience: "studio", defaultSubject: "New newsletter subscriber", tokens: ["{email}"] },
  ],
  onboarding: [
    { key: "next-steps", name: "Next steps to the client", audience: "person", defaultSubject: "Your {service} brief is with us", tokens: [...PERSON_TOKENS, "{service}"] },
    { key: "studio-notice", name: "Notice to the studio", audience: "studio", defaultSubject: "Onboarding brief: {service}", tokens: ["{first_name}", "{company}", "{service}", "{serial}"] },
  ],
};

export const TRASH_DAYS = [7, 14, 30, 60, 90] as const;

const DEFAULT_NOTIFICATION: NotificationSettings = { enabled: true, to: [], cc: [], bcc: [], replyTo: "person", subject: "" };

export function defaultSettings(form: FormDef): FormSettings {
  return {
    open: true,
    closedMessage: "This form is not taking entries right now. Please email us instead.",
    opensOn: "",
    closesOn: "",
    limit: null,
    limitPer: "total",
    limitMessage: "This form has had as many entries as it can take for now. Please email us instead.",
    after: "message",
    afterHeading: "",
    afterMessage: "",
    redirectTo: "",
    blockedWords: [],
    trashDays: 30,
    notifications: Object.fromEntries(NOTIFICATIONS[form.source].map((n) => [n.key, { ...DEFAULT_NOTIFICATION }])),
  };
}

type Raw = Record<string, unknown>;
const text = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\r\n/g, "\n").trim().slice(0, max) : "");
const isDay = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T12:00:00Z`).getTime());
const EMAIL = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/;

/** A comma or line separated list of addresses: the good ones, and the ones that were not. */
export function parseAddresses(v: unknown): { ok: string[]; bad: string[] } {
  const parts = (typeof v === "string" ? v : Array.isArray(v) ? v.join(",") : "")
    .split(/[\s,;]+/).map((x) => x.trim().toLowerCase()).filter(Boolean);
  const ok = [...new Set(parts.filter((x) => EMAIL.test(x) && x.length <= 254))].slice(0, 10);
  return { ok, bad: parts.filter((x) => !EMAIL.test(x)) };
}

/** A path on this site, or nothing. `//host` is another site wearing ours. */
export function safeRedirect(v: string) {
  return /^\/(?!\/)[\w\-./?=&#%]*$/.test(v) ? v : "";
}

/**
 * Settings from a submitted form, checked field by field.
 * Returns the errors keyed by field name, the way the admin forms show them.
 */
export function parseFormSettings(form: FormDef, raw: Raw): { ok: true; settings: FormSettings } | { ok: false; errors: Record<string, string> } {
  const d = defaultSettings(form);
  const errors: Record<string, string> = {};
  const on = (k: string) => raw[k] === "on" || raw[k] === true || raw[k] === "true";

  const opensOn = text(raw.opensOn, 10);
  const closesOn = text(raw.closesOn, 10);
  if (opensOn && !isDay(opensOn)) errors.opensOn = "That is not a date.";
  if (closesOn && !isDay(closesOn)) errors.closesOn = "That is not a date.";
  if (opensOn && closesOn && isDay(opensOn) && isDay(closesOn) && closesOn < opensOn) errors.closesOn = "The closing date is before the opening date.";

  const limitRaw = text(raw.limit, 7);
  const limit = limitRaw ? Number(limitRaw) : null;
  if (limitRaw && (!Number.isInteger(limit) || (limit ?? 0) < 1 || (limit ?? 0) > 100_000)) errors.limit = "A whole number from 1, or leave it empty for no limit.";
  const limitPer = (["total", "day", "month"] as const).find((x) => x === raw.limitPer) ?? "total";

  const after = raw.after === "redirect" ? "redirect" : "message";
  const redirectRaw = text(raw.redirectTo, 300);
  const redirectTo = safeRedirect(redirectRaw);
  if (after === "redirect" && !redirectTo) errors.redirectTo = "A page on this site, starting with /, like /thank-you.";

  const trashDays = Number(raw.trashDays);
  const notifications: Record<string, NotificationSettings> = {};
  for (const n of NOTIFICATIONS[form.source]) {
    const p = (k: string) => raw[`n.${n.key}.${k}`];
    const to = parseAddresses(p("to")), cc = parseAddresses(p("cc")), bcc = parseAddresses(p("bcc"));
    for (const [field, list] of [["to", to], ["cc", cc], ["bcc", bcc]] as const) {
      if (list.bad.length) errors[`n.${n.key}.${field}`] = `Not an email address: ${list.bad.slice(0, 3).join(", ")}`;
    }
    notifications[n.key] = {
      enabled: on(`n.${n.key}.enabled`),
      to: n.audience === "studio" ? to.ok : [],
      cc: cc.ok,
      bcc: bcc.ok,
      replyTo: p("replyTo") === "studio" ? "studio" : "person",
      subject: text(p("subject"), 160),
    };
  }

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    settings: {
      open: on("open"),
      closedMessage: text(raw.closedMessage, 400) || d.closedMessage,
      opensOn: isDay(opensOn) ? opensOn : "",
      closesOn: isDay(closesOn) ? closesOn : "",
      limit, limitPer,
      limitMessage: text(raw.limitMessage, 400) || d.limitMessage,
      after,
      afterHeading: text(raw.afterHeading, 120),
      afterMessage: text(raw.afterMessage, 1000),
      redirectTo,
      blockedWords: [...new Set(text(raw.blockedWords, 2000).split(/[\n,]+/).map((w) => w.trim().toLowerCase()).filter((w) => w.length >= 2))].slice(0, 100),
      trashDays: (TRASH_DAYS as readonly number[]).includes(trashDays) ? trashDays : d.trashDays,
      notifications,
    },
  };
}

/** Stored settings merged over the defaults, so a field added later has a value. */
export function mergeSettings(form: FormDef, stored: unknown): FormSettings {
  const d = defaultSettings(form);
  if (!stored || typeof stored !== "object") return d;
  const s = stored as Partial<FormSettings>;
  return {
    ...d, ...s,
    blockedWords: Array.isArray(s.blockedWords) ? s.blockedWords : [],
    notifications: Object.fromEntries(Object.entries(d.notifications).map(([k, v]) => [k, { ...v, ...(s.notifications?.[k] ?? {}) }])),
  };
}

/** Fill a subject's tokens. Values are plain text; the subject is never HTML. */
export function fillTokens(template: string, values: Record<string, string>) {
  return template.replace(/\{([a-z_]+)\}/g, (all, k: string) => (k in values ? values[k] : all)).replace(/[\r\n]+/g, " ").slice(0, 200);
}

/** Today in Lagos, as YYYY-MM-DD. */
export const lagosToday = () => new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 10);

/** Whether a word from the list is in the text, as a whole word. */
export function hasBlockedWord(words: string[], ...texts: string[]) {
  if (!words.length) return false;
  const hay = texts.join(" ").toLowerCase();
  return words.some((w) => new RegExp(`(^|[^\\p{L}\\p{N}])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\p{L}\\p{N}])`, "u").test(hay));
}
