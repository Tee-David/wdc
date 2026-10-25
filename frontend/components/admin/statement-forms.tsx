"use client";

import { useState } from "react";
import { Check, Download, Link2, Upload } from "lucide-react";
import { naira } from "@/lib/admin/types";
import { readStatement, type StatementRow } from "@/lib/money/statement-csv";
import { importStatement, ignoreStatementLine, matchStatementLine } from "@/lib/money/statement-actions";
import { Actions, Area, Field, Form, Hidden, Select, Submit } from "./form";
import { RemoteSelect } from "./remote-pick";
import { DialogButton } from "./dialog";
import { ReceiptTick } from "./reconcile-forms";

const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const SAMPLE = "Date,Narration,Reference,Debit,Credit\n14/10/2026,TRF FROM ADA OKAFOR INV-26-AB12CD,000123456789,,\"850,000.00\"\n15/10/2026,SMS ALERT CHARGE,000123456790,4.00,\n";

/**
 * THE STATEMENT IMPORT SHEET: choose the bank's CSV, see what it holds, then
 * add it. The file is read here (nothing is sent until Import), money out is
 * left out, and the first lines are shown so a wrong column is seen before it
 * is saved. The server re-checks every line and skips any already imported.
 */
export function ImportStatementBody({ close }: { close?: () => void }) {
  const [read, setRead] = useState<{ rows: StatementRow[]; skipped: number; debits: number } | null>(null);
  const [note, setNote] = useState("");
  const choose = async (file: File | undefined) => {
    setRead(null); setNote("");
    if (!file) return;
    if (file.size > 2_000_000) { setNote("That file is over 2 MB. Export a shorter period."); return; }
    const r = readStatement(await file.text());
    if (r.ok) setRead(r); else setNote(r.say);
  };
  const sample = `data:text/csv;charset=utf-8,${encodeURIComponent(SAMPLE)}`;
  const total = read?.rows.reduce((n, r) => n + r.amount, 0) ?? 0;
  return (
    <Form action={importStatement} onDone={() => close?.()}>
      <p className="ad__dim" style={{ margin: "0 0 .75rem" }}>
        Export the statement from your bank as CSV. We read the Date, Narration, Reference and Credit columns (or one Amount column) and keep only money in. Lines already imported are skipped, so importing the same month twice is safe.
      </p>
      <span className="ad__row">
        <label className="ad__btn ad__btn--primary" style={{ cursor: "pointer" }}>
          <Upload aria-hidden="true" />Choose the CSV file
          <input type="file" accept=".csv,text/csv" className="ad__sr" onChange={(e) => void choose(e.target.files?.[0])} />
        </label>
        <a className="ad__btn" href={sample} download="statement-sample.csv"><Download aria-hidden="true" />Sample file</a>
      </span>
      {note ? <p className="ad__msg is-bad" role="status" style={{ marginTop: ".75rem" }}>{note}</p> : null}
      {read ? (
        <>
          <p style={{ margin: ".9rem 0 .4rem", fontWeight: 600 }} role="status">
            {read.rows.length} {read.rows.length === 1 ? "line" : "lines"} of money in, {naira(total)} in all.
            {read.debits ? ` ${read.debits} money out left out.` : ""}{read.skipped ? ` ${read.skipped} could not be read.` : ""}
          </p>
          <div className="ad__scroll" tabIndex={0} role="region" aria-label="Preview of the first lines, scrolls sideways" data-lenis-prevent>
            <table className="ad__t"><thead><tr><th>Narration</th><th>Date</th><th className="num">Amount</th></tr></thead>
              <tbody>{read.rows.slice(0, 5).map((r, i) => <tr key={i}><td>{r.narration || <span className="ad__dim">No narration</span>}</td><td className="ad__dim" style={{ whiteSpace: "nowrap" }}>{day(r.postedOn)}</td><td className="num">{naira(r.amount)}</td></tr>)}</tbody>
            </table>
          </div>
          <Hidden name="rows" value={JSON.stringify(read.rows)} />
        </>
      ) : null}
      <Field name="account" label="Which account" placeholder="Business current account" hint="So two accounts with the same line are kept apart." />
      <Select name="currency" label="Currency" defaultValue="NGN" options={[{ value: "NGN", label: "Naira (NGN)" }, { value: "USD", label: "US dollar (USD)" }, { value: "GBP", label: "Pound (GBP)" }, { value: "EUR", label: "Euro (EUR)" }]} />
      <Actions>
        <Submit icon={Upload} disabled={!read}>Import {read ? read.rows.length : ""} {read?.rows.length === 1 ? "line" : "lines"}</Submit>
        {!read ? <p className="adWhy">Choose a file to see what it holds.</p> : null}
      </Actions>
    </Form>
  );
}

export function MatchLine({ id, amount, narration, suggested }: { id: string; amount: number; narration: string; suggested?: { id: string; label: string } }) {
  return (
    <DialogButton label={suggested ? "Confirm match" : "Match to an invoice"} title="Match this line to an invoice" icon={Link2} tone="primary">
      {(close) => (
        <Form action={matchStatementLine} onDone={close}>
          <Hidden name="id" value={id} />
          <p className="ad__dim" style={{ margin: "0 0 .8rem" }}>
            {naira(amount)} came in: {narration || "no narration"}. Matching records it as a bank transfer against the invoice, on the day it reached the bank.
          </p>
          <RemoteSelect name="invoiceId" label="Which invoice it paid" required kind="invoices" scope={{ invoices: "open" }} defaultValue={suggested?.id} defaultLabel={suggested?.label} />
          <ReceiptTick />
          <Actions><Submit icon={Link2}>Match and record the payment</Submit></Actions>
        </Form>
      )}
    </DialogButton>
  );
}

export function SetAsideLine({ id }: { id: string }) {
  return (
    <DialogButton label="Set aside" title="Why is this line not for an invoice?" icon={Check} tone="plain">
      {(close) => (
        <Form action={ignoreStatementLine} onDone={close}>
          <Hidden name="id" value={id} />
          <Area name="reason" label="Why" required placeholder="A transfer between our own accounts." hint="It stays in the statement with this note." />
          <Actions><Submit>Set the line aside</Submit></Actions>
        </Form>
      )}
    </DialogButton>
  );
}

/** The head's one action on Reconciliation. */
export function ImportStatement({ startOpen }: { startOpen?: boolean }) {
  return (
    <DialogButton label="Import statement" title="Import a bank statement" icon={Upload} startOpen={startOpen} dataTour="recon-import">
      {(close) => <ImportStatementBody close={close} />}
    </DialogButton>
  );
}
