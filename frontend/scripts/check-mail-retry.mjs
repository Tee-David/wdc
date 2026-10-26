// The automatic mail retry rule: what is retried, how far apart, how many times.
import assert from "node:assert/strict";
import { AUTO_RETRY_MINUTES, dueAttempt, retryable } from "../lib/mail-retry-rule.ts";

const min = 60_000, t0 = Date.parse("2026-10-26T09:00:00Z");
const spam = "Message failed: 550 5.7.1 Message discarded as high-probability spam";

assert.equal(retryable(spam), true);
assert.equal(retryable("Connection timeout"), true);
assert.equal(retryable("421 Service not available, try again later"), true);
assert.equal(retryable("550 5.1.1 User unknown"), false, "a refused address is not retried");
assert.equal(retryable("SMTP is not configured on this deployment."), false);
assert.equal(retryable(null), false);

const row = (over = {}) => ({ error: spam, createdAt: t0, tries: [], earlier: 0, ...over });
assert.equal(dueAttempt(row(), t0 + 9 * min), 0, "not before ten minutes");
assert.equal(dueAttempt(row(), t0 + 10 * min), 1, "first try at ten minutes");
assert.equal(dueAttempt(row({ tries: [t0 + 10 * min] }), t0 + 69 * min), 0, "second waits an hour after the first");
assert.equal(dueAttempt(row({ tries: [t0 + 10 * min] }), t0 + 70 * min), 2);
assert.equal(dueAttempt(row({ earlier: 1, createdAt: t0 + 10 * min }), t0 + 70 * min), 2, "money retries count their retired rows");
assert.equal(dueAttempt(row({ earlier: 2, createdAt: t0 }), t0 + 360 * min), 3);
assert.equal(dueAttempt(row({ earlier: AUTO_RETRY_MINUTES.length }), t0 + 9999 * min), 0, "stops after its tries");
assert.equal(dueAttempt(row({ error: "550 5.1.1 User unknown" }), t0 + 9999 * min), 0);
console.log("mail retry rule: ok");
