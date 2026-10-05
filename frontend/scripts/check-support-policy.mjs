import assert from "node:assert/strict";
import { supportRequestAllowed, SUPPORT_EXIT } from "../lib/users/support-policy.ts";
for (const path of ["/portal", "/portal/", "/portal/projects", "/portal/projects/p1", "/portal/support/ticket_1", "/portal/settings", "/portal/billing", "/portal/meetings/meeting-1"]) {
  assert.equal(supportRequestAllowed(path, "GET"), true, path);
  assert.equal(supportRequestAllowed(path, "HEAD"), true, path);
  for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) assert.equal(supportRequestAllowed(path, method), false, `${method} ${path}`);
}
for (const path of ["/admin", "/admin/settings/users", "/api/auth/sign-out", "/api/pay/token", "/portal/export", "/portal/projects/p1/download", "/portal/projects/a.pdf", "/portal/projects/../admin", "/portal/projects/%2fadmin", "/portalicious", "/login", "/pay/token"]) {
  for (const method of ["GET", "HEAD", "POST"]) assert.equal(supportRequestAllowed(path, method), false, `${method} ${path}`);
}
assert.equal(supportRequestAllowed(SUPPORT_EXIT, "POST"), true);
assert.equal(supportRequestAllowed(SUPPORT_EXIT, "GET"), false);
console.log("Support route policy: permitted reads and blocked writes, exports, downloads and encoded paths passed.");
