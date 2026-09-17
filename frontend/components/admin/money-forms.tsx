"use client";

import { useId, useState } from "react";
import {
  Banknote, FileSignature, FileText, Plus, Save, Send, Trash2, Undo2,
} from "lucide-react";
import type { Client, Invoice, Project } from "@/lib/admin/types";
import { EXPENSE_CATEGORIES, METHODS, naira } from "@/lib/admin/types";
import {
  createEstimate, createExpense, createInvoice, deleteInvoice, issueInvoice,
  recordPayment, reversePayment, updateInvoice,
} from "@/lib/admin/actions";
import { Actions, Area, Checks, Field, Fields, Form, Hidden, Select, Submit } from "./form";
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
  clients, projects, invoice, clientId, trigger = "New invoice", dataTour,
  defaultVatRate, defaultDueInDays,
}: {
  clients: Pick<Client, "id" | "company">[];
  projects: Pick<Project, "id" | "title" | "clientId">[];
  /** Present when editing a draft. */
  invoice?: Invoice;
  clientId?: string;
  trigger?: string;
  dataTour?: string;
  /** The studio's own default, from Settings -- ignored once `invoice` is
      present, since an existing draft's own figures always win. */
  defaultVatRate?: number;
  defaultDueInDays?: number;
}) {
  return (
    <DialogButton
      label={trigger}
      title={invoice ? `Edit ${invoice.number}` : "Raise an invoice"}
      icon={invoice ? Save : Plus}
      tone={invoice ? "plain" : "primary"}
      wide
      dataTour={dataTour}
    >
      {(close) => (
        <Builder
          clients={clients} projects={projects} invoice={invoice}
          clientId={clientId} close={close}
          defaultVatRate={defaultVatRate} defaultDueInDays={defaultDueInDays}
        />
      )}
    </DialogButton>
  );
}

/**
 * The estimate builder.
 *
 * THE SAME LINE EDITOR, because an estimate and an invoice are the same list
 * of work at two moments and two editors would drift. What differs is what
 * surrounds it: an estimate has an expiry rather than a due date, a discount
 * rate, and the two pieces of prose -- what is covered, and on what terms --
 * that decide arguments later and otherwise live only in a covering email.
 */
export function EstimateBuilder({
  clients, projects, clientId, trigger = "New estimate", defaultVatRate,
}: {
  clients: Pick<Client, "id" | "company">[];
  projects: Pick<Project, "id" | "title" | "clientId">[];
  clientId?: string;
  trigger?: string;
  defaultVatRate?: number;
}) {
  return (
    <DialogButton label={trigger} title="Quote for a piece of work" icon={FileSignature} tone="plain" wide>
      {(close) => (
        <Builder
          clients={clients} projects={projects} clientId={clientId} close={close} estimate
          defaultVatRate={defaultVatRate}
        />
      )}
    </DialogButton>
  );
}

