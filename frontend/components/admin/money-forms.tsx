"use client";

import { useState } from "react";
import { Banknote, FileText, Plus, Save, Send, Trash2, Undo2 } from "lucide-react";
import type { Client, Invoice, Project } from "@/lib/admin/types";
import { naira } from "@/lib/admin/types";
import {
  createExpense, createInvoice, deleteInvoice, issueInvoice, recordPayment, reversePayment, updateInvoice,
} from "@/lib/admin/actions";
import { Actions, Field, Fields, Form, Hidden, Select, Submit } from "./form";
import { DialogButton } from "./dialog";

/* ------------------------------------------------------------- invoices */

type Row = { key: number; description: string; qty: string; unit: string };

let rowKey = 0;
const emptyRow = (): Row => ({ key: ++rowKey, description: "", qty: "1", unit: "" });

/**
 * The invoice builder, with the total updating as you type.
 *
 * THE FIGURES ON SCREEN ARE A PREVIEW AND NOTHING ELSE. They are computed here
 * so the person can see what they are about to send, and they are not
 * submitted: the form posts descriptions, quantities and unit amounts, and the
 * server re-reads those and runs invoiceTotals() over them. A total arriving
 * in a FormData is a number somebody chose, and this is the one form on the
 * site where believing that would cost real money.
 *
 * Rounding matches the server exactly: each line is rounded to whole kobo
 * before it is summed, which is what lineTotal() does, so the preview and the
 * saved invoice cannot differ by a kobo on a fractional quantity.
 */
export function InvoiceBuilder({
  clients, projects, invoice, clientId, trigger = "New invoice",
}: {
  clients: Pick<Client, "id" | "company">[];
  projects: Pick<Project, "id" | "title" | "clientId">[];
  /** Present when editing a draft. */
  invoice?: Invoice;
  clientId?: string;
  trigger?: string;
}) {
  return (
    <DialogButton
      label={trigger}
      title={invoice ? `Edit ${invoice.number}` : "Raise an invoice"}
      icon={invoice ? Save : Plus}
      tone={invoice ? "plain" : "primary"}
      wide
    >
      {(close) => (
        <Builder
          clients={clients} projects={projects} invoice={invoice}
          clientId={clientId} close={close}
        />
      )}
    </DialogButton>
  );
}

