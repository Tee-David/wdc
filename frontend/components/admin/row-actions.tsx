"use client";

import { PermanentDelete } from "./permanent-delete";
import { useAdminRole } from "./shell";
import { can } from "@/lib/admin/permissions";

import {
  Archive, ArchiveRestore, ArrowRight, Ban, Banknote, CalendarDays, Copy,
  CheckCircle2, CornerUpLeft, FilePlus2, FolderPlus, MessageSquarePlus, Move, Pencil,
  Receipt, Send, Trash2, Undo2, UserPlus, Users, Wallet,
  type LucideIcon,
} from "lucide-react";
import { SERVICES } from "@/lib/services";
import {
  ENTERABLE_METHODS, STAGES, estimateState, estimateTotals, invoiceStatus,
  invoiceTotals, naira, paymentNet, refundedTotal,
  type Client, type Estimate, type Expense, type Invoice, type Payment,
  type Project, type Submission,
} from "@/lib/admin/types";
import {
  addNote, answerEstimate, archiveClient, attachSubmission, createProject,
  deleteInvoice, duplicateEstimate, duplicateInvoice, issueInvoice, moveStage, overpaymentToCredit,
  recordPayment, refundPayment, removeExpense, reversePayment,
  sendEstimate, sendReceipt, setDue, setProjectArchived, updateClient,
  voidInvoice,
} from "@/lib/admin/actions";
import { Actions, Area, Field, Fields, Form, Hidden, Radios, Select, Submit } from "./form";
import { EditInvoiceForm } from "./money-forms";
import { NoticeTick, ReceiptTick } from "./reconcile-forms";
import { RowMenu, type RowMenuItem } from "./row-menu";
import { ClientFields } from "./client-form";
import { OwnerField } from "./owner-field";

/**
 * What each row can be asked to do.
 *
 * ONE FILE, BECAUSE THE MENUS HAVE TO AGREE WITH EACH OTHER. The same project
 * appears on the dashboard, on the board, in the projects table and on its
 * client's page; if each of those screens assembled its own menu, four of them
 * would drift, and the one people learn on would be whichever they opened
 * first. A screen asks for `<ProjectMenu>` and gets the same verbs everywhere.
 *
 * WHAT IS OFFERED IS WHAT IS TRUE. An invoice that has been issued cannot be
 * edited or deleted, and a draft has nothing to take a payment against, so
 * neither menu carries the item the other needs. A greyed-out row of things
 * you cannot do teaches people to stop reading the menu.
 */

const SERVICE_OPTIONS = SERVICES.map((s) => ({ value: s.slug, label: s.short }));

/**
 * The body of a menu item that only has to be pressed: a sentence saying what
 * is about to happen, and the button that does it.
 *
 * The sentence is the point. These actions issue invoices, archive clients and
 * move stages that email people, and a menu item is a small target read in
 * passing. The old `window.confirm` on the row did the same job in a browser
 * chrome box that cannot show which record it means or report what went wrong;
 * this one is the action's own form, so a failure lands where the reader is
 * still looking.
 */
function Sure({
  action, fields, verb, icon, tone = "primary", close, children,
}: {
  action: (prev: never, fd: FormData) => Promise<never>;
  fields: Record<string, string>;
  verb: string;
  icon?: LucideIcon;
  tone?: "primary" | "danger";
  close: () => void;
  children: React.ReactNode;
}) {
  return (
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any -- the
       actions share one shape; `Sure` is generic over all of them. */
    <Form action={action as any} onDone={() => close()}>
      <div className="ad__sure">
        <p>{children}</p>
      </div>
      {Object.entries(fields).map(([k, v]) => <Hidden key={k} name={k} value={v} />)}
      <Actions>
        <button type="button" className="ad__btn" onClick={close}>Leave it</button>
        <Submit tone={tone} icon={icon}>{verb}</Submit>
      </Actions>
    </Form>
  );
}

/* --------------------------------------------------------------- projects */