function Builder({
  clients, projects, invoice, clientId, close, estimate = false,
  defaultVatRate, defaultDueInDays,
}: {
  clients: Pick<Client, "id" | "company">[];
  projects: Pick<Project, "id" | "title" | "clientId">[];
  invoice?: Invoice;
  clientId?: string;
  close: () => void;
  /** Build an estimate rather than an invoice. */
  estimate?: boolean;
  defaultVatRate?: number;
  defaultDueInDays?: number;
}) {
  /* SCOPES THE VAT/DISCOUNT FIELD IDS TO THIS INSTANCE. `DialogButton` mounts
     its dialog's content whether or not it is open, and Money renders four of
     these builders (one invoice, three estimate) on one page -- a literal
     "vatRate" id would be duplicated four times over, and a browser's
     `label[for]` association resolves a duplicate id to whichever element
     matching it comes first in the document, which silently strips the label
     off every instance after that one. */
  const uid = useId();
  const [rows, setRows] = useState<Row[]>(() =>
    invoice?.lines.length
      ? invoice.lines.map((l) => ({
          key: ++rowKey, description: l.description,
          qty: String(l.qty), unit: String(l.unit / 100),
        }))
      : [emptyRow()],
  );
  const [vat, setVat] = useState(String(invoice?.vatRate ?? defaultVatRate ?? 7.5));
  const [who, setWho] = useState(invoice?.clientId ?? clientId ?? "");

  const subtotal = rows.reduce((n, r) => {
    const q = Number(r.qty) || 0;
    const u = Math.round((Number(r.unit.replace(/[₦,\s]/g, "")) || 0) * 100);
    return n + Math.round(q * u);
  }, 0);
  const [off, setOff] = useState("0");
  const rate = Number(vat) || 0;
  /* ROUNDED ONCE, ON THE SUM. A discount taken per line and then summed drifts
     from one taken on the sum, and both figures would be on this dialog at the
     same time. The server does it the same way, in `estimateTotals`. */
  const cut = estimate ? Math.round((subtotal * (Number(off) || 0)) / 100) : 0;
  const net = subtotal - cut;
  const tax = Math.round((net * rate) / 100);

  const forClient = projects.filter((p) => p.clientId === who);
  const set = (key: number, k: keyof Row, v: string) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [k]: v } : r)));

  return (
    <Form action={estimate ? createEstimate : invoice ? updateInvoice : createInvoice} onDone={() => close()}>
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
        {estimate ? (
          <Field name="expires" label="Holds until" type="date" required half
                 defaultValue={plusDays(30).slice(0, 10)}
                 hint="After this the price is no longer held. The state says so on its own; nothing expires silently." />
        ) : (
          <Field name="due" label="Due" type="date" required half
                 defaultValue={(invoice?.due ?? plusDays(defaultDueInDays ?? 30)).slice(0, 10)} />
        )}
      </Fields>

      {estimate ? (
        <Fields>
          <Area
            name="notes" label="What this covers" rows={3}
            placeholder="Milestone three covers the routing rework and the driver app. Hypercare is two weeks from the day it goes live, not from sign-off."
            hint="On the document rather than in the covering email, because the email is the thing nobody can find in December."
          />
          <Area
            name="terms" label="Terms" rows={2}
            placeholder="Half on acceptance, half on delivery. The price holds for thirty days from the date above."
          />
        </Fields>
      ) : null}

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
          {estimate ? (
            <>
              <label htmlFor={`discount-${uid}`}>Discount %</label>
              <input
                id={`discount-${uid}`} name="discount" value={off} inputMode="decimal"
                onChange={(e) => setOff(e.target.value)}
              />
            </>
          ) : null}
          <label htmlFor={`vatRate-${uid}`}>VAT %</label>
          <input
            id={`vatRate-${uid}`} name="vatRate" value={vat} inputMode="decimal"
            onChange={(e) => setVat(e.target.value)}
          />
        </div>
        <dl>
          <div><dt>Subtotal</dt><dd>{naira(subtotal)}</dd></div>
          {cut > 0 ? <div><dt>Discount at {Number(off)}%</dt><dd>−{naira(cut)}</dd></div> : null}
          <div><dt>VAT at {rate}%</dt><dd>{naira(tax)}</dd></div>
          <div className="is-total"><dt>Total</dt><dd>{naira(net + tax)}</dd></div>
        </dl>
      </div>

      <Actions>
        <Submit icon={invoice ? Save : FileText}>{invoice ? "Save the draft" : "Save as a draft"}</Submit>
        {invoice ? null : (
          <button type="submit" name={estimate ? "send" : "issue"} value="1" className="ad__btn">
            <Send aria-hidden="true" /> {estimate ? "Save and send" : "Save and issue"}
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
/**
 * Money in, entered by hand.
 *
 * THIS IS THE STUDIO'S FORM, NOT A MENU THE CLIENT SEES. Clients pay through
 * the checkout on the invoice, and that is the only route the public document
 * offers. Transfer, cash and POS live here for the two cases a payments
 * integration cannot cover on its own: money that genuinely arrived some other
 * way, and a charge that went wrong somewhere Paystack cannot tell us about.
 * Without them the books get stuck on a payment everybody knows happened.
 *
 * `Credit` is deliberately absent. Money coming off a client's balance is
 * applied FROM the balance, which is what marks the credit spent; typed in
 * here it would be money no balance ever gave up. The action refuses it too,
 * because every export in that module is a public endpoint.
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
              name="method" label="How" half required defaultValue="Transfer"
              options={[
                { value: "Transfer", label: "Bank transfer" },
                { value: "Paystack", label: "Paystack" },
                { value: "Cash", label: "Cash" },
                { value: "POS", label: "POS terminal" },
                { value: "Other", label: "Something else" },
              ]}
              hint="For money that arrived outside the checkout, or a charge that went wrong. Pick &ldquo;something else&rdquo; rather than forcing a real payment into the nearest wrong box."
            />
            <Field
              name="reference" label="Reference" required
              placeholder="TRF_0092"
              hint="The bank reference or the Paystack transaction id. This is what stops the same payment being recorded twice."
            />
            <Field name="at" label="When" type="date" half
                   defaultValue={new Date().toISOString().slice(0, 10)} />
            {/* WHO IS RECORDING IT. A manual payment with no name against it is
                the entry nobody can question later. It becomes the signed-in
                admin once there is one; until then it is asked for. */}
            <Field name="by" label="Recorded by" half placeholder="Babatope"
                   hint="Who is entering this. It goes on the audit trail." />
            <Area name="note" label="Anything worth knowing" rows={2}
                  placeholder="Paid into the Zenith account at the office."
                  hint="Required if you picked &ldquo;something else&rdquo; above." />
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

/**
 * Money out.
 *
 * WHAT IT WAS FOR AND WHO WAS PAID ARE TWO FIELDS, not one. "Adobe" is the
 * answer to "who do we pay for this" and "Creative Cloud, the team plan" is
 * the answer to "what is it", and only the first adds up across a year of
 * rows. They were one field, and the expense report could not be grouped.
 *
 * THE PROJECT IS OPTIONAL AND THE CLIENT IS NOT ASKED AT ALL. An unallocated
 * expense is overhead, which is a real answer; where there IS a project, the
 * client comes off it on the server, because two fields that have to agree
 * will eventually disagree.
 *
 * THE RECEIPT IS A LINK. R2 upload from the admin is not wired, and a file
 * field that quietly does nothing is worse than one that asks for the address
 * of where the receipt already lives. The helper says so rather than leaving
 * somebody to find out.
 */
export function AddExpense({ projects = [] }: { projects?: Pick<Project, "id" | "title">[] }) {
  return (
    <DialogButton label="Add an expense" title="Money out" icon={Plus} wide>
      {(close) => (
        <Form action={createExpense} onDone={() => close()} resetOnDone>
          <Fields>
            <Field name="description" label="What it was for" required
                   placeholder="Creative Cloud, the team plan" />
            <Field name="vendor" label="Who was paid" half placeholder="Adobe" />
            <Field name="amount" label="Amount (₦)" required half inputMode="decimal" />
            <Select
              name="category" label="Category" half defaultValue="Software"
              options={EXPENSE_CATEGORIES.map((v) => ({ value: v, label: v }))}
            />
            <Select
              name="method" label="How it left" half defaultValue="Paystack"
              options={METHODS.map((v) => ({ value: v, label: v }))}
            />
            <Field name="at" label="When" type="date" half
                   defaultValue={new Date().toISOString().slice(0, 10)} />
            <Field name="by" label="Who entered it" half placeholder="Babatope" />
            {projects.length ? (
              <Select
                name="projectId" label="Against a project"
                placeholder="Agency overhead, no project"
                hint="Leave it on overhead unless the cost belongs to one job. This is what makes a project's margin readable."
                options={projects.map((p) => ({ value: p.id, label: p.title }))}
              />
            ) : null}
            <Field
              name="receiptUrl" label="Link to the receipt"
              placeholder="https://drive.google.com/..."
              hint="A link, not an upload: paste where the receipt already lives."
            />
            <Area name="note" label="Anything worth saying" rows={2}
                  placeholder="Agreed as a pass-through cost in the scope." />
          </Fields>
          <Checks
            name="rebillable" label="Billing" long
            hint="Plenty of project costs are ours to absorb, so having a project does not make a cost rebillable."
            options={[{ value: "yes", label: "We can bill this back to the client" }]}
          />
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
