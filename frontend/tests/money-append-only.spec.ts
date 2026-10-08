import { expect, test } from "@playwright/test";
import {
  addInvoice, applyCredit, applyPayment, getAudit, getCreditsFor, getInvoice, getPaymentsFor,
  overpaymentToCredit, patchInvoice, reversePayment,
} from "../lib/admin/store";

/**
 * THE MONEY HISTORY ONLY GROWS.
 *
 * Mistakes are corrected by a new, attributed event -- a reversal, a void, a
 * refund, a credit carried forward -- and the original stays readable. These
 * run against the store module itself, the same one every admin screen reads,
 * so they pin the rule where the writes happen rather than where a form
 * happens to check it.
 */

const LINE = [{ description: "Retainer, October", qty: 1, unit: 100_000_00 }];
const day = (n: number) => new Date(Date.UTC(2026, 9, n)).toISOString();

test("test and unknown-mode Paystack charges cannot settle a real invoice", () => {
  const inv = addInvoice({clientId:"c1",projectId:null,issued:day(1),due:day(30),vatRate:0,lines:LINE,status:"Sent"});
  const before = getInvoice(inv.id)!;
  for (const mode of ["test", undefined] as const) expect(applyPayment({invoiceId:inv.id,amount:100_000_00,method:"Paystack",reference:`TEST-${inv.id}-${mode}`,mode})).toEqual({ok:false,reason:"test-mode"});
  expect(getPaymentsFor(inv.id)).toHaveLength(0);
  expect(getInvoice(inv.id)).toEqual(before);
});

test("an issued invoice can be corrected, but the draft rule and the floor are enforced where the write happens", () => {
  const inv = addInvoice({ clientId: "c1", projectId: null, issued: day(1), due: day(30), vatRate: 0, lines: LINE, status: "Sent" });
  /* Unpaid: a correction is allowed, and audited with the old and new total. */
  const first = patchInvoice(inv.id, { lines: [{ description: "Changed", qty: 1, unit: 80_000_00 }] });
  expect(first.ok).toBe(true);
  expect(getInvoice(inv.id)!.lines[0].description).toBe("Changed");
  expect(getAudit({ subjectId: inv.id }).some((e) => e.action === "edited after it was issued")).toBe(true);

  /* Part paid: the total cannot drop below what has been kept, and nothing moves. */
  expect(applyPayment({ invoiceId: inv.id, amount: 50_000_00, method: "Transfer", reference: `TRF-EDIT-${inv.id}` }).ok).toBe(true);
  const below = patchInvoice(inv.id, { lines: [{ description: "Too low", qty: 1, unit: 40_000_00 }] });
  expect(below.ok).toBe(false);
  expect(getInvoice(inv.id)!.lines[0].description).toBe("Changed");
  expect(patchInvoice(inv.id, { lines: [{ description: "At the floor", qty: 1, unit: 50_000_00 }] }).ok).toBe(true);

  const draft = addInvoice({ clientId: "c1", projectId: null, issued: day(1), due: day(30), vatRate: 0, lines: LINE, status: "Draft" });
  const res = patchInvoice(draft.id, { vatRate: 7.5 });
  expect(res.ok && res.invoice.vatRate).toBe(7.5);
});

test("a reversal marks the payment and keeps it, with who and why", () => {
  const inv = addInvoice({ clientId: "c1", projectId: null, issued: day(2), due: day(30), vatRate: 0, lines: LINE, status: "Sent" });
  const paid = applyPayment({ invoiceId: inv.id, amount: 40_000_00, method: "Transfer", reference: `TRF-${inv.id}` });
  expect(paid.ok).toBe(true);
  if (!paid.ok) return;

  expect(reversePayment(paid.payment.id, "The transfer bounced", "Babatope")).toBe(true);
  const rows = getPaymentsFor(inv.id);
  expect(rows).toHaveLength(1);
  expect(rows[0].amount).toBe(40_000_00);
  expect(rows[0].reversed).toMatchObject({ by: "Babatope", reason: "The transfer bounced" });
  expect(getInvoice(inv.id)!.paid).toBe(0);
  /* And it cannot be reversed twice. */
  expect(reversePayment(paid.payment.id, "again")).toBe(false);
  expect(getAudit({ subjectId: paid.payment.id }).some((e) => e.action === "reversed")).toBe(true);
});

test("spending part of a credit keeps what was put on account", () => {
  const first = addInvoice({ clientId: "c2", projectId: null, issued: day(3), due: day(30), vatRate: 0, lines: LINE, status: "Sent" });
  const over = applyPayment({ invoiceId: first.id, amount: 150_000_00, method: "Transfer", reference: `TRF-${first.id}` });
  expect(over.ok && over.overpaid).toBe(true);
  const moved = overpaymentToCredit(first.id);
  expect(moved.ok).toBe(true);
  if (!moved.ok) return;
  expect(moved.credit.amount).toBe(50_000_00);

  const second = addInvoice({
    clientId: "c2", projectId: null, issued: day(4), due: day(30), vatRate: 0,
    lines: [{ description: "Hosting", qty: 1, unit: 20_000_00 }], status: "Sent",
  });
  const used = applyCredit(moved.credit.id, second.id);
  expect(used.ok).toBe(true);
  if (!used.ok) return;
  expect(used.leftOver).toBe(30_000_00);

  const credits = getCreditsFor("c2");
  const original = credits.find((c) => c.id === moved.credit.id)!;
  expect(original.amount).toBe(50_000_00);
  expect(original.applied).toMatchObject({ invoiceId: second.id, amount: 20_000_00 });
  const rest = credits.find((c) => !c.applied && c.fromInvoiceId === first.id);
  expect(rest?.amount).toBe(30_000_00);
});