function Builder({
  clients, projects, invoice, clientId, close,
}: {
  clients: Pick<Client, "id" | "company">[];
  projects: Pick<Project, "id" | "title" | "clientId">[];
  invoice?: Invoice;
  clientId?: string;
  close: () => void;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    invoice?.lines.length
      ? invoice.lines.map((l) => ({
          key: ++rowKey, description: l.description,
          qty: String(l.qty), unit: String(l.unit / 100),
        }))
      : [emptyRow()],
  );
  const [vat, setVat] = useState(String(invoice?.vatRate ?? 7.5));
  const [who, setWho] = useState(invoice?.clientId ?? clientId ?? "");

  const subtotal = rows.reduce((n, r) => {
    const q = Number(r.qty) || 0;
    const u = Math.round((Number(r.unit.replace(/[₦,\s]/g, "")) || 0) * 100);
    return n + Math.round(q * u);
  }, 0);
  const rate = Number(vat) || 0;
  const tax = Math.round((subtotal * rate) / 100);

  const forClient = projects.filter((p) => p.clientId === who);
  const set = (key: number, k: keyof Row, v: string) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [k]: v } : r)));

  return (
    <Form action={invoice ? updateInvoice : createInvoice} onDone={() => close()}>
      {invoice ? <Hidden name="id" value={invoice.id} /> : null}
      <Fields>
        {clientId && !invoice ? (
          <Hidden name="clientId" value={clientId} />
        ) : (
          <Select
            name="clientId" label="Bill to" required half placeholder="Pick a client"
            defaultValue={who}
            options={clients.map((c) => ({ value: c.id, label: c.company }))}
          />
        )}
        <Select
          name="projectId" label="Against" half placeholder="No particular project"
          defaultValue={invoice?.projectId ?? ""}
          options={forClient.map((p) => ({ value: p.id, label: p.title }))}
          hint={who ? undefined : "Pick a client first to see their projects."}
        />
        <Field name="issued" label="Issued" type="date" half
               defaultValue={(invoice?.issued ?? new Date().toISOString()).slice(0, 10)} />
        <Field name="due" label="Due" type="date" required half
               defaultValue={(invoice?.due ?? plusDays(30)).slice(0, 10)} />
      </Fields>

      {/* A hidden mirror of the select, so changing it can filter the projects
          without the select itself becoming controlled and losing its
          uncontrolled default. */}
      {!clientId || invoice ? (
        <ClientWatcher onChange={setWho} />
      ) : null}

      <div className="ad__lines">
        {/* The column captions live on every line, not only in a header row,
            and are hidden on a wide screen where the header carries them. On a
            phone the row stacks and a bare number input with no label beside
            it is a guess. */}
        <div className="ad__lineH" aria-hidden="true">
          <span>Description</span><span>Qty</span><span>Unit (₦)</span><span>Line</span><span />
        </div>
        {rows.map((r) => {
          const q = Number(r.qty) || 0;
          const u = Math.round((Number(r.unit.replace(/[₦,\s]/g, "")) || 0) * 100);
          return (
            <div className="ad__line" key={r.key}>
              <label className="ad__lnF ad__lnF--desc">
                <span>Description</span>
                <input
                  name="ln_desc" value={r.description}
                  placeholder="Identity system, first stage"
                  onChange={(e) => set(r.key, "description", e.target.value)}
                />
              </label>
              <label className="ad__lnF ad__lnF--n">
                <span>Qty</span>
                <input
                  name="ln_qty" value={r.qty} inputMode="decimal"
                  onChange={(e) => set(r.key, "qty", e.target.value)}
                />
              </label>
              <label className="ad__lnF ad__lnF--n">
                <span>Unit (₦)</span>
                <input
                  name="ln_unit" value={r.unit} inputMode="decimal" placeholder="450000"
                  onChange={(e) => set(r.key, "unit", e.target.value)}
                />
              </label>
              <p className="ad__lineT">
                <span>Line</span>
                <b>{naira(Math.round(q * u))}</b>
              </p>
              <button
                type="button" className="ad__lineX" aria-label="Remove this line"
                onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.key !== r.key) : rs))}
              >
                <Trash2 aria-hidden="true" />
              </button>
            </div>
          );
        })}
        <button type="button" className="ad__btn ad__lineAdd" onClick={() => setRows((rs) => [...rs, emptyRow()])}>
          <Plus aria-hidden="true" /> Add a line
        </button>
      </div>

      <div className="ad__totals">
        <div className="ad__vat">
          <label htmlFor="vatRate">VAT %</label>
          <input
            id="vatRate" name="vatRate" value={vat} inputMode="decimal"
            onChange={(e) => setVat(e.target.value)}
          />
        </div>
        <dl>
          <div><dt>Subtotal</dt><dd>{naira(subtotal)}</dd></div>
          <div><dt>VAT at {rate}%</dt><dd>{naira(tax)}</dd></div>
          <div className="is-total"><dt>Total</dt><dd>{naira(subtotal + tax)}</dd></div>
        </dl>
      </div>

      <Actions>
        <Submit icon={invoice ? Save : FileText}>{invoice ? "Save the draft" : "Save as a draft"}</Submit>
        {invoice ? null : (
          <button type="submit" name="issue" value="1" className="ad__btn">
            <Send aria-hidden="true" /> Save and issue
          </button>
        )}
      </Actions>
    </Form>
  );
}

/* Reads the client select out of its own form.

   LISTENING RATHER THAN CONTROLLING, so the select stays uncontrolled: an
   uncontrolled select is the one that still submits the right value before
   React has hydrated, which is the whole reason these are real forms. All this
   needs from it is which client is chosen, to filter the project list. */
function ClientWatcher({ onChange }: { onChange: (v: string) => void }) {
  return (
    <input
      type="hidden"
      ref={(el) => {
        const form = el?.form;
        if (!form) return;
        const read = () => {
          const sel = form.querySelector<HTMLSelectElement>('select[name="clientId"]');
          if (sel) onChange(sel.value);
        };
        form.addEventListener("change", read);
        read();
        return () => form.removeEventListener("change", read);
      }}
    />
  );
}

const plusDays = (n: number) =>
  new Date(Date.now() + n * 864e5).toISOString();

/* -------------------------------------------------------------- payments */

