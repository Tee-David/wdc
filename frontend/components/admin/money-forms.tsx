"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  Banknote, FileSignature, FileText, Plus, Save, Send, Trash2,
} from "lucide-react";
import {currencyOf,money,type PaymentAccountSnapshot} from "@/lib/money/currency";
import type { Invoice } from "@/lib/admin/types";
import { ENTERABLE_METHODS, EXPENSE_CATEGORIES, METHODS, naira } from "@/lib/admin/types";
import {
  createEstimate, createExpense, createInvoice, deleteInvoice, issueInvoice,
  recordPayment, updateInvoice,
} from "@/lib/admin/actions";
import { Actions, Area, Checks, Field, Fields, Form, Hidden, Select, Submit, Wrap } from "./form";
import { RemotePick, RemoteSelect } from "./remote-pick";
import { invoiceReceiptReason } from "@/lib/admin/search-actions";
import { SERVICES } from "@/lib/services";
import { DialogButton } from "./dialog";
import { NoticeTick, ReceiptTick } from "./reconcile-forms";

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
  invoice, clientName, projectTitle, clientId, trigger = "New invoice", dataTour,
  defaultVatRate, defaultDueInDays, credits, noEmail,
}: {
  /** Present when editing: a draft, or an issued invoice that is unpaid or part paid. */
  invoice?: Invoice;
  /** What the invoice's client and project are called, so the fields read by name without asking. */
  clientName?: string;
  projectTitle?: string;
  clientId?: string;
  trigger?: string;
  dataTour?: string;
  /** The studio's own default, from Settings -- ignored once `invoice` is
      present, since an existing draft's own figures always win. */
  defaultVatRate?: number;
  defaultDueInDays?: number;
  /** Kobo of stored credit, by client id, for the clients who hold any. */
  credits?: Record<string, number>;
  /** Why a client cannot be emailed, by client id (no address, updates off). */
  noEmail?: Record<string, string>;
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
          invoice={invoice} clientName={clientName} projectTitle={projectTitle}
          clientId={clientId} close={close}
          defaultVatRate={defaultVatRate} defaultDueInDays={defaultDueInDays}
          credits={credits} noEmail={noEmail}
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
  clientId, trigger = "New estimate", defaultVatRate, noEmail,
}: {
  clientId?: string;
  trigger?: string;
  defaultVatRate?: number;
  noEmail?: Record<string, string>;
}) {
  return (
    <DialogButton label={trigger} title="Quote for a piece of work" icon={FileSignature} tone="plain" wide>
      {(close) => (
        <Builder
          clientId={clientId} close={close} estimate
          defaultVatRate={defaultVatRate} noEmail={noEmail}
        />
      )}
    </DialogButton>
  );
}

const NEW = "__new";

/**
 * The edit sheet's contents, for a menu that is not the invoice page: the same
 * builder, locked to the invoice's own client. A draft, or an issued invoice
 * that is unpaid or part paid; the server refuses a total below what has been
 * received, and says so with the figure.
 */
export function EditInvoiceForm({ invoice, clientName, projectTitle, close }: {
  invoice: Invoice; clientName: string; projectTitle?: string; close: () => void;
}) {
  return <Builder invoice={invoice} clientName={clientName} projectTitle={projectTitle} close={close} />;
}

