import assert from "node:assert/strict";
import { userFilter } from "../lib/users/filter.ts";
import { userCsv } from "../lib/users/export.ts";

assert.deepEqual(userFilter({ tab: "bogus", size: "999", page: "-4", role: "administrator", status: "hacked" }), { tab: "team", search: "", role: "", status: "", page: 1, size: 25 });
assert.equal(userFilter({ tab: "clients", q: " x ", page: "2", size: "100" }).search, "x");
assert.equal(userFilter({ q: "x".repeat(200) }).search.length, 120);
assert.equal(userFilter({ page: "999999999" }).page, 100000);
const csv = userCsv([{ name: '=HYPERLINK("bad")', email: "normal@example.com" }, { name: "  +1+1", email: "@SUM(1)" }, { name: "line\nbreak", email: 'quote"value' }]);
assert.ok(csv.includes('"\'=HYPERLINK(""bad"")"'));
assert.ok(csv.includes('"\'  +1+1"'));
assert.ok(csv.includes('"\'@SUM(1)"'));
assert.ok(csv.includes('"line\nbreak"'));
assert.ok(csv.includes('"quote""value"'));
console.log("Users filter bounds and CSV formula protection passed.");