export function ProjectMenu({
  project, clientName,
}: {
  project: Pick<Project, "id" | "title" | "stage" | "due" | "clientId" | "archived">;
  clientName?: string;
}) {
  const items: RowMenuItem[] = [
    { kind: "link", label: "Open the project", href: `/admin/projects/${project.id}`, icon: ArrowRight },
    {
      kind: "dialog", label: "Move its stage", icon: Move,
      title: `Move ${project.title}`,
      render: (close) => (
        <Form action={moveStage} onDone={() => close()}>
          <Fields>
            <Hidden name="id" value={project.id} />
            <Select
              name="stage" label="Move to" required defaultValue={project.stage}
              options={STAGES.map((s) => ({ value: s, label: s }))}
              hint="Moving writes an event onto the project's history."
            />
            <Area name="note" label="Say why (optional)" rows={2}
                  placeholder="Second round of routes sent." />
          </Fields>
          <Actions>
            <Submit icon={Move}>Move it</Submit>
          </Actions>
        </Form>
      ),
    },
    {
      kind: "dialog", label: "Set the due date", icon: CalendarDays,
      title: `Due date for ${project.title}`,
      render: (close) => (
        <Form action={setDue} onDone={() => close()}>
          <Fields>
            <Hidden name="id" value={project.id} />
            <Field name="due" label="Due" type="date"
                   defaultValue={project.due ? project.due.slice(0, 10) : ""}
                   hint="Clear the field and save to remove it." />
          </Fields>
          <Actions>
            <Submit icon={CalendarDays}>Set it</Submit>
          </Actions>
        </Form>
      ),
    },
    {
      kind: "dialog", label: "Add to the history", icon: MessageSquarePlus,
      title: `A note on ${project.title}`,
      render: (close) => (
        <Form action={addNote} onDone={() => close()}>
          <Fields>
            <Hidden name="id" value={project.id} />
            <Area name="note" label="What happened" rows={3} required
                  placeholder="Client approved the second route." />
          </Fields>
          <Actions>
            <Submit icon={MessageSquarePlus}>Add it</Submit>
          </Actions>
        </Form>
      ),
    },
    {
      kind: "link", label: clientName ? `Open ${clientName}` : "Open the client",
      href: `/admin/clients/${project.clientId}`, icon: Users,
    },
    {
      /* ARCHIVE, AND THERE IS NO DELETE. A project owns invoices, payments,
         updates and approvals, and those are the financial and evidential
         record of what was agreed. Archiving takes it out of the lists and
         leaves every one of them exactly where it is. */
      kind: "dialog", area: "destructive",
      label: project.archived ? "Take it out of the archive" : "Archive it",
      icon: Archive,
      title: project.archived ? `Restore ${project.title}` : `Archive ${project.title}`,
      render: (close) => (
        <Sure
          action={setProjectArchived as never}
          fields={{ id: project.id, archived: project.archived ? "false" : "true" }}
          verb={project.archived ? "Put it back" : "Archive it"}
          icon={Archive}
          tone={project.archived ? "primary" : "danger"}
          close={close}
        >
          {project.archived
            ? `${project.title} goes back into the project lists exactly as it was.`
            : `${project.title} drops out of the lists and the board. Its invoices,
               payments, updates, approvals and file versions stay exactly as they
               are, because those are the record. Once archived, the owner can delete it for good.`}
        </Sure>
      ),
    },
    ...(project.archived ? [{
      kind: "dialog" as const, area: "settings" as const, label: "Delete permanently", icon: Trash2, tone: "danger" as const,
      title: `Delete ${project.title} permanently`, wide: true,
      render: (close: () => void) => <PermanentDelete kind="project" id={project.id} name={project.title} close={close} />,
    }] : []),
  ];

  return <RowMenu items={items} label={project.title} />;
}

/* ---------------------------------------------------------------- clients */

