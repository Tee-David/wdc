import { expect, test } from "@playwright/test";
import { can, NAV_AREA } from "../lib/admin/permissions";
import {
  SUPPORT_COOKIE,
  SUPPORT_EXIT,
  SUPPORT_STAFF_COOKIE,
  staffPageAllowed,
  supportHome,
  supportKind,
  supportRequestAllowed,
} from "../lib/users/support-policy";

/**
 * The read-only support views, pure: no browser, no database. The proxy
 * decides from cookie NAMES and these functions alone, so this is the lock
 * that has to hold even if a layout, a guard or a page forgets.
 */

const METHODS = ["POST", "PUT", "PATCH", "DELETE", "OPTIONS", "TRACE", "CONNECT", "post", "FOO", ""];
const STAFF_PAGES = [
  "/admin", "/admin/", "/admin/clients", "/admin/clients/", "/admin/clients/c1", "/admin/clients/support", "/admin/clients/support/t_1",
  "/admin/projects", "/admin/projects/p-9", "/admin/forms", "/admin/forms/all", "/admin/forms/contact", "/admin/forms/onboarding-web/entries/abc123",
  "/admin/meetings", "/admin/blog", "/admin/blog/work",
];
const REFUSED_FOR_STAFF = [
  "/admin/settings", "/admin/settings/team", "/admin/settings/system", "/admin/users", "/admin/users/u1", "/admin/users/departments",
  "/admin/email", "/admin/email/contacts/export", "/admin/email/campaigns/x", "/admin/money", "/admin/money/export", "/admin/money/i1", "/admin/reports", "/admin/reports/export",
  "/admin/clients/export", "/admin/projects/export", "/admin/blog/p1", "/admin/blog/work/slug", "/admin/blog/work/x/y", "/admin/blog/export", "/admin/forms/export", "/admin/forms/all/export", "/admin/forms/contact/export",
  "/admin/forms/contact/entries/abc/pdf", "/admin/forms/new", "/admin/welcome", "/admin/settings/audit/export",
  "/api/admin/users/export", "/api/auth/sign-out", "/api/tours", "/api/meetings", "/api/support/exit/x", "/portal", "/portal/billing", "/login", "/", "/signed-in",
  "/administrator", "/admin.json", "/adminx/clients",
];

test("any method other than GET/HEAD is refused in every view, except Exit", () => {
  for (const kind of ["client", "staff", "both"] as const) {
    for (const method of METHODS) {
      for (const path of [...STAFF_PAGES, "/portal", "/portal/billing", SUPPORT_EXIT + "/", "/api/anything"]) {
        expect(supportRequestAllowed(path, method, kind), `${kind} ${method} ${path}`).toBe(false);
      }
    }
  }
});

test("Exit is a POST, in every view and only a POST", () => {
  for (const kind of ["client", "staff", "both"] as const) {
    expect(supportRequestAllowed(SUPPORT_EXIT, "POST", kind)).toBe(true);
    expect(supportRequestAllowed(SUPPORT_EXIT, "GET", kind)).toBe(false);
    expect(supportRequestAllowed(SUPPORT_EXIT, "PUT", kind)).toBe(false);
  }
});

test("a staff view reads the staff pages and nothing else", () => {
  for (const path of STAFF_PAGES) {
    expect(supportRequestAllowed(path, "GET", "staff"), path).toBe(true);
    expect(supportRequestAllowed(path, "HEAD", "staff"), path).toBe(true);
  }
  for (const path of REFUSED_FOR_STAFF) expect(supportRequestAllowed(path, "GET", "staff"), path).toBe(false);
});

test("settings, users, email, money and every export are refused to a staff view", () => {
  for (const path of ["/admin/settings", "/admin/users", "/admin/email", "/admin/money", "/admin/reports"]) {
    expect(staffPageAllowed(path)).toBe(false);
    expect(staffPageAllowed(path + "/anything")).toBe(false);
  }
  for (const seg of ["export", "import", "sample", "sheet", "pdf", "new"]) {
    for (const base of ["clients", "projects", "forms", "forms/contact", "forms/all", "forms/contact/entries/e1"]) {
      expect(staffPageAllowed(`/admin/${base}/${seg}`), `${base}/${seg}`).toBe(false);
    }
  }
  expect(staffPageAllowed("/admin/forms/contact/entries/export")).toBe(false);
});

