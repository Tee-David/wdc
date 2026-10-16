/**
 * READS A BANK'S CSV EXPORT into money-in lines, in the browser, before
 * anything is sent. Banks name their columns differently, so the header row is
 * matched by the words they use (Date or Trans date, Narration or Description,
 * Credit or Money in, or one signed Amount column). Debits are left out: a
 * statement line here is money that might have paid an invoice.
 *
 * Pure, so tests/statement-csv.check.cjs can run it without a browser.
 */
export type StatementRow = { postedOn: string; amount: number; narration: string; reference: string };
export type StatementRead =
  | { ok: true; rows: StatementRow[]; skipped: number; debits: number }
  | { ok: false; say: string };

export function parseCsv(src: string): string[][] {
  const out: string[][] = []; let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (q) { if (ch === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && src[i + 1] === "\n") i++; row.push(cell); out.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); out.push(row); }
  return out.filter((r) => r.some((c) => c.trim()));
}

const HEADS = {
  date: ["date", "trans date", "transaction date", "posted date", "posting date", "value date", "tran date", "txn date"],
  narration: ["narration", "description", "details", "remarks", "transaction details", "particulars", "memo"],
  reference: ["reference", "ref", "ref no", "reference number", "transaction reference", "session id", "tran id", "transaction id"],
  credit: ["credit", "credits", "money in", "deposit", "deposits", "credit amount", "paid in", "lodgement", "lodgements", "cr"],
  debit: ["debit", "debits", "money out", "withdrawal", "withdrawals", "debit amount", "paid out", "dr"],
  amount: ["amount", "transaction amount", "value"],
};
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** 2026-10-14, 14/10/2026, 14-10-26, 14-Oct-2026, 14 Oct 2026 and Oct 14, 2026, as YYYY-MM-DD. Day first, as Nigerian banks write it. */
export function readDay(raw: string): string | null {
  const s = raw.trim().toLowerCase().replace(/,/g, " ").replace(/\s+/g, " ").split(/[ t](?=\d{1,2}:)/)[0];
  let y: number, m: number, d: number;
  let r: RegExpMatchArray | null;
  if ((r = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) [y, m, d] = [+r[1], +r[2], +r[3]];
  else if ((r = s.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2,4})$/))) [d, m, y] = [+r[1], +r[2], +r[3]];
  else if ((r = s.match(/^(\d{1,2})[-/. ]([a-z]{3})[a-z]*[-/. ](\d{2,4})$/))) [d, m, y] = [+r[1], MONTHS.indexOf(r[2]) + 1, +r[3]];
  else if ((r = s.match(/^([a-z]{3})[a-z]* (\d{1,2}) (\d{4})$/))) [m, d, y] = [MONTHS.indexOf(r[1]) + 1, +r[2], +r[3]];
  else return null;
  if (y < 100) y += 2000;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return null;
  const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return new Date(`${iso}T00:00:00Z`).toISOString().slice(0, 10) === iso ? iso : null;
}

/** "₦850,000.00", "850000", "(1,200.50)" or "-1200" as kobo, signed; null when it is not a number. */
export function readKobo(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const negative = /^\(.*\)$/.test(s) || s.includes("-");
  const digits = s.replace(/[^0-9.]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(digits)) return null;
  const kobo = Math.round(Number(digits) * 100);
  return negative ? -kobo : kobo;
}

export function readStatement(src: string): StatementRead {
  const grid = parseCsv(src.replace(/^﻿/, ""));
  /* Some exports put the account name and period above the table: the header is the first row that names a date. */
  const headAt = grid.findIndex((r) => r.some((c) => HEADS.date.includes(c.trim().toLowerCase())));
  if (headAt < 0) return { ok: false, say: "No column is called Date. Check that this is the bank's CSV export." };
  const head = grid[headAt].map((h) => h.trim().toLowerCase().replace(/\s*\(.*\)$/, ""));
  const at = (k: keyof typeof HEADS) => head.findIndex((h) => HEADS[k].includes(h));
  const col = { date: at("date"), narration: at("narration"), reference: at("reference"), credit: at("credit"), debit: at("debit"), amount: at("amount") };
  if (col.credit < 0 && col.amount < 0) return { ok: false, say: "No column says how much came in. We look for Credit, Money in or Amount." };
  const rows: StatementRow[] = [];
  let skipped = 0, debits = 0;
  for (const r of grid.slice(headAt + 1)) {
    const cell = (i: number) => (i < 0 ? "" : (r[i] ?? "").trim());
    const postedOn = readDay(cell(col.date));
    const amount = col.credit >= 0 ? readKobo(cell(col.credit)) : readKobo(cell(col.amount));
    if (col.credit >= 0 && !amount && readKobo(cell(col.debit))) { debits++; continue; }
    if (amount !== null && amount < 0) { debits++; continue; }
    if (!postedOn || !amount) { skipped++; continue; }
    rows.push({ postedOn, amount, narration: cell(col.narration).slice(0, 500), reference: cell(col.reference).slice(0, 120) });
  }
  if (!rows.length) return { ok: false, say: debits ? "Every line in the file is money out. Only money in can pay an invoice." : "No line could be read. Check the Date and Credit columns." };
  if (rows.length > 1000) return { ok: false, say: "Import up to 1,000 lines at a time. Export a shorter period." };
  return { ok: true, rows, skipped, debits };
}