export function ClientMenu({ client }: { client: Client }) {
  const back = Boolean(client.archived);

  const items: RowMenuItem[] = [
    { kind: "link", label: "Open the client", href: `/admin/clients/${client.id}`, icon: ArrowRight },
    {
      kind: "dialog", label: "Edit their details", icon: Pencil, wide: true,
      title: `Edit ${client.company}`,
      render: (close) => (
        <Form action={updateClient} onDone={() => close()}>
          <ClientFields client={client} />
          <Actions>
            <Submit icon={Pencil}>Save</Submit>
          </Actions>
        </Form>
      ),
    },
    {
      kind: "dialog", label: "Open a project for them", icon: FilePlus2, wide: true,
      title: `A project for ${client.company}`,
      /* createProject redirects to the project it opened, so the dialog goes
         with the page rather than being closed by hand. */
      render: () => (
        <Form action={createProject}>
          <Fields>
            <Hidden name="clientId" value={client.id} />
            <Field name="title" label="What it is" required half placeholder="Identity system" />
            <Select name="service" label="Service" required half placeholder="Pick one"
                    options={SERVICE_OPTIONS} />
            <Select name="stage" label="Starting at" half defaultValue="Onboarding"
                    options={STAGES.map((s) => ({ value: s, label: s }))} />
            <Field name="due" label="Due" type="date" half
                   hint="Leave it empty until a date is actually agreed." />
          </Fields>
          <Actions>
            <Submit icon={FilePlus2}>Open it</Submit>
          </Actions>
        </Form>
      ),
    },
    {
      kind: "dialog", area: "destructive",
      label: back ? "Put them back on the books" : "Archive them",
      icon: back ? ArchiveRestore : Archive,
      tone: back ? undefined : "danger",
      title: back ? `Restore ${client.company}` : `Archive ${client.company}`,
      render: (close) => (
        <Sure
          action={archiveClient as never}
          fields={back ? { id: client.id, restore: "1" } : { id: client.id }}
          verb={back ? "Restore them" : "Archive them"}
          icon={back ? ArchiveRestore : Archive}
          tone={back ? "primary" : "danger"}
          close={close}
        >
          {back
            ? `${client.company} goes back into the lists exactly as they were.`
            : `${client.company} drops out of the lists. Their projects, invoices and payments stay exactly as they are, because those are the financial record. Once archived, the owner can delete them for good.`}
        </Sure>
      ),
    },
    ...(back ? [{
      kind: "dialog" as const, area: "settings" as const, label: "Delete permanently", icon: Trash2, tone: "danger" as const,
      title: `Delete ${client.company} permanently`, wide: true,
      render: (close: () => void) => <PermanentDelete kind="client" id={client.id} name={client.company} close={close} />,
    }] : []),
  ];

  return <RowMenu items={items} label={client.company} />;
}

/* --------------------------------------------------------------- invoices */

/**
 * `edit` carries what the edit sheet needs (the client's name and their
 * projects); a screen that cannot supply it still gets "Edit it", as a link to
 * the invoice page where the same sheet opens. `noReceipt` is why the client
 * cannot be emailed a receipt (no address, updates off), shown beside the
 * disabled tick.
 */
