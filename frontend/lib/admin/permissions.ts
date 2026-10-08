/**
 * WHO MAY DO WHAT IN THE ADMIN.
 *
 * Two roles reach /admin. The owner can do everything. Staff run the day's
 * work -- clients, projects, forms, and the site's content -- and do not see
 * or touch the books, the settings, the team, exports, or anything that
 * cannot be undone from the screen that did it.
 *
 * ONE TABLE, READ BY THREE PLACES: the guard every server action calls
 * (`allow()` in ./guard.ts), the pages that decide what to draw, and the
 * shell's navigation. The navigation is only a courtesy; the guard is the
 * permission. A page hidden from the menu is still refused at the action.
 *
 * Pure, with no server imports, so the client shell can read it too.
 */

export type AdminRole = "owner" | "staff";

export type Area =
  | "clients"     // records, contacts, messages, tickets, portal invitations
  | "projects"    // stages, tasks, updates, deliverables, approvals
  | "forms"       // submissions and turning them into clients
  | "content"     // blog, FAQ, media library
  | "money"       // invoices, payments, expenses, estimates, credit
  | "settings"    // site settings, finance defaults, integrations
  | "team"        // who has access, invitations to staff, sessions
  | "exports"     // CSV downloads of whole tables
  | "destructive"; // archive or merge a client, archive a project

const STAFF: ReadonlySet<Area> = new Set<Area>(["clients", "projects", "forms", "content"]);

export function isAdminRole(role: unknown): role is AdminRole {
  return role === "owner" || role === "staff";
}

export function can(role: unknown, area: Area): boolean {
  if (role === "owner") return true;
  if (role === "staff") return STAFF.has(area);
  return false;
}

/** The first page of the admin a role may open, for links that would otherwise 403. */
export const NAV_AREA: Record<string, Area | null> = {
  "/admin": null,
  "/admin/clients": "clients",
  "/admin/projects": "projects",
  "/admin/meetings": "settings", // Owner only until scoped staff delegation is configured.
  "/admin/money": "money",
  "/admin/forms": "forms",
  "/admin/blog": "content",
  "/admin/users": "team",
  "/admin/settings": null,
};
