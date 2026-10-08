import { expect, test } from "@playwright/test";
import {
  addInvoice, applyCredit, applyCreditsTo, applyPayment, creditBalance, creditBalances, getAudit, getCreditsFor,
  getInvoice, getInvoicesFor, getPayments, getPaymentsFor, overpaymentToCredit, paymentReferenceTaken,
  patchInvoice, queueMessage, refundPayment, retryMessage, reversePayment, settleMessage, voidInvoice,
} from "../lib/admin/store";
import {
  advanceAmount, checkInvoiceEdit, invoiceMailVerdict, mailKey, noticeBlock, noticeBlocks, noticeVerdict,
  paymentReference, reconcileClient, reconcileInvoice, totalOfLines,
} from "../lib/admin/money-rules";
import { invoiceStatus, invoiceTotals, paidFrom } from "../lib/admin/types";

/**
 * THE PAYMENT LIFECYCLE'S PURE PARTS: who may be emailed, what an invoice edit
 * may do, which invoices may be mailed, how a prepaid invoice is settled, the
 * dedupe keys that make "exactly once" true, and a reconciliation that always
 * adds up. Run against the store module and lib/admin/money-rules.ts, the same
 * code the actions call. No browser, database or mail server.
 */

const day = (n: number) => new Date(Date.UTC(2026, 9, n)).toISOString();
const line = (unit: number) => [{ description: "Work", qty: 1, unit }];
let n = 0;
const ref = () => `PL-${++n}`;
const raise = (clientId: string, unit: number, status: "Draft" | "Sent" = "Sent", vatRate = 0) =>
  addInvoice({ clientId, projectId: null, issued: day(1), due: day(30), vatRate, lines: line(unit), status });
const pay = (invoiceId: string, amount: number, method: "Transfer" | "Cash" | "POS" = "Transfer") => {
  const r = applyPayment({ invoiceId, amount, method, reference: ref() });
  if (!r.ok) throw new Error(`refused: ${r.reason}`);
  return r.payment;
};

/* ---------------------------------------------------- who may be emailed */

test("a client is emailed unless there is no address or they switched updates off", () => {
  expect(noticeVerdict({ email: "ada@example.com" })).toEqual({ send: true, to: "ada@example.com" });
  expect(noticeVerdict({ email: "  " })).toMatchObject({ send: false, reason: "no-address" });
  expect(noticeVerdict(null)).toMatchObject({ send: false, reason: "no-address" });
  expect(noticeVerdict({ email: "ada@example.com", notify: { updates: false } })).toMatchObject({ send: false, reason: "opted-out" });
  /* Reminders are a different switch and do not stop a receipt. */
  expect(noticeVerdict({ email: "ada@example.com", notify: { reminders: false } }).send).toBe(true);
  /* A receipt for an online payment is a record, not a notification. */
  expect(noticeVerdict({ email: "ada@example.com", notify: { updates: false } }, { record: true }).send).toBe(true);
  expect(noticeVerdict({ email: "", notify: {} }, { record: true }).send).toBe(false);
});

test("the tick is disabled with a reason that names the fix, and only for the clients who need it", () => {
  expect(noticeBlock({ email: "a@b.co" })).toBeUndefined();
  expect(noticeBlock({ email: "" })).toMatch(/No email address.*Add one/);
  expect(noticeBlock({ email: "a@b.co", notify: { updates: false } })).toMatch(/switched updates off/);
  expect(noticeBlocks([{ id: "a", email: "a@b.co" }, { id: "b", email: "" }, { id: "c", email: "c@b.co", notify: { updates: false } }]))
    .toEqual({ b: expect.stringMatching(/No email/), c: expect.stringMatching(/switched/) });
});

/* ------------------------------------------------------- editing invoices */