export function InvoiceMenu({
  invoice, edit, noReceipt,
}: {
  invoice: Invoice;
  edit?: { clientName: string; projects: { id: string; title: string; clientId: string }[] };
  noReceipt?: string;
}) {
  const status = invoiceStatus(invoice);
  const draft = status === "Draft";
  const owed = invoiceTotals(invoice).due;

  const items: RowMenuItem[] = [
    { kind: "link", label: "Open the invoice", href: `/admin/money/${invoice.id}`, icon: ArrowRight },
  ];

  /* EDITING IS OFFERED WHERE IT IS TRUE: a draft, and an issued invoice that is
     still unpaid or part paid. The total can never be taken below what has been
     received (the action says so with the figure if it is tried). */
  if (!invoice.voided) {
    items.push(edit ? {
      kind: "dialog", label: "Edit it", icon: Pencil, wide: true,
      title: `Edit ${invoice.number}`,
      render: (close) => <EditInvoiceForm invoice={invoice} clientName={edit.clientName} projects={edit.projects} close={close} />,
    } : { kind: "link", label: "Edit it", href: `/admin/money/${invoice.id}`, icon: Pencil });
  }

  if (draft) {
    items.push({
      kind: "dialog", label: "Issue it", icon: Send,
      title: `Issue ${invoice.number}`,
      render: (close) => (
        <Sure action={issueInvoice as never} fields={{ id: invoice.id }}
              verb="Issue it" icon={Send} close={close}>
          Its number and its lines are fixed from then on, and it starts
          counting towards what is owed.
        </Sure>
      ),
    });
  } else if (owed > 0 && !invoice.voided) {
    items.push({
      kind: "dialog", label: "Record a payment", icon: Banknote,
      title: `Money in against ${invoice.number}`,
      render: (close) => (
        <Form action={recordPayment} onDone={() => close()}>
          <Fields>
            <Hidden name="invoiceId" value={invoice.id} />
            <Field name="amount" label="Amount (₦)" required half inputMode="decimal"
                   defaultValue={String(owed / 100)}
                   hint="Starts at what is owed. Change it for a part payment." />
            {/* BUILT FROM THE SHARED LIST, minus the one a person may not
                choose. It used to be three hard-coded options, which meant
                POS and Other were in the union, accepted by the validator and
                impossible to pick. Credit is excluded because money coming
                off a client's balance is applied from the balance, not typed
                in here -- see the note on METHODS. */}
            <Select name="method" label="How" half defaultValue="Transfer"
                    options={ENTERABLE_METHODS.map((m) => ({
                      value: m, label: m === "Transfer" ? "Bank transfer" : m,
                    }))} />
            <Field name="reference" label="Reference" placeholder="TRF_0092"
                   hint="The bank reference for a transfer (needed, and it stops the same payment being recorded twice). For cash, card or POS, a slip number if there is one." />
            <Field name="note" label="Note" placeholder="Paid at the office"
                   hint="Anything worth knowing later. Needed when the method is Other." />
            <Field name="at" label="When" type="date" half
                   defaultValue={new Date().toISOString().slice(0, 10)} />
          </Fields>
          <ReceiptTick reason={noReceipt} />
          <Actions>
            <Submit icon={Banknote}>Record it</Submit>
          </Actions>
        </Form>
      ),
    });
  }

  if (!draft && owed > 0 && !invoice.voided) {
    items.splice(Math.max(0, items.length - 1), 0, {
      kind: "dialog", label: "Mark as paid", icon: CheckCircle2,
      title: `Mark ${invoice.number} as paid`,
      render: (close) => (
        <Form action={recordPayment} onDone={() => close()}>
          <Fields>
            <Hidden name="invoiceId" value={invoice.id} />
            <Hidden name="amount" value={String(owed / 100)} />
            <p style={{ margin: 0 }}>Records the full {naira(owed)} still owed as received, with a receipt. For part of it, use Record a payment.</p>
            <Select name="method" label="How was it paid" defaultValue="Transfer"
                    options={ENTERABLE_METHODS.map((m) => ({ value: m, label: m === "Transfer" ? "Bank transfer" : m }))} />
            <Field name="reference" label="Reference" placeholder="TRF_0092" hint="Needed for a transfer. For cash, card or POS, a slip number if there is one." />
            <Field name="at" label="When" type="date" half defaultValue={new Date().toISOString().slice(0, 10)} />
            <Field name="note" label="Note" placeholder="Paid at the office" hint="Needed when the method is Other." />
          </Fields>
          <ReceiptTick reason={noReceipt} />
          <Actions><Submit icon={CheckCircle2}>Mark as paid</Submit></Actions>
        </Form>
      ),
    });
  }

  items.push({
    kind: "link", label: "Open the client", href: `/admin/clients/${invoice.clientId}`, icon: Users,
  });

  items.push({
    kind: "dialog", label: "Duplicate it", icon: Copy,
    title: `Copy ${invoice.number}`,
    render: (close) => (
      <Sure action={duplicateInvoice as never} fields={{ id: invoice.id }}
            verb="Copy it" icon={Copy} close={close}>
        The same client, project and lines, as a new draft with its own number,
        dated today. Nothing paid against {invoice.number} comes across, and the
        original stays exactly as it is.
      </Sure>
    ),
  });

  /* STRIKING IS OFFERED ONLY WHERE IT IS TRUE. Not on a draft -- that gets
     deleted, because nobody has seen the number -- not on one already struck,
     and not on one with money against it, where the honest correction names
     where the money went. Offering a button that would be refused teaches
     people to distrust the menu. */
  if (!draft && !invoice.voided && invoice.paid <= 0) {
    items.push({
      kind: "dialog", label: "Void it", icon: Ban, tone: "danger",
      title: `Void ${invoice.number}`,
      render: (close) => (
        <Form action={voidInvoice} onDone={() => close()}
              confirm={`Void ${invoice.number}? It comes out of what is owed, the aging and the collection rate, and the number is never reused. This cannot be undone.`}>
          <Fields>
            <Hidden name="id" value={invoice.id} />
            <Area name="reason" label="Why" rows={2} required
                  placeholder="Raised against the wrong client. Re-issued as INV-2026-006."
                  hint="Required. A client may be holding this document, and this is what answers them." />
            <Field name="by" label="Struck by" placeholder="Babatope" />
          </Fields>
          <NoticeTick name="tellClient" label="Tell the client it is cancelled" reason={noReceipt}
                      hint="Emails them that nothing is owed on it, with the reason above. Untick if they never had it." />
          <p className="ad__dim" style={{ fontSize: ".88rem", lineHeight: 1.6 }}>
            {invoice.number} keeps its number and its page keeps working, saying
            nothing is owed. It comes out of what is outstanding, out of the
            aging and out of the collection rate. The number is not reused,
            because unbroken numbering is most of what makes the books
            auditable.
          </p>
          <Actions>
            <Submit icon={Ban} tone="danger">Void it</Submit>
          </Actions>
        </Form>
      ),
    });
  }

  /* The overpayment is real money and the studio has to decide about it. This
     is one of the two answers; the other is a refund on the payment. */
  if (!draft && !invoice.voided && invoice.paid > invoiceTotals(invoice).total) {
    items.push({
      kind: "dialog", label: "Move the excess to credit", icon: Wallet,
      title: `${naira(invoice.paid - invoiceTotals(invoice).total)} over`,
      render: (close) => (
        <Form action={overpaymentToCredit} onDone={() => close()}>
          <div className="ad__sure">
            <p>
              {invoice.number} has taken {naira(invoice.paid - invoiceTotals(invoice).total)}{" "}
              more than it is for. This moves the excess onto the client&apos;s
              balance, so this invoice lands exactly on its total and the money
              comes off their next one. To send it back instead, refund the payment.
            </p>
          </div>
          <Hidden name="id" value={invoice.id} />
          <NoticeTick name="tellClient" label="Tell the client by email" reason={noReceipt} />
          <Actions>
            <button type="button" className="ad__btn" onClick={close}>Leave it</button>
            <Submit icon={Wallet}>Put it on their balance</Submit>
          </Actions>
        </Form>
      ),
    });
  }

  if (draft) {
    items.push({
      kind: "dialog", label: "Delete the draft", icon: Trash2, tone: "danger",
      title: `Delete ${invoice.number}`,
      render: (close) => (
        <Sure action={deleteInvoice as never} fields={{ id: invoice.id }}
              verb="Delete it" icon={Trash2} tone="danger" close={close}>
          It has never been issued, so nothing outside this screen refers to
          it. An issued invoice cannot be deleted at all.
        </Sure>
      ),
    });
  }

  return <RowMenu items={items} label={invoice.number} />;
}

