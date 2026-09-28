import { SERVICES, type ServiceSlug } from "@/lib/services";
import {
  APPROVALS, CHANNELS, HEALTH, METHODS, PRIORITIES, STAGES,
  type DeliverableFile, type Stage,
} from "./types";
import { isMediaKey } from "@/lib/media-validate";

/**
 * Reading a form, safely.
 *
 * A SEPARATE FILE FROM THE ACTIONS on purpose: a module carrying "use server"
 * may only export async functions, because every export becomes a callable
 * endpoint. Helpers that are not endpoints have to live somewhere else, and
 * putting them here also means the same parsing can be unit tested without
 * standing up a request.
 *
 * Everything here treats the FormData as hostile. It arrives over the network
 * and the browser is not the only thing that can send it: a server action is a
 * public POST endpoint whether or not a form points at it. So no field is
 * trusted to exist, no number is trusted to be a number, no slug is trusted to
 * be one of ours, and nothing decides a price.
 */

export type Errors = Record<string, string>;

export type ActionState = {
  ok: boolean;
  /** Said back to the person, in their words rather than the system's. */
  message?: string;
  errors?: Errors;
  /**
   * What was submitted, echoed back on a failure so the form can put it back.
   *
   * React resets an uncontrolled form after a form action runs. That is right
   * when the action succeeded and wrong when it did not: a mistyped email
   * would otherwise cost the person every other field they had filled. The
   * form kit attaches this itself, so no action has to remember to.
   */
  values?: Record<string, string | string[]>;
  /**
   * How many failed submits this form has had.
   *
   * It is what the fields key on, so that the values above actually reach the
   * DOM: changing a `defaultValue` on a mounted input does nothing, and only a
   * remount picks it up. Carried in the state rather than in a ref because the
   * state is the one thing that is allowed to be read during a render.
   */
  attempt?: number;
  /**
   * A value the form should send next time, from a success: the record's new
   * `saved_at` for an editor's concurrency check (lib/blog-db.ts `savePost`).
   */
  stamp?: string;
  /**
   * The refusal was "signed out or not allowed" (lib/admin/guard.ts). The
   * form offers a sign-in in a NEW tab, so a dialog left open over lunch keeps
   * everything typed into it and can simply be saved again.
   */
  signIn?: boolean;
};

export const OK = (message: string): ActionState => ({ ok: true, message });
export const FAIL = (errors: Errors, message?: string): ActionState => ({ ok: false, errors, message });

/* ------------------------------------------------------------------ reads */

export const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export function strs(fd: FormData, k: string) {
  return fd.getAll(k).map((v) => String(v).trim()).filter(Boolean);
}

/**
 * Naira typed by a person, to kobo.
 *
 * People type "1,250,000", "₦1250000", "1250000.50" and " 1 250 000 ". All of
 * those mean the same amount and all of them are accepted. What is NOT
 * accepted is the result being a float: the naira value is multiplied and then
 * rounded once, here, so 1250000.555 cannot become a fraction of a kobo that
 * every later sum carries.
 */
export function kobo(fd: FormData, k: string): number | null {
  const raw = str(fd, k).replace(/[₦,\s]/g, "");
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function int(fd: FormData, k: string): number | null {
  const n = Number(str(fd, k));
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export function num(fd: FormData, k: string): number | null {
  const n = Number(str(fd, k));
  return Number.isFinite(n) ? n : null;
}

/** A date input gives "2026-09-26". Stored as an ISO instant at midday UTC so
    that reading it back in Lagos or in London names the same day. */
export function isoDate(fd: FormData, k: string): string | null {
  const v = str(fd, k);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/* ------------------------------------------------------------------ rules */

const SLUGS = new Set(SERVICES.map((s) => s.slug));

export function services(fd: FormData, k = "services"): ServiceSlug[] {
  return strs(fd, k).filter((s): s is ServiceSlug => SLUGS.has(s as ServiceSlug));
}

export function stage(fd: FormData, k = "stage"): Stage | null {
  const v = str(fd, k);
  return (STAGES as readonly string[]).includes(v) ? (v as Stage) : null;
}

/**
 * ONE READER FOR EVERY CLOSED SET, so that adding a value to a union in
 * types.ts cannot leave a validator behind that still accepts the old list.
 * Each of these returns null for anything not in the set, and null is always
 * treated as "not supplied" by the caller rather than as a default -- a form
 * that posts `health=deleted-everything` gets an error, not a silent fallback.
 */
const oneOf = <T extends string>(list: readonly T[]) =>
  (fd: FormData, k: string): T | null => {
    const v = str(fd, k);
    return (list as readonly string[]).includes(v) ? (v as T) : null;
  };

export const health = oneOf(HEALTH);
export const channel = oneOf(CHANNELS);
export const priority = oneOf(PRIORITIES);
export const approval = oneOf(APPROVALS);
export const method = oneOf(METHODS);

/** An HTML checkbox posts its value when ticked and nothing at all when not,
    so presence is the answer and the value never needs reading. */
export const checked = (fd: FormData, k: string) => fd.get(k) !== null;

/**
 * Is this an email address.
 *
 * Deliberately loose. The only check worth making here is that it has the
 * shape of one, because the exhaustive grammar accepts things no mail server
 * will and rejects addresses that work. Whether it receives mail is settled by
 * sending to it, not by a pattern.
 */
export const looksEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

/**
 * A link somebody typed, or nothing.
 *
 * HTTP AND HTTPS ONLY, AND THAT IS THE WHOLE POINT OF CHECKING. A URL field
 * that accepts whatever is typed will one day hold `javascript:...`, and the
 * page that renders it as an href is where that becomes an attack. Anything
 * that is not a parseable http(s) URL comes back null, and null is "not
 * supplied" rather than a default.
 */
export function url(fd: FormData, k: string): string | null {
  const v = str(fd, k);
  if (!v) return null;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Files arrive from the deliverable picker as JSON because one version can
 * carry several uploads. They are still hostile form input: only a small,
 * uniquely-keyed list from the media-library namespace is allowed through.
 * The action separately confirms each key has a live library row.
 */
export function deliverableFiles(fd: FormData, errors: Errors): DeliverableFile[] {
  const raw = str(fd, "files");
  if (!raw) return [];
  let value: unknown;
  try { value = JSON.parse(raw); } catch { errors.files = "The uploaded files could not be read. Remove them and add them again."; return []; }
  if (!Array.isArray(value) || value.length > 10) {
    errors.files = "Add up to 10 uploaded files at a time.";
    return [];
  }
  const seen = new Set<string>();
  const files: DeliverableFile[] = [];
  for (const item of value) {
    const candidate = item && typeof item === "object" ? item as { name?: unknown; key?: unknown } : null;
    if (!candidate || typeof candidate.name !== "string" || typeof candidate.key !== "string") {
      errors.files = "One uploaded file is incomplete. Remove it and add it again.";
      return [];
    }
    const name = candidate.name.trim().replace(/\s+/g, " ");
    if (!name || name.length > 200 || !isMediaKey(candidate.key) || seen.has(candidate.key)) {
      errors.files = "One uploaded file is not available any more. Remove it and add it again.";
      return [];
    }
    seen.add(candidate.key);
    files.push({ name, key: candidate.key });
  }
  return files;
}

export function required(errors: Errors, key: string, value: string, label: string) {
  if (!value) errors[key] = `${label} is needed.`;
  return value;
}
