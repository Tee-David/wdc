import assert from "node:assert/strict";
import { normalizePhone } from "../lib/phone.ts";
for (const value of ["8021234567", "08021234567", "+2348021234567", "+234 0802 123 4567"]) assert.equal(normalizePhone(value), "+2348021234567");
for (const value of ["80212345678", "18021234567", "+23480212345678", "080212345678", "+234 hello", "802123456"]) assert.equal(normalizePhone(value), null);
assert.equal(normalizePhone("+44 20 7946 0958"), "+442079460958");
assert.equal(normalizePhone(""), "");
console.log("Shared phone normalization checks passed.");