/* --------------------------------------------------------------- payments */

export function PaymentMenu({
  payment, invoiceNumber, noEmail,
}: {
  payment: Payment;
  invoiceNumber?: string;
  /** Why the client cannot be emailed about this (no address, updates off). */
  noEmail?: string;
}) {
  const items: RowMenuItem[] = [
    { kind: "link", label: "Open the invoice", href: `/admin/money/${payment.invoiceId}`, icon: ArrowRight },
  ];

  /* THE RECEIPT, AGAIN OR FOR THE FIRST TIME. The only way to put a receipt in
     a client's inbox from the app: before this, a payment entered by hand had
     a link on the invoice page and nothing else. Works on a payment whose
     receipt failed too (the failed row is replaced, not duplicated), and is
     held to once a day so it cannot be pressed into a flood. A reversed payment
     has no receipt to send. */
  if (!payment.reversed) {
    items.push({
      kind: "dialog", label: "Send the receipt", icon: Receipt,
      title: `Receipt ${payment.receiptNo}`,
      render: (close) => (
        <Sure action={sendReceipt as never} fields={{ id: payment.id }}
              verb="Email the receipt" icon={Receipt} close={close}>
          Emails the link to receipt {payment.receiptNo} ({naira(payment.amount)}) to the client:
          again if it has been sent before, or for the first time if it has not.
          The receipt page is the live document, so it always shows refunds and reversals.
          At most one copy a day.{noEmail ? ` Note: ${noEmail}` : ""}
        </Sure>
      ),
    });
  }

  /* REFUNDING AND REVERSING ARE DIFFERENT VERBS AND BOTH ARE HERE.

     A reversal says the money never really came: the transfer bounced, or the
     row should not exist. A refund says it came, we had it, and it went back.
     A client reconciling against their bank statement sees two movements for a
     refund and none for a reversal, so a menu that offered only one of them
     would force somebody to record the wrong event. */
  const left = paymentNet(payment);
  if (!payment.reversed && left > 0) {
    items.push({
      kind: "dialog", label: "Refund it", icon: CornerUpLeft,
      title: `Give back some of ${naira(payment.amount)}`,
      render: (close) => (
        <Form action={refundPayment} onDone={() => close()}
              confirm={`Record this refund against ${payment.receiptNo}? It is part of the books from then on: a wrong refund is corrected by a new entry, never by taking this one out. This cannot be undone.`}>
          <Fields>
            <Hidden name="id" value={payment.id} />
            <Field
              name="amount" label="How much goes back (₦)" required half inputMode="decimal"
              defaultValue={String(left / 100)}
              hint={refundedTotal(payment)
                ? `${naira(left)} of this payment is left. ${naira(refundedTotal(payment))} has already gone back.`
                : "Starts at the whole payment. Change it for a part refund."}
            />
            <Field name="reference" label="Reference" half placeholder="RFND_0031"
                   hint="The provider's refund id or the transfer narration, if there is one." />
            <Area name="reason" label="Why" rows={2} required
                  placeholder="Project stopped after discovery. Returning the unused half of the deposit."
                  hint="Required. This is money leaving, and it is the entry somebody will question." />
            <Field name="by" label="Refunded by" placeholder="Babatope" />
          </Fields>
          <Radios
            name="where" label="Where it goes" defaultValue="bank"
            options={[
              { value: "bank", label: "Back to their bank",
                note: "The money leaves the studio. It comes off the month's income and off this invoice." },
              { value: "credit", label: "Held on their balance",
                note: "The money stays with us as credit for this client, and comes off their next invoice." },
            ]}
          />
          <NoticeTick name="tellClient" label="Tell the client by email" reason={noEmail}
                      hint="Says how much went back (or is held for them) and what they owe now. Not the reason above." />
          <Actions>
            <Submit icon={CornerUpLeft}>Record the refund</Submit>
          </Actions>
        </Form>
      ),
    });
  }

  /* ALREADY REVERSED OFFERS NOTHING, rather than offering a button that fails.
     The same rule the invoice menus follow: what is offered is what is true. */
  if (!payment.reversed) {
    items.push({
      kind: "dialog", label: "Reverse it", icon: Undo2, tone: "danger",
      title: `Reverse ${naira(payment.amount)}`,
      render: (close) => (
        <Form action={reversePayment} onDone={() => close()}
              confirm={`Reverse ${payment.receiptNo}? ${naira(payment.amount)} comes off ${invoiceNumber ?? "the invoice"} and it re-totals. The row stays on the books marked reversed. This cannot be undone.`}>
          <Fields>
            <Hidden name="id" value={payment.id} />
            <Hidden name="invoiceId" value={payment.invoiceId} />
            <Area
              name="reason" label="Why" rows={2} required
              placeholder="Transfer bounced. Bank returned it on the 14th."
              hint="Required. This is the entry somebody will question later, and it is the only thing that can answer them."
            />
            <Field name="by" label="Reversed by" placeholder="Babatope"
                   hint="Goes on the audit trail and on the receipt." />
          </Fields>
          <p className="ad__dim" style={{ fontSize: ".88rem", lineHeight: 1.6 }}>
            {naira(payment.amount)} comes off {invoiceNumber ?? "the invoice"} and it
            re-totals. The row stays on the books marked reversed and keeps its
            receipt number, because {payment.receiptNo} has its own link and the
            client may be holding it, and it will say REVERSED rather than stop
            working. Use this for a payment entered twice or against the wrong
            invoice, not for a refund: a refund is money going out.
          </p>
          <NoticeTick name="tellClient" label="Tell the client by email" reason={noEmail}
                      hint="Says the payment was taken off and what they owe now. Untick if it was entered by mistake and they never saw it." />
          <Actions>
            <Submit icon={Undo2} tone="danger">Reverse it</Submit>
          </Actions>
        </Form>
      ),
    });
  }

  return <RowMenu items={items} label={`${naira(payment.amount)} on ${payment.reference}`} />;
}

