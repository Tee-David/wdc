import { expect, test } from "@playwright/test";
import {
  addInvoice, applyPayment, getAudit, getInvoice, getPaymentsFor, reconcilePaid,
  refundPayment, reversePayment,
} from "../lib/admin/store";
import { reminderPlan } from "../lib/admin/invoice-reminders";
import { invoiceTotals, paidFrom } from "../lib/admin/types";

/**
 * AMOUNT PAID AND AMOUNT DUE ARE A SUM OF THE PAYMENT ROWS, never a running
 * figure adjusted by hand. Every case checks the stored cache AND the figure
 * derived straight from the rows, and that the two agree.
 */

const TOTAL = 100_000_00;
const LINE = [{ description: "Retainer", qty: 1, unit: TOTAL }];
const day = (n: number) => new Date(Date.UTC(2026, 9, n)).toISOString();
let seq = 0;

function invoice() {
  return addInvoice({ clientId: "c1", projectId: null, issued: day(1), due: day(30), vatRate: 0, lines: LINE, status: "Sent" });
}
function pay(invoiceId: string, amount: number, reference = `TRF-${invoiceId}-${++seq}`) {
  const r = applyPayment({ invoiceId, amount, method: "Transfer", reference });
  if (!r.ok) throw new Error(`payment refused: ${r.reason}`);
  return r.payment;
}
/** Both views of the same invoice, which must never disagree. */
function figures(id: string) {
  const inv = getInvoice(id)!;
  const rows = getPaymentsFor(id);
  const stored = invoiceTotals(inv);
  const derived = invoiceTotals(inv, rows);
  expect(stored.due).toBe(derived.due);
  expect(inv.paid).toBe(paidFrom(rows));
  return { paid: inv.paid, due: stored.due };
}

test("partial payments add up and the balance falls with them", () => {
  const inv = invoice();
  pay(inv.id, 30_000_00);
  expect(figures(inv.id)).toEqual({ paid: 30_000_00, due: 70_000_00 });
  pay(inv.id, 20_000_00);
  expect(figures(inv.id)).toEqual({ paid: 50_000_00, due: 50_000_00 });
});

test("a full payment settles it", () => {
  const inv = invoice();
  pay(inv.id, TOTAL);
  expect(figures(inv.id)).toEqual({ paid: TOTAL, due: 0 });
});

test("a partial refund puts the money back on the balance, and the payment row keeps its amount", () => {
  const inv = invoice();
  const p = pay(inv.id, TOTAL);
  const r = refundPayment({ paymentId: p.id, amount: 25_000_00, reason: "Scope cut", toCredit: false, actor: "Babatope" });
  expect(r.ok).toBe(true);
  expect(figures(inv.id)).toEqual({ paid: 75_000_00, due: 25_000_00 });
  expect(getPaymentsFor(inv.id)[0].amount).toBe(TOTAL);
});

test("a full refund, in parts, takes it back to nothing paid", () => {
  const inv = invoice();
  const p = pay(inv.id, 40_000_00);
  expect(refundPayment({ paymentId: p.id, amount: 15_000_00, reason: "First part", toCredit: false }).ok).toBe(true);
  expect(refundPayment({ paymentId: p.id, amount: 25_000_00, reason: "The rest", toCredit: true }).ok).toBe(true);
  expect(figures(inv.id)).toEqual({ paid: 0, due: TOTAL });
});

test("a reversal takes the whole payment off and the row stays", () => {
  const inv = invoice();
  const a = pay(inv.id, 30_000_00);
  pay(inv.id, 10_000_00);
  expect(reversePayment(a.id, "Transfer bounced", "Babatope")).toBe(true);
  expect(figures(inv.id)).toEqual({ paid: 10_000_00, due: 90_000_00 });
  expect(getPaymentsFor(inv.id)).toHaveLength(2);
});

test("refund then reverse counts the payment once, as nothing", () => {
  const inv = invoice();
  const p = pay(inv.id, 50_000_00);
  expect(refundPayment({ paymentId: p.id, amount: 20_000_00, reason: "Part back", toCredit: false }).ok).toBe(true);
  expect(reversePayment(p.id, "Never cleared")).toBe(true);
  expect(figures(inv.id)).toEqual({ paid: 0, due: TOTAL });
  /* and a reversed payment cannot then be refunded */
  expect(refundPayment({ paymentId: p.id, amount: 1, reason: "x", toCredit: false })).toMatchObject({ ok: false, reason: "reversed" });
});