function Builder({
  invoice, clientName, projectTitle, clientId, close, estimate = false,
  defaultVatRate, defaultDueInDays, credits, noEmail,
}: {
  invoice?: Invoice;
  clientName?: string;
  projectTitle?: string;
  clientId?: string;
  close: () => void;
  /** Build an estimate rather than an invoice. */
  estimate?: boolean;
  defaultVatRate?: number;
  defaultDueInDays?: number;
  credits?: Record<string, number>;
  noEmail?: Record<string, string>;
}) {
  /* SCOPES THE VAT/DISCOUNT FIELD IDS TO THIS INSTANCE. `DialogButton` mounts
     its dialog's content whether or not it is open, and Money renders four of
     these builders (one invoice, three estimate) on one page -- a literal
     "vatRate" id would be duplicated four times over, and a browser's
     `label[for]` association resolves a duplicate id to whichever element
     matching it comes first in the document, which silently strips the label
     off every instance after that one. */
  const uid = useId();
  const [currency,setCurrency]=useState(currencyOf(invoice));
  const [accountId,setAccountId]=useState(invoice?.paymentAccount?.id||"");
  const [options,setOptions]=useState<{currencies:string[];accounts:PaymentAccountSnapshot[]}|null>(null);
  const [optionsError,setOptionsError]=useState("");
  useEffect(()=>{const controller=new AbortController();fetch("/api/admin/finance-options",{signal:controller.signal}).then(async response=>{if(!response.ok)throw Error("Payment choices could not load. Close and reopen this form to retry.");setOptions(await response.json());}).catch(error=>{if(!controller.signal.aborted)setOptionsError(error.message);});return()=>controller.abort();},[]);
  const accountChoices=[...(options?.accounts||[])];
  if(invoice?.paymentAccount && !accountChoices.some(item=>item.id===invoice.paymentAccount!.id))accountChoices.push(invoice.paymentAccount);
  const format=(amount:number)=>money(amount,currency);
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
  const [proj, setProj] = useState(invoice?.projectId ?? "");
  /* Already paid, or paid ahead? Only when raising a new invoice. */
  const [settle, setSettle] = useState<"" | "paid" | "credit">("");

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

  const set = (key: number, k: keyof Row, v: string) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [k]: v } : r)));

  const held = currency==="NGN" && who && who !== NEW ? credits?.[who] ?? 0 : 0;
  const issued = Boolean(invoice && invoice.status !== "Draft");
  /* A client typed in as new has no record to read yet: the server decides. */
  const cannotEmail = who && who !== NEW ? noEmail?.[who] : undefined;

  return (
    <Form action={estimate ? createEstimate : invoice ? updateInvoice : createInvoice} onDone={() => close()}>
      {invoice ? <Hidden name="id" value={invoice.id} /> : null}
      {issued ? (
        <p className="ad__dim" style={{ margin: "0 0 .8rem", fontSize: ".9rem", lineHeight: 1.55 }}>
          {invoice!.number} has been issued. What you change here shows on the client&apos;s copy
          straight away, and is written to the history.
          {invoice!.paid > 0 ? ` ${format(invoice!.paid)} has already been received, so the total cannot go below that.` : ""}
        </p>
      ) : null}
      {optionsError?<p role="alert" className="ad__fe">{optionsError}</p>:null}
      <Fields>
        {invoice && invoice.status!=="Draft"?<><Hidden name="currency" value={currency}/><p>Currency: {currency}. An issued document keeps its currency; raise a new one to change it.</p></>:<Select name="currency" label="Currency" value={currency} onChange={value=>{setCurrency(value);setAccountId("");setSettle("");}} options={[...new Set([...(options?.currencies||[currency]),currency])].map(value=>({value,label:value}))} hint={options?"Amounts are entered in this currency. No automatic conversion.":"Loading the currencies enabled in Settings..."}/>}
        <Select name="paymentAccountId" label="Manual payment account (optional)" value={accountId} onChange={setAccountId} placeholder="No account details" options={accountChoices.filter(item=>item.currency===currency).map(item=>({value:item.id,label:`${item.label} - ${item.bankName}`}))} hint={options?"The selected details appear on the invoice or quote, and its PDF.":"Loading payment accounts..."}/>

        {clientId && !invoice ? (
          <Hidden name="clientId" value={clientId} />
        ) : (
          <>
            <Hidden name="clientId" value={who} />
            <Wrap name="clientId" label="Bill to" required half>
              {(id) => (
                <RemotePick id={id} kind="clients" value={who} placeholder="Pick a client" label="Bill to"
                  onChange={(v) => { setWho(v); setProj(""); }} defaultLabel={clientName}
                  lead={invoice ? [] : [{ value: NEW, label: "+ Add a new client" }]} />
              )}
            </Wrap>
          </>
        )}
        <Hidden name="projectId" value={proj} />
        <Wrap name="projectId" label="Against" half
              hint={who ? undefined : "Pick a client first to see their projects."}>
          {(id) => (
            /* Disabled until a client is chosen: without one the search would offer every project. */
            <RemotePick id={id} kind="projects" scope={{ clientId: who }} value={proj} placeholder="No particular project" label="Against"
              onChange={setProj} defaultLabel={projectTitle} disabled={!who}
              lead={who && !invoice ? [{ value: NEW, label: "+ Open a new project" }] : []} />
          )}
        </Wrap>
        {who === NEW ? (
          <>
            <Field name="newClientCompany" label="New client: company or name" required half placeholder="Hesed Wisdom LLC" />
            <Field name="newClientName" label="Contact person" half placeholder="Ada Obi" />
            <Field name="newClientEmail" label="Email" half type="email" hint="If they are already a client by this email, that client is used." />
            <Field name="newClientPhone" label="Phone" half />
          </>
        ) : null}
        {proj === NEW ? (
          <>
            <Field name="newProjectTitle" label="New project name" half placeholder="Leave empty to name it after the client" />
            <Select name="newProjectService" label="Service" half required placeholder="Pick one"
                    options={SERVICES.map((x) => ({ value: x.slug, label: x.short }))} />
          </>
        ) : null}
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
          <span>Description</span><span>Qty</span><span>Unit ({currency})</span><span>Line</span><span />
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
                <span>Unit ({currency})</span>
                <input
                  name="ln_unit" value={r.unit} inputMode="decimal" placeholder="450000"
                  onChange={(e) => set(r.key, "unit", e.target.value)}
                />
              </label>
              <p className="ad__lineT">
                <span>Line</span>
                <b>{format(Math.round(q * u))}</b>
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
          <div><dt>Subtotal</dt><dd>{format(subtotal)}</dd></div>
          {cut > 0 ? <div><dt>Discount at {Number(off)}%</dt><dd>−{format(cut)}</dd></div> : null}
          <div><dt>VAT at {rate}%</dt><dd>{format(tax)}</dd></div>
          <div className="is-total"><dt>Total</dt><dd>{format(net + tax)}</dd></div>
        </dl>
      </div>

      {/* NOT EVERY CLIENT PAYS THROUGH THE INVOICE. Some paid ahead, or paid a
          transfer before there was a document to put it against. Choosing
          either raises the invoice already issued AND takes the money (or
          their stored credit) in the same step, with a receipt, so the books
          never show it owing when it is not. */}
      {!estimate && !invoice ? (
        <fieldset className="ad__f" style={{ border: 0, padding: 0, margin: "0 0 .6rem" }}>
          <legend className="ad__fl">Has it been paid?</legend>
          <div className="ad__checks ad__checks--long">
            {([
              ["", "Not yet", "Raise it as usual. Record payments against it as they arrive."],
              ["paid", "Already paid, or paid in advance", "Raise it issued and settled, with the payment and a receipt."],
              ...(held > 0 ? [["credit", `Use the ${format(held)} they have on account`, "Takes their stored credit, oldest first, up to the invoice total."]] : []),
            ] as [string, string, string][]).map(([value, label, note]) => (
              <label key={value || "none"} className="ad__check ad__check--long">
                <input type="radio" name="settle" value={value} checked={settle === value} onChange={() => setSettle(value as typeof settle)} />
                <span>{label}<small>{note}</small></span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      {!estimate && !invoice && settle === "paid" ? (
        <Fields>
          <Select
            name="method" label="How was it paid" half required defaultValue="Transfer"
            options={[
              { value: "Transfer", label: "Bank transfer" }, { value: "Cash", label: "Cash" },
              { value: "Card", label: "Card (outside the checkout)" }, { value: "POS", label: "POS terminal" },
              { value: "Other", label: "Something else" },
            ]}
          />
          <Field name="paidAt" label="When it arrived" type="date" half defaultValue={new Date().toISOString().slice(0, 10)} />
          <Field name="paidReference" label="Reference" half placeholder="TRF_0092"
                 hint="Needed for a bank transfer, and it stops the same transfer being entered twice. For cash, card or POS, a slip number if there is one." />
          <Field name="paidAmount" label="Amount received (₦)" half inputMode="decimal"
                 hint="Leave empty if it was the whole invoice. Less than the total records a part payment." />
          <Area name="paidNote" label="Anything worth knowing" rows={2} placeholder="Paid ahead at the kick-off meeting."
                hint="Required if you picked something else." />
        </Fields>
      ) : null}
      {!estimate && !invoice && settle ? <ReceiptTick reason={cannotEmail} /> : null}
      {estimate ? (
        <NoticeTick name="emailClient" label="Email it to the client when it is sent" reason={cannotEmail}
                    hint="Only when you press Save and send. A draft emails nobody." />
      ) : null}

      <Actions>
        {!estimate && !invoice && settle ? (
          <Submit icon={Send}>{settle === "credit" ? "Issue it and use their credit" : "Issue it and record the payment"}</Submit>
        ) : (
          <>
            <Submit icon={invoice ? Save : FileText}>
              {invoice ? (issued ? "Save the changes" : "Save the draft") : "Save as a draft"}
            </Submit>
            {invoice ? null : (
              <button type="submit" name={estimate ? "send" : "issue"} value="1" className="ad__btn">
                <Send aria-hidden="true" /> {estimate ? "Save and send" : "Save and issue"}
              </button>
            )}
          </>
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
          /* A native select, or the searchable picker's hidden input. */
          const sel = form.querySelector<HTMLSelectElement | HTMLInputElement>('[name="clientId"]');
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
export function RecordPayment({ invoice, owed, noReceipt, issueFirst }: { invoice: Invoice; owed: number; noReceipt?: string; issueFirst?: boolean }) {
  return (
    <DialogButton label={issueFirst ? "Issue and record a payment" : "Record a payment"} title={issueFirst ? `Issue ${invoice.number} and record the money` : `Money in against ${invoice.number}`} icon={Banknote}>
      {(close) => (
        <Form action={recordPayment} onDone={() => close()}>
          <Fields>
            <Hidden name="invoiceId" value={invoice.id} />
            {issueFirst ? <Hidden name="issueFirst" value="1" /> : null}
            <Field
              name="amount" label={`Amount (${currencyOf(invoice)})`} required half inputMode="decimal"
              defaultValue={owed ? String(owed / 100) : ""}
              hint="Starts at what is owed. Change it for a part payment."
            />
            <Select
              name="method" label="How" half required defaultValue="Transfer"
              options={[
                { value: "Transfer", label: "Bank transfer" },
                ...(currencyOf(invoice)==="NGN"?[{ value: "Paystack", label: "Paystack" }]:[]),
                { value: "Cash", label: "Cash" },
                { value: "Card", label: "Card (outside the checkout)" },
                { value: "POS", label: "POS terminal" },
                { value: "Other", label: "Something else" },
              ]}
              hint="For money that arrived outside the checkout, or a charge that went wrong. Pick &ldquo;something else&rdquo; rather than forcing a real payment into the nearest wrong box."
            />
            <Field
              name="reference" label="Reference"
              placeholder="TRF_0092"
              hint="The bank reference for a transfer (needed, and it stops the same payment being recorded twice). For cash, card or POS, a slip number if there is one."
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
          <ReceiptTick reason={noReceipt} />
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
export function AddExpense({ project }: {
  /** On a project's own page: the cost starts against that project (still changeable). */
  project?: { id: string; title: string };
}) {
  /* "Add another" starts clean: a new key remounts the form, which also puts the searched picker back (form.reset() cannot reach its state). */
  const [fresh, setFresh] = useState(0);
  return (
    <DialogButton label="Add an expense" title="Money out" icon={Plus} wide>
      {(close) => (
        <Form key={fresh} action={createExpense} onDone={() => { close(); setFresh((n) => n + 1); }}>
          <Fields>
            <Field name="description" label="What it was for" required
                   placeholder="Creative Cloud, the team plan" />
            <Field name="vendor" label="Who was paid" half placeholder="Adobe" />
            <Field name="amount" label="Amount (NGN)" required half inputMode="decimal" />
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
            <RemoteSelect
              name="projectId" label="Against a project" kind="projects"
              placeholder="Agency overhead, no project"
              defaultValue={project?.id} defaultLabel={project?.title}
              hint="Leave it on overhead unless the cost belongs to one job. This is what makes a project's margin readable."
            />
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
 * THE FORM'S `confirm` (the shared dialog in ./confirm.tsx, never the
 * browser's), spent only on the irreversible ones, because a prompt on
 * everything is a prompt people learn to click through without reading. A
 * question that says it cannot be undone also asks for "I understand".
 */
export function IssueInvoice({ invoice }: { invoice: Invoice }) {
  return (
    <Form
      action={issueInvoice}
      confirm={`Issue ${invoice.number}? Its number is fixed from then on, and the client can see it.`}
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

/* `RemoveExpense` used to live here and is gone with the bare button it drew.
   Removing an expense is in the row's own menu now, behind a sentence that
   names the expense and says what it comes out of -- see ExpenseMenu in
   row-actions.tsx. */

/* ------------------------------------------------- a payment, from anywhere */

/**
 * Money arrived; which invoice is it for?
 *
 * The same `recordPayment` the invoice's own menu uses, with the invoice
 * picked first, for the morning somebody opens the dashboard holding a bank
 * alert rather than an invoice number. Only invoices that can take money are
 * offered: issued, not struck, with something still owed.
 */
export function RecordAnyPayment({ clientId }: {
  /** On a client's page: only that client's invoices are offered. */
  clientId?: string;
}) {
  /* Why the chosen invoice's client cannot be emailed a receipt, asked once an invoice is picked (the form no longer holds the client list). A late answer for an invoice that is no longer the chosen one is dropped. */
  const [noReceipt, setNoReceipt] = useState<{ id: string; why?: string }>({ id: "" });
  const chosenInvoice=useRef("");
  const [selectedCurrency,setSelectedCurrency]=useState("");
  const [currencyError,setCurrencyError]=useState("");
  const [fresh, setFresh] = useState(0); // remounts the form after a success, so the picker starts empty again
  const choose = (id: string) => {
    chosenInvoice.current=id;setNoReceipt({ id });setSelectedCurrency("");setCurrencyError("");
    if(id)fetch(`/api/admin/finance-options?invoiceId=${encodeURIComponent(id)}`).then(async response=>{if(!response.ok)throw Error("Invoice currency could not load. Pick the invoice again.");const data=await response.json();if(chosenInvoice.current===id)setSelectedCurrency(data.currency);}).catch(error=>{if(chosenInvoice.current===id)setCurrencyError(error.message);});
    if (id) invoiceReceiptReason(id).then((why) => setNoReceipt((c) => (c.id === id ? { id, why } : c))).catch(() => {});
  };
  return (
    <DialogButton label="Record a payment" title="Money in" icon={Banknote} wide>
      {(close) => (
        <Form key={fresh} action={recordPayment} onDone={() => { close(); setNoReceipt({ id: "" }); setFresh((n) => n + 1); }}>
          <Fields>
            <RemoteSelect name="invoiceId" label="Against which invoice" required
                          kind="invoices" scope={{ invoices: "open", clientId }}
                          placeholder="Pick the invoice" onChange={(v) => choose(v)} />
            <Field name="amount" label={selectedCurrency?`Amount (${selectedCurrency})`:"Amount in the invoice currency"} required half inputMode="decimal"
                   hint="What arrived. A part payment is fine." />
            <Select name="method" label="How" half defaultValue="Transfer"
                    options={ENTERABLE_METHODS.map((m) => ({ value: m, label: m === "Transfer" ? "Bank transfer" : m }))} />
            <Field name="reference" label="Reference" placeholder="TRF_0092"
                   hint="The bank reference for a transfer (needed, and it stops the same payment being recorded twice). For cash, card or POS, a slip number if there is one." />
            <Field name="at" label="When" type="date" half defaultValue={new Date().toISOString().slice(0, 10)} />
            <Field name="note" label="Note" placeholder="Paid at the office" hint="Needed when the method is Other." />
          </Fields>
          <ReceiptTick key={noReceipt.why ?? "ok"} reason={noReceipt.why} />
          <Actions>
            {currencyError?<p role="alert">{currencyError}</p>:null}
            <Submit icon={Banknote} disabled={!selectedCurrency}>Record it</Submit>
          </Actions>
        </Form>
      )}
    </DialogButton>
  );
}