/* --------------------------------------------------------------- expenses */

export function ExpenseMenu({ expense }: { expense: Expense }) {
  const items: RowMenuItem[] = [
    {
      kind: "dialog", label: "Remove it", icon: Trash2, tone: "danger",
      title: "Remove this expense",
      render: (close) => (
        <Sure action={removeExpense as never} fields={{ id: expense.id }}
              verb="Remove it" icon={Trash2} tone="danger" close={close}>
          {expense.description} at {naira(expense.amount)} comes out of the
          month&apos;s spend and out of the net figure.
        </Sure>
      ),
    },
  ];

  return <RowMenu items={items} label={expense.description} />;
}

/* ------------------------------------------------------------ submissions */

export function SubmissionMenu({
  submission, clients,
}: {
  submission: Pick<Submission, "id" | "clientId" | "answers" | "service">;
  clients: Pick<Client, "id" | "company">[];
}) {
  const who = String(submission.answers.company ?? submission.answers.first_name ?? "this form");
  const money = can(useAdminRole(), "money");

  const items: RowMenuItem[] = [
    { kind: "link", label: "Read the answers", href: `/admin/forms/${submission.id}`, icon: ArrowRight },
  ];

  /* Narrowed into a local so the closures below can see it. A property access
     on the parameter narrows in this block but not inside the render callback,
     which runs later and could in principle see a different value. */
  const attachedTo = submission.clientId;
  if (attachedTo) {
    items.push({
      kind: "link", label: "Open the client",
      href: `/admin/clients/${attachedTo}`, icon: Users,
    });
    items.push({
      /* THE BRIEF BECOMES THE PROJECT, rather than being read once and retyped.
         The client and the service are already settled by the form, so both
         are fixed here instead of asked again; what is left is the handful of
         things the form does not know -- who owns it, when it is due and what
         was agreed for it. The answers are NOT copied into the scope
         automatically: what a client wrote in an onboarding form is their
         description of what they want, and the scope is what we agreed to do,
         which is a different sentence and sometimes a shorter one. */
      kind: "dialog", label: "Open a project from this", icon: FolderPlus,
      title: `A project for ${who}`,
      render: () => (
        <Form action={createProject}>
          <Fields>
            <Hidden name="clientId" value={attachedTo} />
            <Hidden name="service" value={submission.service} />
            <Field name="title" label="What it is" required
                   placeholder={`${SERVICES.find((x) => x.slug === submission.service)?.short ?? "Project"} for ${who}`} />
            <Select name="stage" label="Starting at" half defaultValue="Discovery"
                    options={STAGES.map((x) => ({ value: x, label: x }))}
                    hint="Discovery rather than Onboarding: the form is already in." />
            <Field name="due" label="Due" type="date" half />
            <OwnerField half />
            {money ? <Field name="budget" label="Agreed budget" half inputMode="decimal"
                   hint="Naira. Empty is not zero." /> : null}
            <Area name="scope" label="What was agreed" rows={2}
                  hint="Their answers are on the form itself; this is what we have committed to." />
          </Fields>
          <Actions>
            <Submit icon={FolderPlus}>Open the project</Submit>
          </Actions>
        </Form>
      ),
    });
  } else {
    items.push({
      kind: "dialog", label: "Attach it to a client", icon: UserPlus,
      title: "Whose form is this?",
      /* attachSubmission redirects to the client, new or existing. */
      render: () => (
        <Form action={attachSubmission}>
          <Fields>
            <Hidden name="id" value={submission.id} />
            <Select
              name="clientId" label="Existing client"
              placeholder="Make a new one from these answers"
              options={clients.map((c) => ({ value: c.id, label: c.company }))}
              hint="Leave this as it is and the answers become a new client record."
            />
          </Fields>
          <Actions>
            <Submit icon={UserPlus}>Attach it</Submit>
          </Actions>
        </Form>
      ),
    });
  }

  return <RowMenu items={items} label={who} />;
}

