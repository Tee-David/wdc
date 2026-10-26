// A monthly retainer's schedule: dates, amounts that add up, and billing changes midway.
import assert from "node:assert/strict";
import { addMonths, dueParts, remainingParts, termEnd } from "../lib/admin/retainer-rules.ts";

const plan = (over = {}) => ({ start: "2026-11-01", months: 3, monthly: 300_000_00, billing: "Monthly", drafted: [], ...over });
const sum = (xs) => xs.reduce((n, x) => n + x.amount, 0);

assert.equal(addMonths("2027-01-31", 1), "2027-02-28", "day clamped to the month");
assert.equal(termEnd("2026-11-01", 3), "2027-01-31");

assert.deepEqual(remainingParts(plan()).map((x) => [x.date, x.amount]), [["2026-11-01", 300_000_00], ["2026-12-01", 300_000_00], ["2027-01-01", 300_000_00]]);
assert.deepEqual(remainingParts(plan({ billing: "Two parts" })).map((x) => [x.date, x.amount]), [["2026-11-01", 450_000_00], ["2026-12-01", 450_000_00]], "the kit's two parts: before the start and on 1 Dec");
assert.deepEqual(remainingParts(plan({ billing: "Whole term up front" })).map((x) => [x.date, x.amount]), [["2026-11-01", 900_000_00]]);

/* Two parts, the first drafted, then switched to monthly: the 450,000 left is spread over Dec and Jan. */
const switched = remainingParts(plan({ drafted: [{ date: "2026-11-01", amount: 450_000_00 }] }));
assert.deepEqual(switched.map((x) => [x.date, x.amount, x.n, x.of]), [["2026-12-01", 225_000_00, 2, 3], ["2027-01-01", 225_000_00, 3, 3]]);

/* Odd kobo go on the first part; the parts always add up. */
const odd = remainingParts(plan({ monthly: 100_00, months: 3, billing: "Monthly", drafted: [{ date: "2026-11-01", amount: 1 }] }));
assert.equal(sum(odd) + 1, 300_00);

/* Switched to whole term after every date has passed: one part, at the next month. */
assert.deepEqual(remainingParts(plan({ billing: "Whole term up front", drafted: [{ date: "2026-11-01", amount: 300_000_00 }] })).map((x) => [x.date, x.amount]), [["2026-12-01", 600_000_00]]);

assert.equal(remainingParts(plan({ drafted: [{ date: "2026-11-01", amount: 900_000_00 }] })).length, 0, "nothing after the total is drafted");
assert.deepEqual(dueParts(plan(), "2026-12-01").map((x) => x.date), ["2026-11-01", "2026-12-01"]);
assert.equal(dueParts(plan(), "2026-10-31").length, 0);
/* Quarterly over six months: two parts, three months apart; over four months the last quarter is short. */
assert.deepEqual(remainingParts(plan({ months: 6, billing: "Quarterly" })).map((x) => [x.date, x.amount]), [["2026-11-01", 900_000_00], ["2027-02-01", 900_000_00]]);
assert.deepEqual(remainingParts(plan({ months: 4, billing: "Quarterly" })).map((x) => x.amount), [900_000_00, 300_000_00], "a short last quarter asks for one month");
console.log("retainer schedule: ok");
