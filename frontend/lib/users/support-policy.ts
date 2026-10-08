export const SUPPORT_COOKIE = "wdc-support-view";
/** The owner's read-only view of the admin AS an active staff member. Exclusive with SUPPORT_COOKIE. */
export const SUPPORT_STAFF_COOKIE = "wdc-support-staff";
export const SUPPORT_MINUTES = 15;
export const SUPPORT_EXIT = "/api/support/exit";
export const SUPPORT_READ_ONLY = "This is a read-only support view. Exit it before making changes.";
export const SUPPORT_STAFF_MIGRATION = "Viewing as staff needs migration 0049. Apply it in Settings › System, then try again.";

/** "both" is never created by the app: it is a tampered browser, and everything but Exit is refused. */
export type SupportKind = "client" | "staff" | "both";

/** Which view the cookies describe. Pure, so the proxy can decide without the database. */
export function supportKind(client: boolean, staff: boolean): SupportKind | null {
  if (client && staff) return "both";
  return client ? "client" : staff ? "staff" : null;
}

const ID = /^[A-Za-z0-9_-]{1,128}$/;
/** Segments that are routes of their own, never a record id: downloads, imports and creators. */
const NOT_AN_ID = new Set(["export", "import", "sample", "sheet", "pdf", "new", "welcome"]);
const record = (s: string | undefined) => s !== undefined && ID.test(s) && !NOT_AN_ID.has(s);

/**
 * THE ADMIN PAGES A STAFF VIEW MAY OPEN, and nothing else. Taken from
 * lib/admin/permissions.ts NAV_AREA: what staff can open is the dashboard,
 * clients (with support tickets), projects (tasks live on a project), forms
 * and entries, the blog lists, and the meetings notice. Money, reports, email,
 * users, settings, the blog editor, every export and every API route are refused
 * here even where the page would also refuse a staff role: this list is the
 * second lock, not the first.
 *
 * The path is split and every segment must be a plain id, so `..`, `.`, `//`,
 * an encoded slash (`%2f`), a backslash or a dot-suffix can never match.
 */
export function staffPageAllowed(path: string): boolean {
  if (typeof path !== "string" || path.length > 512 || !path.startsWith("/admin")) return false;
  const clean = path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
  const s = clean.split("/").slice(1); // ["admin", ...]
  if (s[0] !== "admin" || s.some((x) => !ID.test(x))) return false;
  const [, area, a, b, c] = s;
  switch (area) {
    case undefined: return true;
    case "meetings": return s.length === 2;
    /* The two LISTS only. The editor (/admin/blog/<id>) saves as you type and has nothing to read that the list does not show. */
    case "blog": return s.length === 2 || (s.length === 3 && a === "work");
    case "clients":
      if (s.length === 2) return true;
      if (a === "support") return s.length === 3 || (s.length === 4 && record(b));
      return s.length === 3 && record(a);
    case "projects":
      return s.length === 2 || (s.length === 3 && record(a));
    case "forms":
      if (s.length === 2) return true;
      if (a === "all") return s.length === 3;
      if (!record(a)) return false;
      return s.length === 3 || (s.length === 5 && b === "entries" && record(c));
    default: return false;
  }
}

/** A scoped portal view never grants mutation authority; a staff view may only READ allow-listed admin pages. */
export function supportRequestAllowed(path: string, method: string, kind: SupportKind = "client"): boolean {
  if (path === SUPPORT_EXIT) return method === "POST";
  if (kind === "both") return false;
  if (method !== "GET" && method !== "HEAD") return false;
  if (kind === "staff") return staffPageAllowed(path);
  return /^\/portal(?:\/(?:projects|support|meetings)(?:\/[A-Za-z0-9_-]+)?|\/(?:billing|settings))?\/?$/.test(path);
}

/** Where a refused page request is sent. Never a page the same view would refuse (that is a redirect loop). */
export function supportHome(kind: SupportKind): string | null {
  return kind === "staff" ? "/admin" : kind === "client" ? "/portal" : null;
}
