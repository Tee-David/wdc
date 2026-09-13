"use client";

import {
  Archive, ArchiveRestore, ArrowRight, Banknote, CalendarDays, FilePlus2, FolderPlus,
  MessageSquarePlus, Move, Pencil, RotateCcw, Send, Trash2, Undo2, UserPlus, Users,
  type LucideIcon,
} from "lucide-react";
import { SERVICES } from "@/lib/services";
import {
  STAGES, invoiceStatus, invoiceTotals, naira,
  type Client, type Expense, type Invoice, type Payment, type Project, type Submission,
} from "@/lib/admin/types";
import {
  addNote, archiveClient, attachSubmission, createProject, deleteInvoice,
  issueInvoice, moveStage, recordPayment, removeExpense, reversePayment,
  resetSetting, saveSetting, setDue, setProjectArchived, updateClient,
} from "@/lib/admin/actions";
import { Actions, Area, Field, Fields, Form, Hidden, Select, Submit } from "./form";
import { RowMenu, type RowMenuItem } from "./row-menu";
import { ClientFields } from "./client-form";

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
      kind: "dialog",
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
               are, because those are the record — this is why there is no delete.`}
        </Sure>
      ),
    },
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
      kind: "dialog",
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
            : `${client.company} drops out of the lists. Their projects, invoices and payments stay exactly as they are, because those are the financial record — this is why there is no delete.`}
        </Sure>
      ),
    },
  ];

  return <RowMenu items={items} label={client.company} />;
}

/* --------------------------------------------------------------- invoices */

export function InvoiceMenu({ invoice }: { invoice: Invoice }) {
  const status = invoiceStatus(invoice);
  const draft = status === "Draft";
  const owed = invoiceTotals(invoice).due;

  const items: RowMenuItem[] = [
    { kind: "link", label: "Open the invoice", href: `/admin/money/${invoice.id}`, icon: ArrowRight },
  ];

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
  } else if (owed > 0) {
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
            <Select name="method" label="How" half defaultValue="Transfer"
                    options={[
                      { value: "Transfer", label: "Bank transfer" },
                      { value: "Paystack", label: "Paystack" },
                      { value: "Cash", label: "Cash" },
                    ]} />
            <Field name="reference" label="Reference" required placeholder="TRF_0092"
                   hint="The bank reference or the Paystack transaction id. This is what stops the same payment being recorded twice." />
            <Field name="at" label="When" type="date" half
                   defaultValue={new Date().toISOString().slice(0, 10)} />
          </Fields>
          <Actions>
            <Submit icon={Banknote}>Record it</Submit>
          </Actions>
        </Form>
      ),
    });
  }

  items.push({
    kind: "link", label: "Open the client", href: `/admin/clients/${invoice.clientId}`, icon: Users,
  });

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
  payment, invoiceNumber,
}: {
  payment: Payment;
  invoiceNumber?: string;
}) {
  const items: RowMenuItem[] = [
    { kind: "link", label: "Open the invoice", href: `/admin/money/${payment.invoiceId}`, icon: ArrowRight },
    {
      kind: "dialog", label: "Reverse it", icon: Undo2, tone: "danger",
      title: `Reverse ${naira(payment.amount)}`,
      render: (close) => (
        <Sure
          action={reversePayment as never}
          fields={{ id: payment.id, invoiceId: payment.invoiceId }}
          verb="Reverse it" icon={Undo2} tone="danger" close={close}
        >
          {naira(payment.amount)} comes off {invoiceNumber ?? "the invoice"} and
          it re-totals. Use this for a payment entered twice or against the
          wrong invoice, not for a refund — a refund is money going out.
        </Sure>
      ),
    },
  ];

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
            <Field name="owner" label="Who is answerable" half placeholder="Babatope" />
            <Field name="budget" label="Agreed budget" half inputMode="decimal"
                   hint="Naira. Empty is not zero." />
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

/* --------------------------------------------------------------- settings */

/**
 * A content row, and the two things that can be done to it.
 *
 * Only two, because the override is the whole design: a row either carries an
 * edit or it does not, so the verbs are "change it" and "put it back". There
 * is no delete, because there is nothing of ours to delete -- clearing the row
 * restores what shipped in git, which is the only copy that was ever the
 * truth.
 */
export function SettingMenu({
  settingKey, label, shipped, override,
}: {
  settingKey: string;
  label: string;
  /** What git says, shown so an edit is made against something. */
  shipped: string;
  /** What the override says, when there is one. */
  override: string | null;
}) {
  const items: RowMenuItem[] = [
    {
      kind: "dialog", label: override ? "Change the override" : "Edit it", icon: Pencil,
      title: `Edit ${label.toLowerCase()}`,
      render: (close) => (
        <Form action={saveSetting} onDone={() => close()}>
          <Fields>
            <Hidden name="key" value={settingKey} />
            <Field
              name="value" label={label} required defaultValue={override ?? shipped}
              hint={`Shipped as “${shipped}”. Saving writes one row keyed on ${settingKey} and merges it over that.`}
            />
          </Fields>
          <Actions>
            <Submit icon={Pencil}>Save it</Submit>
          </Actions>
        </Form>
      ),
    },
  ];

  if (override) {
    items.push({
      kind: "dialog", label: "Put it back", icon: RotateCcw, tone: "danger",
      title: `Reset ${label.toLowerCase()}`,
      render: (close) => (
        <Sure action={resetSetting as never} fields={{ key: settingKey }}
              verb="Put it back" icon={RotateCcw} tone="danger" close={close}>
          The override is deleted and the site goes back to “{shipped}”, which
          is what shipped in git. Nothing else changes.
        </Sure>
      ),
    });
  }

  return <RowMenu items={items} label={label} />;
}
