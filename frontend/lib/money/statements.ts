import "server-only";
import { createHash } from "node:crypto";
import { db } from "@/lib/db/pool";
import { getInvoices } from "@/lib/admin/store";
import { invoiceTotals, type Invoice } from "@/lib/admin/types";

export type StatementLine = {
  id: string; postedOn: string; amount: number; currency: string; narration: string; reference: string; account: string;
  state: "new" | "matched" | "ignored"; invoiceId: string | null; paymentId: string | null; note: string | null;
  importedBy: string; resolvedBy: string | null;
};
type Row = { id: string; posted_on: string | Date; amount: string | number; currency: string; narration: string; reference: string; account: string; state: StatementLine["state"]; invoice_id: string | null; payment_id: string | null; note: string | null; imported_by: string; resolved_by: string | null };

/** The same line from the same statement always gets the same fingerprint, so a second import adds nothing. */
export function fingerprint(l: { account: string; postedOn: string; amount: number; narration: string; reference: string }) {
  return createHash("sha256").update([l.account.trim().toLowerCase(), l.postedOn, String(l.amount), l.narration.trim().toLowerCase(), l.reference.trim().toLowerCase()].join("|")).digest("hex");
}

const toLine = (r: Row): StatementLine => ({
  id: r.id, postedOn: new Date(r.posted_on).toISOString().slice(0, 10), amount: Number(r.amount), currency: r.currency, narration: r.narration, reference: r.reference, account: r.account,
  state: r.state, invoiceId: r.invoice_id, paymentId: r.payment_id, note: r.note, importedBy: r.imported_by, resolvedBy: r.resolved_by,
});

/** The latest 300 lines, newest first, or null before migration 0055 is applied. */
export async function statementLines(): Promise<StatementLine[] | null> {
  try {
    const r = await db.query<Row>("SELECT id,posted_on,amount,currency,narration,reference,account,state,invoice_id,payment_id,note,imported_by,resolved_by FROM bank_statement_lines ORDER BY posted_on DESC, imported_at DESC LIMIT 300");
    return r.rows.map(toLine);
  } catch { return null; }
}

export async function statementLine(id: string): Promise<StatementLine | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const r = await db.query<Row>("SELECT id,posted_on,amount,currency,narration,reference,account,state,invoice_id,payment_id,note,imported_by,resolved_by FROM bank_statement_lines WHERE id=$1", [id]);
  return r.rows[0] ? toLine(r.rows[0]) : null;
}

/**
 * THE INVOICE A LINE PROBABLY PAID, or null. An invoice number (current or
 * former) in the narration or reference wins; failing that, the one open
 * invoice whose balance is exactly the amount. Two candidates on amount alone
 * is a guess, so it suggests nothing and the person picks.
 */
export function suggestInvoice(line: Pick<StatementLine, "amount" | "currency" | "narration" | "reference">, open = openInvoices()): { invoice: Invoice; why: string } | null {
  const text = `${line.narration} ${line.reference}`.toUpperCase().replace(/\s+/g, "");
  for (const inv of open) {
    const numbers = [inv.number, ...(inv.formerNumbers ?? [])].map((n) => n.toUpperCase().replace(/\s+/g, ""));
    if (numbers.some((n) => n && text.includes(n))) return { invoice: inv, why: "The invoice number is in the narration" };
  }
  const byAmount = open.filter((inv) => (inv.currency ?? "NGN") === line.currency && invoiceTotals(inv).due === line.amount);
  return byAmount.length === 1 ? { invoice: byAmount[0], why: "The amount is exactly what this invoice still owes" } : null;
}

/** Issued, not voided, still owing: the invoices a bank line can settle. */
export function openInvoices() {
  return getInvoices().filter((i) => i.status !== "Draft" && !i.voided && invoiceTotals(i).due > 0);
}