test("an issued invoice can be edited while unpaid or part paid, never below what has been received", () => {
  const draft = { status: "Draft" as const, vatRate: 0, lines: line(100_00) };
  const issued = { status: "Sent" as const, vatRate: 0, lines: line(100_00) };
  expect(checkInvoiceEdit(draft, 0, { lines: line(1), vatRate: 0 }).ok).toBe(true);
  expect(checkInvoiceEdit(issued, 0, { lines: line(150_00), vatRate: 0 })).toMatchObject({ ok: true, before: 100_00, after: 150_00 });

  const low = checkInvoiceEdit(issued, 60_00, { lines: line(50_00), vatRate: 0 });
  expect(low.ok).toBe(false);
  if (!low.ok) expect(low.say).toMatch(/already been received/);
  /* The floor itself is allowed, and VAT counts towards the total. */
  expect(checkInvoiceEdit(issued, 60_00, { lines: line(60_00), vatRate: 0 }).ok).toBe(true);
  expect(checkInvoiceEdit(issued, 60_00, { lines: line(50_00), vatRate: 25 }).ok).toBe(true);
  expect(totalOfLines(line(50_00), 25)).toBe(62_50);

  const voided = { ...issued, voided: { at: day(2), by: "A", reason: "x" } };
  expect(checkInvoiceEdit(voided, 0, { lines: line(1), vatRate: 0 }).ok).toBe(false);
});

test("the store enforces the floor and audits every edit, so a second caller cannot forget", () => {
  const inv = raise("pl-edit", 100_000_00);
  pay(inv.id, 40_000_00);
  const refused = patchInvoice(inv.id, { lines: line(30_000_00) }, "Babatope");
  expect(refused.ok).toBe(false);
  expect(getInvoice(inv.id)!.lines).toEqual(line(100_000_00));

  const ok = patchInvoice(inv.id, { lines: line(120_000_00), vatRate: 7.5 }, "Babatope");
  expect(ok).toMatchObject({ ok: true, before: 100_000_00, after: 129_000_00 });
  const entry = getAudit({ subjectId: inv.id }).find((e) => e.action === "edited after it was issued");
  expect(entry).toMatchObject({ actor: "Babatope" });
  expect(entry?.note).toMatch(/lines/);
  expect(entry?.note).toMatch(/VAT 0% to 7.5%/);

  /* A struck invoice is closed. */
  const gone = raise("pl-edit", 10_00);
  expect(voidInvoice(gone.id, "Wrong client", "Babatope").ok).toBe(true);
  expect(patchInvoice(gone.id, { vatRate: 5 }).ok).toBe(false);
  /* And nothing changes if nothing moved: no audit line. */
  const same = raise("pl-edit", 10_00);
  const before = getAudit({ subjectId: same.id }).length;
  expect(patchInvoice(same.id, { lines: line(10_00) }).ok).toBe(true);
  expect(getAudit({ subjectId: same.id }).length).toBe(before);
});

/* ------------------------------------------------------ emailing invoices */

test("Email invoice is refused for a draft, a struck invoice and a settled one, but not a part-paid one", () => {
  const draft = raise("pl-mail", 50_00, "Draft");
  expect(invoiceMailVerdict(draft)).toMatchObject({ ok: false, reason: "draft" });

  const open = raise("pl-mail", 50_00);
  expect(invoiceMailVerdict(open).ok).toBe(true);
  pay(open.id, 20_00);
  expect(invoiceMailVerdict(getInvoice(open.id)!).ok).toBe(true);
  pay(open.id, 30_00);
  const settled = invoiceMailVerdict(getInvoice(open.id)!);
  expect(settled).toMatchObject({ ok: false, reason: "settled" });
  if (!settled.ok) expect(settled.say).toMatch(/receipt/);

  const struck = raise("pl-mail", 50_00);
  voidInvoice(struck.id, "Wrong client");
  expect(invoiceMailVerdict(getInvoice(struck.id)!)).toMatchObject({ ok: false, reason: "void" });
});

/* ------------------------------------------------------------ paid ahead */

test("references: a transfer needs the bank's; cash, card and POS get one made, unless a slip was typed", () => {
  expect(paymentReference("Transfer", "")).toMatchObject({ ok: false });
  expect(paymentReference("Transfer", " TRF_9 ")).toEqual({ ok: true, reference: "TRF_9" });
  const made = paymentReference("POS", "");
  expect(made.ok && made.reference).toMatch(/^POS-[0-9A-F]{8}$/);
  expect(paymentReference("Cash", "slip 4")).toEqual({ ok: true, reference: "slip 4" });
  const a = paymentReference("Cash", ""), b = paymentReference("Cash", "");
  expect(a.ok && b.ok && a.reference !== b.reference).toBe(true);
});

