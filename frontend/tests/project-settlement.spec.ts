import { expect, test } from "@playwright/test";
import { addInvoice, applyPayment, getInvoice, getOpenProjectInvoices, voidInvoice } from "../lib/admin/store";
import { invoiceTotals } from "../lib/admin/types";

const lines = [{ description: "Project balance", qty: 1, unit: 100_00 }];
const make = (projectId: string, status: "Draft" | "Sent" = "Sent") => addInvoice({
  clientId: "settlement-client", projectId, status, issued: new Date().toISOString(),
  due: new Date().toISOString(), vatRate: 0, lines,
});

test("project settlement choices exclude drafts, voids, paid and other projects", () => {
  const project = `settlement-${crypto.randomUUID()}`;
  const open = make(project);
  make(project, "Draft");
  make(`${project}-other`);
  const paid = make(project);
  applyPayment({ invoiceId: paid.id, amount: 100_00, method: "Cash", reference: `paid-${paid.id}` });
  const voided = make(project);
  voidInvoice(voided.id, "Cancelled", "Owner");
  expect(getOpenProjectInvoices(project)).toEqual([{ id: open.id, number: open.number, owed: 100_00 }]);
});

test("project balance choices follow intervening receipts and retain only minimal data", () => {
  const project = `settlement-${crypto.randomUUID()}`;
  const inv = make(project);
  const snapshot = getOpenProjectInvoices(project)[0];
  applyPayment({ invoiceId: inv.id, amount: 40_00, method: "Cash", reference: `part-${inv.id}`, by: "Owner" });
  const live = getOpenProjectInvoices(project)[0];
  expect(snapshot.owed).toBe(100_00);
  expect(live.owed).toBe(60_00);
  expect(Object.keys(live).sort()).toEqual(["id", "number", "owed"]);
  applyPayment({ invoiceId: inv.id, amount: invoiceTotals(getInvoice(inv.id)!).due, method: "Cash", reference: `settle-${inv.id}`, by: "Owner" });
  expect(getOpenProjectInvoices(project)).toEqual([]);
  expect(invoiceTotals(getInvoice(inv.id)!).due).toBe(0);
});