test("a path that climbs, hides a slash or smuggles a character is refused", () => {
  for (const path of [
    "/admin/clients/../settings", "/admin/../admin/clients", "/admin/clients/..", "/admin/clients/.", "/admin//clients", "//admin/clients",
    "/admin/clients%2f..%2fsettings", "/admin/clients/%2e%2e", "/admin/clients/a%2fb", "/admin/clients/a\\b", "/admin/clients/a b",
    "/admin/clients/c1.json", "/admin/clients/c1;x", "/admin/clients/c1?x=1", "/admin/clients/c1#x", "/admin/clients/c1\u0000", "/admin/clients/‮",
    "/admin/clients//", "/admin/clients///", "/admin/" + "a".repeat(600),
  ]) {
    expect(staffPageAllowed(path), JSON.stringify(path)).toBe(false);
    expect(supportRequestAllowed(path, "GET", "staff"), JSON.stringify(path)).toBe(false);
  }
});

test("one trailing slash is tolerated and two are not", () => {
  expect(staffPageAllowed("/admin/clients/")).toBe(true);
  expect(staffPageAllowed("/admin/clients/c1/")).toBe(true);
  expect(staffPageAllowed("/admin/clients//")).toBe(false);
  expect(staffPageAllowed("/admin/settings/")).toBe(false);
});

test("the client view's portal rule is unchanged, and it never opens the admin", () => {
  for (const path of ["/portal", "/portal/", "/portal/projects", "/portal/projects/p1", "/portal/support", "/portal/support/t1", "/portal/meetings", "/portal/meetings/m1", "/portal/billing", "/portal/settings"]) {
    expect(supportRequestAllowed(path, "GET"), path).toBe(true);
    expect(supportRequestAllowed(path, "GET", "client"), path).toBe(true);
    expect(supportRequestAllowed(path, "HEAD", "client"), path).toBe(true);
    expect(supportRequestAllowed(path, "POST", "client"), path).toBe(false);
    expect(supportRequestAllowed(path, "GET", "staff"), path).toBe(false);
  }
  for (const path of ["/portal/billing/x", "/portal/settings/x", "/portal/projects/a/b", "/portal/other", "/portal/../admin", "/admin", "/admin/clients", "/api/portal", "/"]) {
    expect(supportRequestAllowed(path, "GET", "client"), path).toBe(false);
  }
});

test("two cookies at once is a tampered browser: only Exit works", () => {
  for (const path of [...STAFF_PAGES, "/portal", "/login"]) expect(supportRequestAllowed(path, "GET", "both"), path).toBe(false);
  expect(supportKind(true, true)).toBe("both");
  expect(supportKind(true, false)).toBe("client");
  expect(supportKind(false, true)).toBe("staff");
  expect(supportKind(false, false)).toBeNull();
  expect(SUPPORT_COOKIE).not.toBe(SUPPORT_STAFF_COOKIE);
});

test("a refused page is sent somewhere the same view allows (no redirect loop)", () => {
  expect(supportHome("both")).toBeNull();
  for (const kind of ["client", "staff"] as const) {
    const home = supportHome(kind)!;
    expect(supportRequestAllowed(home, "GET", kind), kind).toBe(true);
  }
});

test("everything a staff view may open is something staff can open, and the owner-only guards read role staff", () => {
  /* The effective role during a staff view is "staff" (getAdminRequest swaps the identity),
     so owner()/ownerFresh()/usersOwner, which need "owner", and every area staff lack, refuse. */
  for (const area of ["money", "settings", "team", "exports", "destructive"] as const) expect(can("staff", area), area).toBe(false);
  for (const area of ["clients", "projects", "forms"] as const) expect(can("staff", area), area).toBe(true);
  expect(can(null, "clients")).toBe(false);
  expect(can("client", "clients")).toBe(false);
  expect(can("both", "clients")).toBe(false);
  for (const path of STAFF_PAGES) {
    const section = "/" + path.split("/").filter(Boolean).slice(0, 2).join("/");
    const area = NAV_AREA[section === "/admin" ? "/admin" : section];
    if (section === "/admin/meetings") continue; // the page itself tells staff it is the owner's; nothing to read beyond that
    expect(area === null || area === undefined || can("staff", area), path).toBe(true);
  }
});