test("a prepaid amount defaults to the whole invoice, may be part of it, and is never more", () => {
  expect(advanceAmount(100_00, null)).toEqual({ ok: true, amount: 100_00 });
  expect(advanceAmount(100_00, 40_00)).toEqual({ ok: true, amount: 40_00 });
  expect(advanceAmount(100_00, 100_00).ok).toBe(true);
  expect(advanceAmount(100_00, 100_01).ok).toBe(false);
  expect(advanceAmount(100_00, 0).ok).toBe(false);
  expect(advanceAmount(0, null).ok).toBe(false);
});

test("an invoice raised already paid is issued and settled in one step, with the payment on the books", () => {
  const total = totalOfLines(line(80_000_00), 7.5);
  const inv = raise("pl-ahead", 80_000_00, "Sent", 7.5);
  expect(paymentReferenceTaken("TRF-AHEAD-1")).toBe(false);
  const settled = applyPayment({ invoiceId: inv.id, amount: total, method: "Transfer", reference: "TRF-AHEAD-1", at: day(3), by: "Babatope", note: "Paid before this invoice was raised." });
  expect(settled.ok).toBe(true);
  expect(invoiceStatus(getInvoice(inv.id)!)).toBe("Paid");
  expect(invoiceTotals(getInvoice(inv.id)!).due).toBe(0);
  expect(getPaymentsFor(inv.id)[0]).toMatchObject({ method: "Transfer", by: "Babatope", at: day(3) });
  expect(invoiceMailVerdict(getInvoice(inv.id)!)).toMatchObject({ reason: "settled" });
  /* The same bank reference cannot settle a second invoice. */
  expect(paymentReferenceTaken("TRF-AHEAD-1")).toBe(true);
  const other = raise("pl-ahead", 10_00);
  expect(applyPayment({ invoiceId: other.id, amount: 10_00, method: "Transfer", reference: "TRF-AHEAD-1" })).toEqual({ ok: false, reason: "duplicate" });

  /* Part paid in advance leaves a balance. */
  const part = raise("pl-ahead", 100_00);
  pay(part.id, 25_00, "Cash");
  expect(invoiceStatus(getInvoice(part.id)!)).toBe("Part paid");
  expect(invoiceTotals(getInvoice(part.id)!).due).toBe(75_00);
});

test("stored credit settles a new invoice oldest first, never more than it owes, and never another client's", () => {
  const first = raise("pl-credit", 100_00);
  pay(first.id, 150_00); // 50 over
  expect(overpaymentToCredit(first.id).ok).toBe(true);
  const second = raise("pl-credit", 100_00);
  pay(second.id, 130_00); // 30 over
  expect(overpaymentToCredit(second.id).ok).toBe(true);
  expect(creditBalance("pl-credit")).toBe(80_00);
  expect(creditBalances()["pl-credit"]).toBe(80_00);
  expect(creditBalances()["pl-nobody"]).toBeUndefined();

  const bystander = raise("pl-credit-other", 500_00);
  const target = raise("pl-credit", 60_00);
  const used = applyCreditsTo(target.id, "Babatope");
  expect(used.applied).toBe(60_00);
  expect(invoiceStatus(getInvoice(target.id)!)).toBe("Paid");
  /* 80 held, 60 spent, 20 left. */
  expect(creditBalance("pl-credit")).toBe(20_00);
  expect(getPaymentsFor(target.id).every((p) => p.method === "Credit")).toBe(true);
  expect(getPaymentsFor(bystander.id)).toHaveLength(0);
  /* Nothing left to spend on something already covered. */
  expect(applyCreditsTo(target.id).applied).toBe(0);
  /* A client with nothing held is a no-op. */
  expect(applyCreditsTo(bystander.id).applied).toBe(0);
  expect(applyCredit("nope", target.id).ok).toBe(false);
});

/* ---------------------------------------------- exactly once, retry, skip */

test("every path that can send an event's email uses the same key, so it goes once", () => {
  /* The webhook, the payer's return and a hand-entered payment all name the PAYMENT. */
  expect(mailKey.receipt("y7")).toBe("receipt:y7");
  expect(mailKey.paidNotice("y7")).toBe("paid-notice:y7");
  /* Every key ends in the id of the record, which is how the log finds "everything about this". */
  for (const key of [
    mailKey.receipt("y7"), mailKey.paidNotice("y7"), mailKey.invoice("y7"), mailKey.voided("y7"), mailKey.refunded("y7"),
    mailKey.reversed("y7"), mailKey.estimateSent("y7"), mailKey.estimateAnswer("y7"), mailKey.estimateNotice("y7"),
  ]) expect(key.endsWith(":y7")).toBe(true);
  expect(mailKey.receiptAgain("y7", "2026-10-08")).not.toBe(mailKey.receipt("y7"));

  /* Two paths, one key: the second finds the row and does not write another. */
  const row = (key: string) => ({ channel: "Email" as const, to: "studio@example.com", subject: "Payment received", summary: "x", dedupeKey: key });
  const first = queueMessage(row(mailKey.paidNotice("y-once")));
  const second = queueMessage(row(mailKey.paidNotice("y-once")));
  expect(first.ok).toBe(true);
  expect(second).toMatchObject({ ok: false, reason: "duplicate" });
});