test("a refund bigger than what is left, alone or in two, is refused and changes nothing", () => {
  const inv = invoice();
  const p = pay(inv.id, 30_000_00);
  expect(refundPayment({ paymentId: p.id, amount: 30_000_01, reason: "too much", toCredit: false })).toMatchObject({ ok: false, reason: "too-much" });
  expect(refundPayment({ paymentId: p.id, amount: 20_000_00, reason: "ok", toCredit: false }).ok).toBe(true);
  expect(refundPayment({ paymentId: p.id, amount: 10_000_01, reason: "two refunds exceed it", toCredit: false })).toMatchObject({ ok: false, reason: "too-much" });
  expect(refundPayment({ paymentId: p.id, amount: 0, reason: "zero", toCredit: false })).toMatchObject({ ok: false, reason: "not-positive" });
  expect(refundPayment({ paymentId: p.id, amount: 5_000_00, reason: "  ", toCredit: false })).toMatchObject({ ok: false, reason: "no-reason" });
  expect(figures(inv.id)).toEqual({ paid: 10_000_00, due: 90_000_00 });
});

test("the same reference twice is refused and adds nothing", () => {
  const inv = invoice();
  pay(inv.id, 10_000_00, `DUP-${inv.id}`);
  const again = applyPayment({ invoiceId: inv.id, amount: 10_000_00, method: "Transfer", reference: `DUP-${inv.id}` });
  expect(again).toEqual({ ok: false, reason: "duplicate" });
  expect(getPaymentsFor(inv.id)).toHaveLength(1);
  expect(figures(inv.id)).toEqual({ paid: 10_000_00, due: 90_000_00 });
});

test("a drifted cache is put right from the rows", () => {
  const inv = invoice();
  pay(inv.id, 10_000_00);
  getInvoice(inv.id)!.paid = 99_999_00; // what a last-write-wins race could leave behind
  expect(reconcilePaid()).toBeGreaterThanOrEqual(1);
  expect(figures(inv.id)).toEqual({ paid: 10_000_00, due: 90_000_00 });
});

test("a reversal and a refund each leave a history line naming receipt, amount, who and why", () => {
  const inv = invoice();
  const a = pay(inv.id, 30_000_00);
  const b = pay(inv.id, 20_000_00);
  refundPayment({ paymentId: a.id, amount: 5_000_00, reason: "Goodwill", toCredit: false, actor: "Ada" });
  reversePayment(b.id, "Bounced", "Babatope");

  const refunded = getAudit({ subjectId: a.id }).find((e) => e.action === "refunded")!;
  expect(refunded.subject).toBe(a.receiptNo);
  expect(refunded.actor).toBe("Ada");
  expect(refunded.note).toContain("Goodwill");
  expect(refunded.note).toContain("5,000.00");

  const reversed = getAudit({ subjectId: b.id }).find((e) => e.action === "reversed")!;
  expect(reversed.subject).toBe(b.receiptNo);
  expect(reversed.actor).toBe("Babatope");
  expect(reversed.note).toContain("Bounced");
  expect(reversed.note).toContain("20,000.00");
});

/* ------------------------------------------------ the reminders block */

const REM = { id: "i1", due: "2026-10-10T00:00:00.000Z", voided: undefined };
const msg = (key: string, state: "Sent" | "Skipped" | "Failed", by = "Reminder schedule", at = "2026-10-10T08:00:00.000Z") =>
  ({ at, state, dedupeKey: key, by, summary: "s", error: undefined });

test("reminders: slots come from the settings, state from the log, nothing invented", () => {
  const plan = reminderPlan({
    invoice: REM, due: 100, days: [-3, 0, 7], today: "2026-10-10",
    messages: [msg("reminder:i1:2026-10-07", "Sent", "Reminder schedule", "2026-10-07T08:00:00.000Z")],
  });
  expect(plan.off).toBe(false);
  expect(plan.rows.map((r) => [r.date, r.state])).toEqual([
    ["2026-10-07", "sent"], ["2026-10-10", "scheduled"], ["2026-10-17", "scheduled"],
  ]);
  expect(plan.extras).toEqual([]);
});

test("reminders: off, settled, past and manual cases are told apart", () => {
  expect(reminderPlan({ invoice: REM, due: 100, days: [], messages: [], today: "2026-10-10" })).toMatchObject({ off: true, rows: [] });
  const settled = reminderPlan({ invoice: REM, due: 0, days: [0], messages: [], today: "2026-10-01" });
  expect(settled.rows[0].state).toBe("not-needed");
  const missed = reminderPlan({ invoice: REM, due: 100, days: [-3], messages: [], today: "2026-10-12" });
  expect(missed.rows[0].state).toBe("not-sent");
  const manual = reminderPlan({
    invoice: REM, due: 100, days: [0], today: "2026-10-12",
    messages: [msg("reminder:i1:2026-10-12", "Sent", "Babatope", "2026-10-12T09:00:00.000Z")],
  });
  expect(manual.rows[0].state).toBe("not-sent");
  expect(manual.extras).toMatchObject([{ label: "Sent by Babatope", state: "sent", date: "2026-10-12" }]);
  const optedOut = reminderPlan({ invoice: REM, due: 100, days: [0], messages: [], today: "2026-10-01", clientAllows: false });
  expect(optedOut.rows[0].state).toBe("skipped");
});