/**
 * Recording money that has come in.
 *
 * The reference field is the important one and says so. It is what makes the
 * write idempotent: the same reference twice adds nothing the second time,
 * whether the second time is a person pressing again or the Paystack webhook
 * arriving a moment after the browser came back from checkout.
 */
export function RecordPayment({ invoice, owed }: { invoice: Invoice; owed: number }) {
  return (
    <DialogButton label="Record a payment" title={`Money in against ${invoice.number}`} icon={Banknote}>
      {(close) => (
        <Form action={recordPayment} onDone={() => close()}>
          <Fields>
            <Hidden name="invoiceId" value={invoice.id} />
            <Field
              name="amount" label="Amount (₦)" required half inputMode="decimal"
              defaultValue={owed ? String(owed / 100) : ""}
              hint="Starts at what is owed. Change it for a part payment."
            />
            <Select
              name="method" label="How" half defaultValue="Transfer"
              options={[
                { value: "Transfer", label: "Bank transfer" },
                { value: "Paystack", label: "Paystack" },
                { value: "Cash", label: "Cash" },
              ]}
            />
            <Field
              name="reference" label="Reference" required
              placeholder="TRF_0092"
              hint="The bank reference or the Paystack transaction id. This is what stops the same payment being recorded twice."
            />
            <Field name="at" label="When" type="date" half
                   defaultValue={new Date().toISOString().slice(0, 10)} />
          </Fields>
          <Actions>
            <Submit icon={Banknote}>Record it</Submit>
          </Actions>
        </Form>
      )}
    </DialogButton>
  );
}

/* -------------------------------------------------------------- expenses */

export function AddExpense() {
  return (
    <DialogButton label="Add an expense" title="Money out" icon={Plus}>
      {(close) => (
        <Form action={createExpense} onDone={() => close()} resetOnDone>
          <Fields>
            <Field name="description" label="What it was for" required
                   placeholder="Adobe Creative Cloud" />
            <Field name="amount" label="Amount (₦)" required half inputMode="decimal" />
            <Select
              name="category" label="Category" half defaultValue="Software"
              options={["Software", "Hosting", "Assets", "Contractors", "Marketing", "Travel", "Other"]
                .map((v) => ({ value: v, label: v }))}
            />
            <Field name="at" label="When" type="date" half
                   defaultValue={new Date().toISOString().slice(0, 10)} />
          </Fields>
          <Actions>
            <Submit icon={Plus}>Add it</Submit>
          </Actions>
        </Form>
      )}
    </DialogButton>
  );
}

/* --------------------------------------------------------------- actions */

/**
 * The writes that cannot be undone, each behind a question.
 *
 * A NATIVE CONFIRM RATHER THAN A SECOND DIALOG: these sit inside table rows
 * and inside an already-open modal, and a dialog inside a dialog is a focus
 * trap inside a focus trap. The prompt is spent only on the irreversible
 * ones, because a prompt on everything is a prompt people learn to click
 * through without reading.
 */
export function IssueInvoice({ invoice }: { invoice: Invoice }) {
  return (
    <Form
      action={issueInvoice}
      confirm={`Issue ${invoice.number}? Its number and its lines are fixed from then on.`}
    >
      <Hidden name="id" value={invoice.id} />
      <Submit icon={Send}>Issue it</Submit>
    </Form>
  );
}

export function DeleteDraft({ invoice }: { invoice: Invoice }) {
  return (
    <Form
      action={deleteInvoice}
      confirm={`Delete ${invoice.number}? It has not been issued, so nothing is lost but the typing.`}
    >
      <Hidden name="id" value={invoice.id} />
      <Submit tone="danger" icon={Trash2}>Delete the draft</Submit>
    </Form>
  );
}

export function ReversePayment({ id, invoiceId }: { id: string; invoiceId: string }) {
  return (
    <Form
      action={reversePayment}
      confirm="Reverse this payment? The invoice will be re-totalled without it."
    >
      <Hidden name="id" value={id} />
      <Hidden name="invoiceId" value={invoiceId} />
      <Submit tone="danger" icon={Undo2}>Reverse</Submit>
    </Form>
  );
}

/* `RemoveExpense` used to live here and is gone with the bare button it drew.
   Removing an expense is in the row's own menu now, behind a sentence that
   names the expense and says what it comes out of -- see ExpenseMenu in
   row-actions.tsx. */