test("a failed or skipped message can be replaced by a person's retry, a sent one cannot, and a retry is once", () => {
  const row = (key: string, state?: "Skipped") => ({ channel: "Email" as const, to: "ada@example.com", subject: "Invoice", summary: "x", dedupeKey: key, state });

  /* Sent: the key holds, and Try again is refused. */
  const sent = queueMessage(row("invoice:pl-retry-sent"));
  if (!sent.ok) throw new Error("expected a fresh row");
  settleMessage(sent.message.id, "Sent");
  expect(retryMessage(sent.message.id)).toBeNull();
  expect(queueMessage(row("invoice:pl-retry-sent")).ok).toBe(false);

  /* Failed: the old row keeps its words, its key is freed, and a new row can be written. */
  const failed = queueMessage(row("invoice:pl-retry-failed"));
  if (!failed.ok) throw new Error("expected a fresh row");
  settleMessage(failed.message.id, "Failed", "SMTP down");
  expect(queueMessage(row("invoice:pl-retry-failed")).ok).toBe(false); // the old "already emailed" trap, now handled by the caller
  const freed = retryMessage(failed.message.id, "Babatope");
  expect(freed?.dedupeKey).toContain(":superseded:");
  expect(freed?.state).toBe("Failed");
  expect(queueMessage(row("invoice:pl-retry-failed")).ok).toBe(true);
  /* A second Try again on the same old row finds the key already retired. */
  expect(retryMessage(failed.message.id)).toBeNull();

  /* Skipped (no address then, one now): replaceable too. */
  const skipped = queueMessage(row("invoice:pl-retry-skipped", "Skipped"));
  if (!skipped.ok) throw new Error("expected a fresh row");
  expect(retryMessage(skipped.message.id)).not.toBeNull();
  expect(queueMessage(row("invoice:pl-retry-skipped")).ok).toBe(true);
});

/* -------------------------------------------------------- reconciliation */

test("an invoice's figures come from its rows, and total = paid - over + due", () => {
  const client = "pl-recon-one";
  const inv = raise(client, 100_000_00);
  const p1 = pay(inv.id, 60_000_00);
  const p2 = pay(inv.id, 30_000_00, "Cash");
  expect(refundPayment({ paymentId: p1.id, amount: 10_000_00, reason: "Scope cut", toCredit: false }).ok).toBe(true);
  expect(refundPayment({ paymentId: p2.id, amount: 5_000_00, reason: "Held for next job", toCredit: true }).ok).toBe(true);
  const r = reconcileInvoice(getInvoice(inv.id)!, getPaymentsFor(inv.id));
  expect(r).toMatchObject({ total: 100_000_00, received: 90_000_00, refunded: 15_000_00, heldAsCredit: 5_000_00, paid: 75_000_00, due: 25_000_00, over: 0 });
  expect(r.paid).toBe(getInvoice(inv.id)!.paid);
  expect(r.total).toBe(r.paid - r.over + r.due);

  /* Reversed money is shown for the record and counted nowhere. */
  expect(reversePayment(p2.id, "Cheque bounced")).toBe(true);
  const after = reconcileInvoice(getInvoice(inv.id)!, getPaymentsFor(inv.id));
  expect(after).toMatchObject({ received: 60_000_00, reversed: 30_000_00, paid: 50_000_00, due: 50_000_00 });
});

test("a struck invoice is owed nothing, and drafts are not on the client's books", () => {
  const client = "pl-recon-void";
  const live = raise(client, 40_00);
  const struck = raise(client, 99_00);
  voidInvoice(struck.id, "Raised twice");
  raise(client, 77_00, "Draft");
  const recon = reconcileClient(getInvoicesFor(client), getPayments(), getCreditsFor(client));
  expect(recon.invoices.map((r) => r.number).sort()).toEqual([live.number, struck.number].sort());
  expect(recon).toMatchObject({ invoiced: 40_00, received: 0, outstanding: 40_00, overpaid: 0, held: 0, balanced: true });
  expect(recon.invoices.find((r) => r.id === struck.id)).toMatchObject({ voided: true, due: 0, over: 0 });
});

