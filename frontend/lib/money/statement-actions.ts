"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { db } from "@/lib/db/pool";
import * as store from "@/lib/admin/store";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import { actorName, owner } from "@/lib/admin/guard";
import { FAIL, OK, type ActionState } from "@/lib/admin/validate";
import { invoiceTotals } from "@/lib/admin/types";
import { rateLimit } from "@/lib/rate-limit";
import { fingerprint, statementLine } from "./statements";

const NOT_READY = "Statement import needs migration 0055. Apply it in Settings, System, then import again.";
const DAY = /^\d{4}-\d{2}-\d{2}$/;
export type StatementRowIn = { postedOn: string; amount: number; narration: string; reference: string };

function refresh() { revalidatePath("/admin/money/reconciliation"); revalidatePath("/admin/money"); }

/**
 * IMPORTS REVIEWED LINES. The browser parsed the file and showed the review;
 * every row is checked again here, because the browser is not a trust
 * boundary. Money in only (a positive amount in kobo), a real date, bounded
 * text, at most 1,000 lines. A line already imported (same fingerprint) is
 * counted as repeated and left alone.
 */
export async function importStatement(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await owner();
  if (refused) return refused;
  let input: { account?: string; currency?: string; rows?: StatementRowIn[] };
  try { input = { account: String(fd.get("account") ?? ""), currency: String(fd.get("currency") ?? "NGN"), rows: JSON.parse(String(fd.get("rows") ?? "[]")) }; }
  catch { return FAIL({}, "That file could not be read. Save it as CSV and try again."); }
  const by = await actorName();
  // Per-instance abuse control, not a quota.
  if (!rateLimit(`statement-import:${by}`, 10, 10 * 60_000).ok) return FAIL({}, "Too many imports in a row. Wait a few minutes.");
  const account = String(input?.account ?? "").trim().slice(0, 80);
  const currency = ["NGN", "USD", "GBP", "EUR"].includes(String(input?.currency)) ? String(input?.currency) : "NGN";
  const rows = Array.isArray(input?.rows) ? input.rows.slice(0, 1000) : [];
  const clean = rows.flatMap((r) => {
    const postedOn = String(r?.postedOn ?? ""), amount = Number(r?.amount);
    if (!DAY.test(postedOn) || !Number.isFinite(Date.parse(postedOn)) || !Number.isSafeInteger(amount) || amount <= 0) return [];
    return [{ postedOn, amount, narration: String(r?.narration ?? "").trim().slice(0, 500), reference: String(r?.reference ?? "").trim().slice(0, 120) }];
  });
  if (!clean.length) return FAIL({}, "No line in the file could be read as money in. Check the columns and try again.");
  let added = 0;
  try {
    for (const r of clean) {
      const res = await db.query(`INSERT INTO bank_statement_lines (id,fingerprint,account,posted_on,amount,currency,narration,reference,imported_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (fingerprint) DO NOTHING`,
        [randomUUID(), fingerprint({ account, ...r }), account, r.postedOn, r.amount, currency, r.narration, r.reference, by]);
      added += res.rowCount ?? 0;
    }
  } catch { return FAIL({}, NOT_READY); }
  store.audit({ actor: by, kind: "payment", subjectId: "statement", subject: account || "Bank statement", action: "imported a bank statement", note: `${added} new, ${clean.length - added} already there, ${rows.length - clean.length} skipped` });
  persistSoon();
  refresh();
  return OK(`Imported ${added} ${added === 1 ? "line" : "lines"}.${clean.length - added ? ` ${clean.length - added} were already there.` : ""}${rows.length - clean.length ? ` ${rows.length - clean.length} could not be read and were left out.` : ""}`);
}

/**
 * MATCHES A LINE TO AN INVOICE: records the money as a bank transfer against
 * it, with a receipt, exactly as Record a payment does, then marks the line
 * matched. The payment reference is the line's own (or its fingerprint), so the
 * same money can never be recorded twice.
 */
export async function matchStatementLine(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await owner();
  if (refused) return refused;
  const line = await statementLine(String(fd.get("id") ?? "")).catch(() => null);
  if (!line) return FAIL({}, "That line is no longer there.");
  if (line.state !== "new") return FAIL({}, "That line has already been dealt with.");
  const invoiceId = String(fd.get("invoiceId") ?? "");
  if (!invoiceId) return FAIL({ invoiceId: "Pick the invoice it paid." });
  const target = store.getInvoice(invoiceId);
  if (target && (target.currency ?? "NGN") !== line.currency) return FAIL({ invoiceId: `This line is in ${line.currency} and that invoice is in ${target.currency ?? "NGN"}.` });
  const by = await actorName();
  const reference = line.reference || `STMT-${line.id.slice(0, 8).toUpperCase()}`;
  const res = store.applyPayment({ invoiceId, amount: line.amount, method: "Transfer", reference, at: `${line.postedOn}T12:00:00.000Z`, by, note: `Matched from the bank statement: ${line.narration}`.slice(0, 500) });
  if (!res.ok) {
    return FAIL({}, res.reason === "duplicate" ? "That reference is already recorded against an invoice. Set this line aside with a note instead."
      : res.reason === "void" ? "That invoice is voided. Pick the invoice the money was meant for."
      : res.reason === "draft" ? "That invoice is still a draft. Issue it first." : "It would not apply. Check the invoice and try again.");
  }
  await db.query("UPDATE bank_statement_lines SET state='matched',invoice_id=$2,payment_id=$3,resolved_by=$4,resolved_at=now() WHERE id=$1 AND state='new'", [line.id, invoiceId, res.payment.id, by]);
  store.audit({ actor: by, kind: "payment", subjectId: res.payment.id, subject: res.invoice.number, action: "matched a bank statement line", note: `${line.postedOn} ${line.narration}`.slice(0, 300) });
  let receipt = "";
  if (fd.get("emailReceipt") === "1") {
    const { stageReceipt } = await import("@/lib/money-mail");
    const s = await stageReceipt({ payment: res.payment, invoice: res.invoice, outstanding: invoiceTotals(res.invoice).due, by });
    if (s.state === "queued") { after(s.run); receipt = ` A receipt is on its way to ${s.to}.`; }
    else receipt = s.state === "skipped" ? ` No email was sent: ${s.say}` : ` ${s.say}`;
  }
  refresh(); revalidatePath(`/admin/money/${invoiceId}`);
  const due = invoiceTotals(res.invoice).due;
  return OK(`Matched to ${res.invoice.number}. ${due ? "Part paid; the rest is still owed." : "It is paid."}${receipt}`);
}

/** Sets a line aside with a reason: a bank charge, a transfer between our own accounts, money that is not for an invoice. */
export async function ignoreStatementLine(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await owner();
  if (refused) return refused;
  const id = String(fd.get("id") ?? ""), reason = String(fd.get("reason") ?? "").trim().slice(0, 300);
  if (!reason) return FAIL({ reason: "Say why, so the next person knows." });
  const by = await actorName();
  try {
    const r = await db.query("UPDATE bank_statement_lines SET state='ignored',note=$2,resolved_by=$3,resolved_at=now() WHERE id=$1 AND state='new'", [id, reason, by]);
    if (!r.rowCount) return FAIL({}, "That line has already been dealt with.");
  } catch { return FAIL({}, NOT_READY); }
  store.audit({ actor: by, kind: "payment", subjectId: id, subject: "Bank statement line", action: "set a statement line aside", note: reason });
  persistSoon();
  refresh();
  return OK("Set aside. It stays in the statement with your note.");
}