/* -------------------------------------------------------------- estimates */

/**
 * What can be done to a quote, and it depends entirely on where it is.
 *
 * A DRAFT CAN BE SENT. A sent one can be answered, and answering YES is the
 * only thing on these screens that raises an invoice on its own -- which is
 * why the dialog says so before it does it. An answered or expired one can be
 * quoted again, because a declined quote is the commonest starting point for
 * the next one and re-typing eleven lines is how a price changes by accident.
 *
 * NOTHING DELETES AN ESTIMATE. A quote nobody took is the most useful row in a
 * pipeline six months later, and removing it is how a studio forgets what its
 * prices have been doing.
 */
export function EstimateMenu({ estimate, noEmail }: { estimate: Estimate; noEmail?: string }) {
  const state = estimateState(estimate);
  const total = estimateTotals(estimate).total;

  const items: RowMenuItem[] = [];

  if (estimate.state !== "Draft") {
    items.push({
      kind: "link", label: "Open the client's copy", href: `/q/${estimate.token}`, icon: ArrowRight,
    });
  }

  if (estimate.state === "Draft") {
    items.push({
      kind: "dialog", label: "Send it", icon: Send,
      title: `Send ${estimate.number}`,
      render: (close) => (
        <Form action={sendEstimate} onDone={() => close()}>
          <div className="ad__sure">
            <p>
              Its page goes live at a private address, and the price holds until it
              expires. Nothing is owed by anybody until an invoice follows.
            </p>
          </div>
          <Hidden name="id" value={estimate.id} />
          <NoticeTick name="emailClient" label="Email it to the client" reason={noEmail}
                      hint="The link and the price, in a short email. Untick to send the link yourself." />
          <Actions>
            <button type="button" className="ad__btn" onClick={close}>Leave it</button>
            <Submit icon={Send}>Send it</Submit>
          </Actions>
        </Form>
      ),
    });
  }

  if (state === "Sent") {
    items.push({
      kind: "dialog", label: "Record their answer", icon: MessageSquarePlus,
      title: `What did they say about ${estimate.number}?`,
      render: (close) => (
        <Form action={answerEstimate} onDone={() => close()}>
          <Hidden name="id" value={estimate.id} />
          <Radios
            name="answer" label="Their answer" defaultValue="accepted"
            options={[
              { value: "accepted", label: "They accepted it",
                note: `Raises an invoice for ${naira(total)} straight away. The estimate keeps its own number and its own page.` },
              { value: "declined", label: "They declined it",
                note: "Nothing is raised. It stays on the books, because a quote nobody took is worth knowing about later." },
            ]}
          />
          <Fields>
            <Field name="by" label="Who said so" required placeholder="Tobi Moore"
                   hint="Theirs, not ours. An acceptance with the studio's own name on it is a row nobody can defend." />
            <Field name="dueInDays" label="Invoice due in (days)" half inputMode="numeric"
                   defaultValue="30" hint="Only read on an acceptance." />
            <Area name="note" label="Anything they said" rows={2}
                  placeholder="Happy with the second route. Go ahead." />
          </Fields>
          <NoticeTick name="emailClient" label="Confirm it to the client by email" reason={noEmail}
                      hint="Thanks them and, on a yes, links the new invoice. The studio is told too, unless that is switched off in Settings, Notifications." />
          <Actions>
            <Submit icon={MessageSquarePlus}>Record it</Submit>
          </Actions>
        </Form>
      ),
    });
  }

  items.push({
    kind: "dialog", label: "Quote it again", icon: Copy,
    title: `Copy ${estimate.number}`,
    render: (close) => (
      <Sure action={duplicateEstimate as never} fields={{ id: estimate.id }}
            verb="Copy it" icon={Copy} close={close}>
        The same lines and the same terms, as a fresh draft at today&apos;s date
        with its own number. The original stays exactly as it is.
      </Sure>
    ),
  });

  items.push({
    kind: "link", label: "Open the client", href: `/admin/clients/${estimate.clientId}`, icon: Users,
  });

  return <RowMenu items={items} label={estimate.number} />;
}