/** A small seeded generator, so a failure is reproducible. */
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

test("the client summary always equals the sum of its invoices, through any mix of money events", () => {
  const rand = lcg(20261008);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const client = "pl-recon-random";
  const invoices = [raise(client, 120_000_00, "Sent", 7.5), raise(client, 45_000_00), raise(client, 300_000_00, "Sent", 7.5), raise(client, 9_000_00)];
  raise(client, 12_345_00, "Draft");
  /* Never paid, so it can actually be struck part-way through the run. */
  const spare = raise(client, 5_000_00);

  const check = (step: string) => {
    const rows = getInvoicesFor(client);
    const recon = reconcileClient(rows, getPayments(), getCreditsFor(client));
    const live = recon.invoices.filter((r) => !r.voided);
    /* The summary IS the sum of its invoices... */
    expect(recon.invoiced, step).toBe(live.reduce((a, r) => a + r.total, 0));
    expect(recon.outstanding, step).toBe(live.reduce((a, r) => a + r.due, 0));
    expect(recon.overpaid, step).toBe(live.reduce((a, r) => a + r.over, 0));
    expect(recon.received, step).toBe(live.reduce((a, r) => a + r.paid - r.over, 0));
    /* ...it adds up... */
    expect(recon.balanced, step).toBe(true);
    expect(recon.invoiced, step).toBe(recon.received + recon.outstanding);
    /* ...the credit is what the store says it holds... */
    expect(recon.held, step).toBe(creditBalance(client));
    /* ...and every invoice agrees with its own rows. */
    for (const r of recon.invoices) {
      const inv = getInvoice(r.id)!;
      const own = getPaymentsFor(inv.id);
      expect(r.paid, `${step} ${r.number} paid`).toBe(paidFrom(own));
      expect(inv.paid, `${step} ${r.number} cache`).toBe(r.paid);
      if (!r.voided) expect(r.total, `${step} ${r.number} identity`).toBe(r.paid - r.over + r.due);
      expect(r.due).toBeGreaterThanOrEqual(0);
      expect(r.over).toBeGreaterThanOrEqual(0);
    }
  };

  check("start");
  for (let i = 0; i < 250; i++) {
    const inv = pick(invoices);
    const payments = getPayments().filter((p) => invoices.some((x) => x.id === p.invoiceId));
    const op = Math.floor(rand() * 8);
    const step = `step ${i} op ${op}`;
    if (op <= 2) {
      const due = invoiceTotals(getInvoice(inv.id)!).due;
      const amount = Math.max(1, Math.round((due || 10_000_00) * (0.1 + rand() * 1.1)));
      applyPayment({ invoiceId: inv.id, amount, method: pick(["Transfer", "Cash", "POS"] as const), reference: ref() });
    } else if (op === 3 && payments.length) {
      const p = pick(payments);
      refundPayment({ paymentId: p.id, amount: Math.max(1, Math.round(p.amount * (0.1 + rand() * 0.5))), reason: "Random refund", toCredit: rand() < 0.5 });
    } else if (op === 4 && payments.length) {
      reversePayment(pick(payments).id, "Random reversal");
    } else if (op === 5) {
      voidInvoice(inv.id, "Random void");
    } else if (op === 6) {
      overpaymentToCredit(inv.id);
    } else if (op === 7) {
      const credit = pick(getCreditsFor(client));
      if (credit) applyCredit(credit.id, inv.id);
    }
    if (i === 100) voidInvoice(spare.id, "Raised in error");
    check(step);
  }

  /* The run must have exercised the cases it claims to, not coasted over four struck invoices. */
  const rows = getPayments().filter((p) => invoices.some((x) => x.id === p.invoiceId));
  expect(rows.length).toBeGreaterThan(15);
  expect(rows.some((p) => p.reversed)).toBe(true);
  expect(rows.some((p) => p.refunds?.length)).toBe(true);
  expect(getCreditsFor(client).length).toBeGreaterThan(0);
  expect(getInvoice(spare.id)!.voided).toBeTruthy();
});
