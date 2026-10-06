"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import * as db from "./store";
import { invoiceTotals, naira, STAGES, type InvoiceLine } from "./types";
import { selectedPaystackMode } from "@/lib/paystack-mode";
import { actorName, adminRole, owner, allow } from "./guard";
import { can } from "./permissions";
import { queueLogged, retryLogged } from "@/lib/message-log";
import { addEvents } from "@/lib/forms/events";
import { hydrateSettings } from "@/lib/settings/store";
import {
  FAIL, OK, type ActionState,
  approval, channel, checked, deliverableFiles, health, isoDate, kobo, looksEmail, method, num, priority,
  required, services, stage, str, url,
} from "./validate";
import { persistSoon, saveStore, syncStore } from "@/lib/admin/persist";
import { isProjectIcon, randomProjectIcon } from "@/lib/project-icons";
import { mediaByKey } from "@/lib/media";

/**
 * THE ADMIN'S WRITE ENDPOINTS.
 *
 * Every export in a "use server" module is a POST endpoint the browser can
 * reach, whether or not a form points at it. So each one re-reads and
 * re-validates everything, and none of them accepts a figure a page computed:
 * a total arriving in a FormData is a number somebody chose, and the only
 * totals here come from invoiceTotals() over lines the server has just read.
 *
 * They return an ActionState rather than throwing, because useActionState
 * renders the returned value next to the field it belongs to. A throw here
 * becomes an error page, which loses what the person had typed.
 *
 * EVERY ONE OF THEM CHECKS WHO IS ASKING, FIRST. The admin layout redirects
 * anybody who is not the owner, but a layout guards pages and a server action
 * is not a page: it is a POST to an id, and the id is in the HTML of every
 * screen that renders the form. So `owner()` runs before anything is read,
 * and a missing session, a missing role or any other role is refused the
 * same way. It fails closed: an error reading the session is a refusal too.
 */

/* Every write touches the dashboard's figures, so it is always revalidated
   alongside whatever else changed. Cheaper than reasoning, every time, about
   which tile a given write moved. */
function refresh(...paths: string[]) {
  revalidatePath("/admin");
  for (const p of paths) revalidatePath(p);
}

/* --------------------------------------------------------------- clients */

function readClient(fd: FormData) {
  const errors: Record<string, string> = {};
  const company = required(errors, "company", str(fd, "company"), "The company name");
  const name = required(errors, "name", str(fd, "name"), "A contact name");
  const email = str(fd, "email");
  if (!email) errors.email = "An email address is needed.";
  else if (!looksEmail(email)) errors.email = "That does not look like an email address.";

  const picked = services(fd);
  if (!picked.length) errors.services = "Pick at least one service.";

  /* Tags: comma separated, lower case, deduplicated, ten at most. */
  const tags = [...new Set(str(fd, "tags").split(",").map((t) => t.trim().toLowerCase().slice(0, 30)).filter(Boolean))].slice(0, 10);

  /* Other contacts: one per line, "Name, role, email, phone", only the name
     required. A line whose email does not look like one is refused rather
     than stored, because a contact list is where somebody copies from. */
  const contacts: { name: string; role?: string; email?: string; phone?: string }[] = [];
  for (const line of str(fd, "contacts").split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 10)) {
    const [cName, role, cEmail, cPhone] = line.split(",").map((p) => p.trim());
    if (!cName) continue;
    if (cEmail && !looksEmail(cEmail)) { errors.contacts = `"${cEmail}" does not look like an email address.`; break; }
    contacts.push({ name: cName.slice(0, 80), ...(role ? { role: role.slice(0, 60) } : {}), ...(cEmail ? { email: cEmail } : {}), ...(cPhone ? { phone: cPhone.slice(0, 40) } : {}) });
  }

  return {
    errors,
    draft: {
      company, name, email,
      phone: str(fd, "phone"),
      services: picked,
      sector: str(fd, "sector"),
      notes: str(fd, "notes") || undefined,
      tags,
      contacts,
    },
  };
}

export async function createClient(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await allow("clients");
  if (refused) return refused;
  const { errors, draft } = readClient(fd);
  if (Object.keys(errors).length) return FAIL(errors);

  /* CAUGHT HERE, ONE LEVEL ABOVE THE STORE, because this is a business rule
     with a message a person reads, not a storage constraint. Archived
     clients are checked too: the commonest duplicate is somebody re-adding a
     client who dropped off the active list instead of restoring them. */
  const dupe = db.findDuplicateClient(draft.email, draft.phone);
  if (dupe) {
    return FAIL(
      { email: `${dupe.company} is already a client${dupe.archived ? ", archived" : ""} with this email or phone.` },
      dupe.archived
        ? `${dupe.company} matches this email or phone and is archived. Restore them from the client list instead of adding a second record.`
        : `${dupe.company} already matches this email or phone.`,
    );
  }

  const c = db.addClient(draft);
  refresh("/admin/clients");
  /* REDIRECTED FROM THE SERVER, not pushed from the browser afterwards.
     Post-then-redirect is the shape a form submission is supposed to have: it
     survives a reload without re-posting, it works with no JavaScript at all,
     and landing on the thing you just made is a better confirmation than a
     sentence saying it worked. */
  redirect(`/admin/clients/${c.id}`);
}

export async function updateClient(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await allow("clients");
  if (refused) return refused;
  const id = str(fd, "id");
  const { errors, draft } = readClient(fd);
  if (Object.keys(errors).length) return FAIL(errors);

  const dupe = db.findDuplicateClient(draft.email, draft.phone, id);
  if (dupe) {
    return FAIL(
      { email: `${dupe.company} already has this email or phone.` },
      `${dupe.company} already matches this email or phone -- that would make two client records for one contact.`,
    );
  }

  const before = db.getClient(id)?.email ?? "";
  if (!db.patchClient(id, draft, await actorName())) return FAIL({}, "That client is no longer there.");

  /* A NEW ADDRESS WITHDRAWS THE OLD INVITATION. It would make an account for
     the old address, which the portal no longer matches to this client. The
     owner sends a fresh one to the new address from the same page. */
  let withdrawn = 0;
  if (draft.email && before.trim().toLowerCase() !== draft.email.trim().toLowerCase()
      && (process.env.DATABASE_URL || process.env.COCKROACHDB_URL)) {
    try {
      const { revokeStaleInvitations } = await import("@/lib/invitations");
      withdrawn = await revokeStaleInvitations(id, draft.email, await actorName());
    } catch (error) {
      console.error("[clients] could not withdraw old invitations:", error instanceof Error ? error.message : error);
    }
  }

  refresh("/admin/clients", `/admin/clients/${id}`);
  return OK(withdrawn
    ? `Saved. The invitation to the old address is withdrawn; send a new one to ${draft.email}.`
    : "Saved.");
}

export async function archiveClient(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await owner();
  if (refused) return refused;
  const id = str(fd, "id");
  const back = str(fd, "restore") === "1";
  const c = db.archiveClient(id, !back);
  if (!c) return FAIL({}, "That client is no longer there.");

  refresh("/admin/clients", `/admin/clients/${id}`);
  return OK(back ? `${c.company} is back on the books.` : `${c.company} is archived. Their invoices and projects are untouched.`);
}

/* -------------------------------------------------------------- projects */

export async function createProject(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await allow("projects");
  if (refused) return refused;
  const errors: Record<string, string> = {};
  const title = required(errors, "title", str(fd, "title"), "A project name");
  const clientId = str(fd, "clientId");
  if (!clientId) errors.clientId = "Say who it is for.";
  else if (!db.getClient(clientId)) errors.clientId = "That client is no longer there.";

  const [service] = services(fd, "service");
  if (!service) errors.service = "Pick the service.";
  const at = stage(fd) ?? "Onboarding";

  if (Object.keys(errors).length) return FAIL(errors);

  const p = db.addProject({
    clientId, title, service: service!, stage: at, due: isoDate(fd, "due"),
    /* All four are optional on the form, so each falls back rather than
       failing. `channel(...) ?? undefined` hands the decision to addProject,
       which documents why the default is the dashboard; repeating the default
       here would be two places to change it. */
    owner: str(fd, "owner"),
    channel: channel(fd, "channel") ?? undefined,
    /* Staff cannot set a figure: the budget is money (lib/admin/permissions.ts). */
    budget: can(await adminRole(), "money") ? kobo(fd, "budget") : null,
    scope: str(fd, "scope") || undefined,
    icon: isProjectIcon(str(fd, "icon")) ? str(fd, "icon") : randomProjectIcon(),
  });
  refresh("/admin/projects", `/admin/clients/${clientId}`);
  redirect(`/admin/projects/${p.id}`);
}

/**
 * Move a project along.
 *
 * The email to the client that you asked for on every stage change belongs
 * here, at the single point the stage actually changes, rather than in the
 * screen that happens to offer the control. Once sendMail() exists it is one
 * call on the line below, and the board, the detail page and any future
 * keyboard shortcut all get it without each remembering to.
 */
export async function moveStage(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await allow("projects");
  if (refused) return refused;
  const id = str(fd, "id");
  const to = stage(fd);
  if (!to) return FAIL({ stage: "Pick a stage." });

  const was = db.getProject(id)?.stage;
  const note = str(fd, "note") || undefined;
  const p = db.setStage(id, to, note);
  if (!p) return FAIL({}, "That project is no longer there.");

  /* The client hears about it behind the response, if they want updates. */
  if (was && was !== p.stage) {
    const by = await actorName();
    const moved = p;
    after(async () => {
      const { sendStageEmail } = await import("@/lib/project-mail");
      await sendStageEmail({ project: moved, from: was, to: moved.stage, note, by });
    });
  }

  refresh("/admin/projects", `/admin/projects/${id}`, `/admin/clients/${p.clientId}`);
  return OK(`Now at ${p.stage}.`);
}

/**
 * A card dropped on the board: its stage (the same event, history and client
 * email as `moveStage`) and the order of the column it landed in.
 */
export async function moveOnBoard(input: { id: string; stage: string; order: string[] }): Promise<ActionState> {
  await syncStore();
  const refused = await allow("projects");
  if (refused) return refused;
  const to = STAGES.find((s) => s === input?.stage);
  const p = db.getProject(String(input?.id ?? ""));
  if (!to || !p) return FAIL({}, "That card could not be moved. Reload and try again.");
  const order = Array.isArray(input.order) ? input.order.map(String).slice(0, 500) : [];
  const was = p.stage;
  if (was !== to) {
    const by = await actorName();
    db.setStage(p.id, to, undefined, by);
    after(async () => {
      const { sendStageEmail } = await import("@/lib/project-mail");
      await sendStageEmail({ project: p, from: was, to, by });
    });
  }
  db.rankColumn(to, order);
  await saveStore();
  refresh("/admin/projects", `/admin/projects/${p.id}`, `/admin/clients/${p.clientId}`);
  return OK(was !== to ? `Moved to ${to}.` : "Order saved.");
}

export async function addNote(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await allow("projects");
  if (refused) return refused;
  const id = str(fd, "id");
  const text = str(fd, "note");
  if (!text) return FAIL({ note: "Write the note first." });

  const p = db.addProjectNote(id, text);
  if (!p) return FAIL({}, "That project is no longer there.");

  refresh(`/admin/projects/${id}`);
  return OK("Noted.");
}

export async function setDue(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await allow("projects");
  if (refused) return refused;
  const id = str(fd, "id");
  const p = db.setProjectDue(id, isoDate(fd, "due"));
  if (!p) return FAIL({}, "That project is no longer there.");

  refresh("/admin/projects", `/admin/projects/${id}`);
  return OK(p.due ? "Due date set." : "Due date cleared.");
}

/* -------------------------------------------------------------- invoices */

/**
 * Lines come back as three parallel arrays, one per column.
 *
 * That is what a set of inputs sharing a name produces, and FormData preserves
 * their order, so index i of each is one row. A line with no description and
 * no money is a row the person added and did not use, and is dropped rather
 * than rejected.
 */
function readLines(fd: FormData): { lines: InvoiceLine[]; bad: string | null } {
  const descriptions = fd.getAll("ln_desc").map((v) => String(v).trim());
  const qtys = fd.getAll("ln_qty").map((v) => String(v).trim());
  const units = fd.getAll("ln_unit").map((v) => String(v).replace(/[₦,\s]/g, ""));

  const lines: InvoiceLine[] = [];
  for (let i = 0; i < descriptions.length; i++) {
    const description = descriptions[i];
    const qty = Number(qtys[i] || "1");
    const unitNaira = Number(units[i] || "0");
    if (!description && !unitNaira) continue;
    if (!description) return { lines, bad: "Every line needs a description." };
    if (!Number.isFinite(qty) || qty <= 0) return { lines, bad: "A quantity has to be a positive number." };
    if (!Number.isFinite(unitNaira) || unitNaira < 0) return { lines, bad: "An amount has to be a number." };
    lines.push({ description, qty, unit: Math.round(unitNaira * 100) });
  }
  return { lines, bad: lines.length ? null : "Add at least one line." };
}

export async function createInvoice(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await owner();
  if (refused) return refused;
  const errors: Record<string, string> = {};
  const clientId = str(fd, "clientId");
  if (!db.getClient(clientId)) errors.clientId = "Say who it is for.";

  const { lines, bad } = readLines(fd);
  if (bad) errors.lines = bad;

  const issued = isoDate(fd, "issued") ?? new Date().toISOString();
  const due = isoDate(fd, "due");
  if (!due) errors.due = "Set a due date.";
  else if (due < issued) errors.due = "The due date is before the issue date.";

  const vatRate = num(fd, "vatRate") ?? 7.5;
  if (vatRate < 0 || vatRate > 100) errors.vatRate = "VAT has to be between 0 and 100.";

  if (Object.keys(errors).length) return FAIL(errors);

  const projectId = str(fd, "projectId") || null;
  const inv = db.addInvoice({
    clientId, projectId, issued, due: due!, vatRate, lines,
    status: str(fd, "issue") === "1" ? "Sent" : "Draft",
  });

  refresh("/admin/money", `/admin/clients/${clientId}`);
  redirect(`/admin/money/${inv.id}`);
}

export async function updateInvoice(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await owner();
  if (refused) return refused;
  const id = str(fd, "id");
  const inv = db.getInvoice(id);
  if (!inv) return FAIL({}, "That invoice is no longer there.");
  /* Issued invoices are not editable. See sendInvoice() for why. */
  if (inv.status !== "Draft") return FAIL({}, "This one has been issued, so its lines are fixed. Credit it and raise a new one.");

  const errors: Record<string, string> = {};
  const { lines, bad } = readLines(fd);
  if (bad) errors.lines = bad;
  const due = isoDate(fd, "due");
  if (!due) errors.due = "Set a due date.";
  const vatRate = num(fd, "vatRate") ?? inv.vatRate;
  if (vatRate < 0 || vatRate > 100) errors.vatRate = "VAT has to be between 0 and 100.";
  if (Object.keys(errors).length) return FAIL(errors);

  db.patchInvoice(id, { lines, due: due!, vatRate, projectId: str(fd, "projectId") || null });
  refresh("/admin/money", `/admin/money/${id}`);
  return OK("Saved.");
}

export async function issueInvoice(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await owner();
  if (refused) return refused;
  const id = str(fd, "id");
  const inv = db.sendInvoice(id);
  if (!inv) return FAIL({}, "That invoice is no longer there.");
  if (inv.status === "Draft") return FAIL({}, "It could not be issued.");

  refresh("/admin/money", `/admin/money/${id}`, `/admin/clients/${inv.clientId}`);
  return OK(`${inv.number} is issued. Emailing it to the client arrives with SMTP.`);
}

export async function deleteInvoice(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await owner();
  if (refused) return refused;
  const id = str(fd, "id");
  if (!db.deleteDraftInvoice(id)) {
    return FAIL({}, "Only a draft can be deleted. An issued invoice is part of the record.");
  }
  refresh("/admin/money");
  redirect("/admin/money");
}

/* -------------------------------------------------------------- payments */

/**
 * Record money that has arrived.
 *
 * The typing here is the manual route into db.applyPayment, which is the same
 * door the Paystack webhook will come through. Everything that makes a payment
 * safe to record twice lives there, not here, so the webhook cannot
 * accidentally get a laxer version of the rules than the form does.
 */
export async function recordPayment(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await owner();
  if (refused) return refused;
  const invoiceId = str(fd, "invoiceId");
  const amount = kobo(fd, "amount");
  const reference = str(fd, "reference");
  /* The list used to be re-typed here, so adding POS and Other to the union in
     types.ts would silently have kept rejecting them and filed both as
     "Transfer". One reader, one list. */
  const how = method(fd, "method");

  const errors: Record<string, string> = {};
  if (!amount) errors.amount = "How much came in?";
  if (!reference) errors.reference = "A reference is what stops this being recorded twice.";
  if (!how) errors.method = "Say how the money arrived.";
  /* "Other" is allowed and is exactly why it has to say what it actually was.
     Recording money against an unnamed catch-all is how a set of books stops
     being auditable. */
  const note = str(fd, "note");
  if (how === "Other" && !note) {
    errors.note = "Say how it actually arrived. \u201cOther\u201d with nothing beside it cannot be reconciled later.";
  }
  if (Object.keys(errors).length) return FAIL(errors);

  /* CREDIT IS NOT SOMETHING A PERSON TYPES IN. Money moving off a client's
     balance onto an invoice comes from `applyCredit`, which knows which credit
     it spent and marks it so. A hand-entered "Credit" payment would create
     money that no balance ever gave up. The form does not offer it; this
     refuses it, because every export in this module is a public endpoint. */
  if (how === "Credit") {
    return FAIL({ method: "Apply credit from the client's balance instead. It cannot be entered as a payment." });
  }

  const res = db.applyPayment({
    invoiceId, amount: amount!, method: how!, reference,
    at: isoDate(fd, "at") ?? undefined,
    /* WHO TOOK THE MONEY. A manual "mark paid" with no name against it is the
       entry nobody can question three months later, which is the entry most
       worth questioning. Free text for now; it becomes the signed-in admin the
       moment there is one. */
    by: str(fd, "by"),
    note,
    /* Only a Paystack row is test-or-live at all -- cash in an envelope has no
       mode. See the note on `Payment.mode`. */
    mode: how === "Paystack" ? await selectedPaystackMode() : undefined,
  });

  if (!res.ok) {
    const said: Record<typeof res.reason, string> = {
      "no-invoice": "That invoice is no longer there.",
      duplicate: "That reference is already recorded, so nothing was added. This is the guard working.",
      "not-positive": "The amount has to be more than nothing.",
      "test-mode": "Test or unknown-mode Paystack payments cannot settle a real invoice. Verify a live transaction before recording payment.",
      draft: "This invoice is still a draft. Issue it first.",
      void: "This invoice has been voided, so nothing is owed on it. If the money is real, record it against the invoice it was meant for.",
    };
    const message = said[res.reason];
    return FAIL({ reference: res.reason === "duplicate" ? message : "" }, message);
  }

  refresh("/admin/money", `/admin/money/${invoiceId}`, `/admin/clients/${res.invoice.clientId}`);

  const t = invoiceTotals(res.invoice);
  if (res.overpaid) {
    return OK(`Recorded. This invoice is now paid ${naira(res.invoice.paid - t.total)} over its total, so check before refunding.`);
  }
  return OK(t.due ? `Recorded. ${naira(t.due)} still owing.` : "Recorded. This invoice is settled.");
}

export async function reversePayment(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await owner();
  if (refused) return refused;
  const id = str(fd, "id");
  const invoiceId = str(fd, "invoiceId");
  /* A REASON IS REQUIRED, and this is the one place in the admin where a free
     text field is not optional. Money coming back off the books is the entry
     somebody will question, and "reversed" with nothing beside it cannot be
     answered six months later by the person who did it, let alone by anybody
     else. */
  const reason = str(fd, "reason");
  if (!reason) {
    return FAIL({ reason: "Say why. A reversal with no reason cannot be explained later." });
  }
  if (!db.reversePayment(id, reason, str(fd, "by") || await actorName())) {
    return FAIL({}, "That payment is already reversed, or is no longer there.");
  }

  refresh("/admin/money", `/admin/money/${invoiceId}`);
  return OK("Reversed. The row stays on the books marked reversed, and its receipt now says so.");
}

/* -------------------------------------------------------------- expenses */

export async function createExpense(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await owner();
  if (refused) return refused;
  const errors: Record<string, string> = {};
  const description = required(errors, "description", str(fd, "description"), "What it was for");
  const amount = kobo(fd, "amount");
  if (!amount) errors.amount = "How much was it?";

  /* A RECEIPT LINK THAT IS NOT A LINK IS A FIELD THAT SILENTLY LOSES WHAT WAS
     TYPED. `url()` returns null for anything that is not http or https, and
     the difference between "nothing was typed" and "something unusable was
     typed" matters here -- the second one deserves a message. */
  const receiptRaw = str(fd, "receiptUrl");
  const receiptUrl = url(fd, "receiptUrl");
  if (receiptRaw && !receiptUrl) {
    errors.receiptUrl = "That is not a link. Paste the full address, starting with https://";
  }

  const projectId = str(fd, "projectId");
  if (projectId && !db.getProject(projectId)) errors.projectId = "That project is no longer there.";

  if (Object.keys(errors).length) return FAIL(errors);

  db.addExpense({
    description, amount: amount!,
    category: str(fd, "category") || "Other",
    at: isoDate(fd, "at") ?? new Date().toISOString(),
    vendor: str(fd, "vendor") || undefined,
    method: method(fd, "method") ?? undefined,
    projectId: projectId || undefined,
    rebillable: checked(fd, "rebillable"),
    receiptUrl: receiptUrl ?? undefined,
    note: str(fd, "note") || undefined,
    by: str(fd, "by") || undefined,
  });

  refresh("/admin/money", projectId ? `/admin/projects/${projectId}` : "/admin/money");
  return OK("Added.");
}

export async function removeExpense(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await owner();
  if (refused) return refused;
  if (!db.deleteExpense(str(fd, "id"))) return FAIL({}, "That one is already gone.");
  refresh("/admin/money");
  return OK("Removed.");
}

/* ------------------------------------------------------------ onboarding */

/**
 * A client from a brief sent through the live form.
 *
 * IDEMPOTENT BY CONTACT, not by a stored link: if a client with the same
 * email or phone already exists, the brief is theirs and nothing is created.
 * A second press, or a second brief from the same person, lands on the same
 * client.
 */
export async function clientFromLiveSubmission(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await allow("forms");
  if (refused) return refused;
  const { liveSubmission, answer } = await import("@/lib/onboarding-admin");
  let sub;
  try { sub = await liveSubmission(str(fd, "id")); } catch { return FAIL({}, "The form could not be read just now. Try again in a minute."); }
  if (!sub) return FAIL({}, "That form is no longer there.");

  const email = answer(sub, "email");
  const phone = answer(sub, "phone");
  const existing = db.findDuplicateClient(email, phone);
  const formKey = `onboarding-${sub.service}`;
  const entryPath = `/admin/forms/${formKey}/entries/${sub.id}`;
  if (existing) {
    await addEvents(formKey, [sub.id], "client", `Matched to the existing client ${existing.company}`, await actorName());
    refresh("/admin/forms", entryPath);
    redirect(`/admin/clients/${existing.id}`);
  }
  const name = [answer(sub, "first_name"), answer(sub, "last_name")].filter(Boolean).join(" ");
  const company = answer(sub, "company");
  const c = db.addClient({
    name: name || company || "Unnamed",
    company: company || name || "Unnamed",
    email, phone,
    services: [sub.service],
    sector: answer(sub, "industry"),
    notes: `Created from the ${sub.service} onboarding form sent ${sub.submittedAt ? sub.submittedAt.slice(0, 10) : "(not sent yet)"}.`,
  });
  await addEvents(formKey, [sub.id], "client", `Made a client: ${c.company}`, await actorName());
  refresh("/admin/forms", entryPath, "/admin/clients");
  redirect(`/admin/clients/${c.id}`);
}

/**
 * Assign a form entry to a client (an existing one, or a new one made from the
 * entry) and, if wanted, to a project (an existing one of that client, or a new
 * one). Any form with entries can be assigned, not only the onboarding briefs.
 * The assignment is stored (lib/forms/links.ts) and written to the entry's
 * timeline; assigning again replaces it.
 */
export async function assignEntry(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await allow("forms");
  if (refused) return refused;
  const { findForm } = await import("@/lib/forms/find");
  const { getEntry } = await import("@/lib/forms/entries");
  const { setLink } = await import("@/lib/forms/links");
  const form = await findForm(str(fd, "form"));
  const entry = form ? await getEntry(form, str(fd, "id")) : null;
  if (!form || !entry || entry.draft) return FAIL({}, "That entry is no longer there.");

  const errors: Record<string, string> = {};
  const clientMode = str(fd, "clientMode") === "existing" ? "existing" : "new";
  const projectMode = ["existing", "new"].includes(str(fd, "projectMode")) ? str(fd, "projectMode") : "none";
  if (projectMode !== "none") {
    const noProjects = await allow("projects");
    if (noProjects) return noProjects;
  }

  let client = clientMode === "existing" ? db.getClient(str(fd, "clientId")) : null;
  if (clientMode === "existing" && !client) errors.clientId = "Pick the client.";
  const text = (v: unknown) => (Array.isArray(v) ? v.join(", ") : String(v ?? "")).trim();
  const company = text(entry.answers.company);
  if (clientMode === "new" && !(entry.name || company || entry.email)) errors.clientMode = "This entry has no name or email to make a client from. Pick an existing client.";

  const existingProject = projectMode === "existing" ? db.getProject(str(fd, "projectId")) : null;
  if (projectMode === "existing" && !existingProject) errors.projectId = "Pick the project.";
  const [chosenService] = services(fd, "service");
  const service = form.service ?? chosenService;
  if (projectMode === "new" && !service) errors.service = "Pick the service this project is for.";
  if (Object.keys(errors).length) return FAIL(errors);

  let note = "";
  if (!client) {
    const match = entry.email || entry.phone ? db.findDuplicateClient(entry.email, entry.phone) : null;
    if (match) { client = match; note = " (it matched a client already on the books)"; }
    else {
      client = db.addClient({
        name: entry.name || company || entry.email,
        company: company || entry.name || entry.email,
        email: entry.email, phone: entry.phone,
        services: service ? [service] : [],
        sector: text(entry.answers.industry),
        notes: `Created from ${form.noun} ${entry.serial ? `#${entry.serial} ` : ""}on the ${form.title} form.`,
      }, await actorName());
    }
  }
  if (existingProject && existingProject.clientId !== client.id) return FAIL({ projectId: `That project belongs to ${db.getClient(existingProject.clientId)?.company ?? "another client"}, not ${client.company}.` });

  let project = existingProject;
  if (projectMode === "new") {
    project = db.addProject({
      clientId: client.id, title: str(fd, "projectTitle") || `${client.company} ${service}`, service: service!,
      stage: "Onboarding", due: null,
      icon: randomProjectIcon(),
    });
  }

  try { await setLink(form.key, entry.id, client.id, project?.id ?? null, await actorName()); }
  catch { return FAIL({}, "The assignment could not be saved just now. Nothing was changed on the entry. Try again in a minute."); }
  await addEvents(form.key, [entry.id], "client", `Assigned to ${client.company}${project ? ` and the project ${project.title}` : ""}${note}`, await actorName());
  refresh("/admin/forms", `/admin/forms/${form.key}`, `/admin/forms/${form.key}/entries/${entry.id}`, `/admin/clients/${client.id}`, "/admin/clients", "/admin/projects");
  return OK(`Assigned to ${client.company}${project ? `, project ${project.title}` : ""}.`);
}

/** Fold a duplicate into the client whose page this is. */
export async function mergeClient(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await owner();
  if (refused) return refused;
  const keepId = str(fd, "keepId");
  const dupeId = str(fd, "dupeId");
  if (!dupeId) return FAIL({ dupeId: "Pick the duplicate to fold in." });
  const res = db.mergeClients(keepId, dupeId, await actorName());
  if (!res.ok) {
    return FAIL({}, {
      same: "That is this client.",
      missing: "One of those clients is no longer there.",
      merged: "One of those records has already been merged.",
    }[res.reason]);
  }
  refresh("/admin/clients", `/admin/clients/${keepId}`, `/admin/clients/${dupeId}`, "/admin/money", "/admin/projects");
  return OK(`Merged. ${res.moved} record${res.moved === 1 ? "" : "s"} moved to ${res.kept.company}; the duplicate is archived and says where it went.`);
}

export async function attachSubmission(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await allow("forms");
  if (refused) return refused;
  const id = str(fd, "id");
  const clientId = str(fd, "clientId");

  /* No client chosen means "make one from what they typed", which is the
     common case: a form arrives from somebody not yet on the books. */
  if (!clientId) {
    const c = db.clientFromSubmission(id);
    if (!c) return FAIL({}, "This form is already attached to a client.");
    refresh("/admin/forms", `/admin/forms/${id}`, "/admin/clients");
    redirect(`/admin/clients/${c.id}`);
  }

  const s = db.linkSubmission(id, clientId);
  if (!s) return FAIL({}, "That form is no longer there.");
  refresh("/admin/forms", `/admin/forms/${id}`, `/admin/clients/${clientId}`);
  redirect(`/admin/clients/${clientId}`);
}

/* ---------------------------------------------------------------- settings */

/* ------------------------------------------------------- delivery: tasks */

/**
 * Everything below refreshes the project it belongs to AND the projects list,
 * because both draw from the same attention derivation: a task going overdue
 * changes a pill on the list as surely as it changes the workspace.
 */
function refreshProject(id: string) {
  refresh("/admin/projects", `/admin/projects/${id}`);
}

export async function createTask(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await allow("projects");
  if (refused) return refused;
  const errors: Record<string, string> = {};
  const projectId = str(fd, "projectId");
  const title = required(errors, "title", str(fd, "title"), "A task name");
  const p = projectId ? db.getProject(projectId) : null;
  if (!p) errors.projectId = "Pick a project.";

  const pri = priority(fd, "priority");
  if (!pri) errors.priority = "Pick a priority.";

  if (Object.keys(errors).length) return FAIL(errors);

  const t = db.addTask({
    projectId, title, assignee: str(fd, "assignee"),
    due: isoDate(fd, "due"), priority: pri!,
    /* An empty select posts "", which is not a dependency. */
    blockedBy: str(fd, "blockedBy") || null,
  });
  if (!t) return FAIL({}, "That project is no longer there.");
  refreshProject(projectId);
  return OK(`Added "${t.title}".`);
}

export async function toggleTask(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await allow("projects");
  if (refused) return refused;
  const id = str(fd, "id");
  /* The CURRENT state is read from the store rather than taken from the form.
     A hidden field saying "this is currently open" is a field the browser can
     change, and two people ticking the same task a second apart would
     otherwise fight each other. */
  const before = db.getTasks().find((t) => t.id === id);
  if (!before) return FAIL({}, "That task is no longer there.");
  const t = db.setTaskDone(id, !before.done);
  if (!t) return FAIL({}, "That task is no longer there.");
  refreshProject(t.projectId);
  return OK(t.done ? `Ticked off "${t.title}".` : `"${t.title}" is open again.`);
}

export async function removeTask(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await allow("projects");
  if (refused) return refused;
  const id = str(fd, "id");
  const t = db.getTasks().find((x) => x.id === id);
  if (!t) return FAIL({}, "That task is no longer there.");
  db.deleteTask(id);
  refreshProject(t.projectId);
  return OK(`Removed "${t.title}".`);
}

/* ----------------------------------------------------- delivery: updates */

export async function postUpdate(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await allow("projects");
  if (refused) return refused;
  const errors: Record<string, string> = {};
  const projectId = str(fd, "projectId");
  const progress = required(errors, "progress", str(fd, "progress"), "What moved");
  const h = health(fd, "health");
  if (!h) errors.health = "Say how it is going.";
  if (Object.keys(errors).length) return FAIL(errors);

  const u = db.addUpdate({
    projectId, author: str(fd, "author") || "Studio", health: h!,
    progress, blockers: str(fd, "blockers"), next: str(fd, "next"),
    clientVisible: checked(fd, "clientVisible"),
  });
  if (!u) return FAIL({}, "That project is no longer there.");
  refreshProject(projectId);
  return OK(u.clientVisible
    ? "Posted. The client will see this one."
    : "Saved as an internal note. The client will not see it.");
}

/* ------------------------------------------------ delivery: deliverables */

export async function createDeliverable(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await allow("projects");
  if (refused) return refused;
  const errors: Record<string, string> = {};
  const projectId = str(fd, "projectId");
  const name = required(errors, "name", str(fd, "name"), "A name");
  const note = required(errors, "note", str(fd, "note"), "A note saying what this version is");
  const files = deliverableFiles(fd, errors);
  const rawUrl = str(fd, "url");
  const link = url(fd, "url");
  if (rawUrl && !link) errors.url = "That is not a link. Paste the full address, starting with https://";
  if (files.length && !errors.files) {
    try {
      for (const file of files) {
        const asset = await mediaByKey(file.key);
        if (!asset || asset.archivedAt) { errors.files = "One uploaded file is no longer in the media library. Remove it and add it again."; break; }
      }
    } catch { errors.files = "The media library could not be checked. Try again."; }
  }
  if (Object.keys(errors).length) return FAIL(errors);

  const d = db.addDeliverable({ projectId, name, note, url: link ?? undefined, files: files.length ? files : undefined });
  if (!d) return FAIL({}, "That project is no longer there.");
  refreshProject(projectId);
  return OK(`${d.name} v1 is on the project.`);
}

export async function addDeliverableVersion(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await allow("projects");
  if (refused) return refused;
  const errors: Record<string, string> = {};
  const note = required(errors, "note", str(fd, "note"), "A note saying what changed");
  const files = deliverableFiles(fd, errors);
  const rawUrl = str(fd, "url");
  const link = url(fd, "url");
  if (rawUrl && !link) errors.url = "That is not a link. Paste the full address, starting with https://";
  if (files.length && !errors.files) {
    try {
      for (const file of files) {
        const asset = await mediaByKey(file.key);
        if (!asset || asset.archivedAt) { errors.files = "One uploaded file is no longer in the media library. Remove it and add it again."; break; }
      }
    } catch { errors.files = "The media library could not be checked. Try again."; }
  }
  if (Object.keys(errors).length) return FAIL(errors);

  const d = db.addVersion(str(fd, "id"), note, link ?? undefined, files.length ? files : undefined);
  if (!d) return FAIL({}, "That deliverable is no longer there.");
  refreshProject(d.projectId);
  const v = d.versions[d.versions.length - 1].v;
  return OK(`${d.name} v${v} added. It needs sending again before it can be approved.`);
}

export async function moveApproval(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await allow("projects");
  if (refused) return refused;
  const a = approval(fd, "approval");
  if (!a) return FAIL({ approval: "Pick what happened." });
  const note = str(fd, "note");
  if (a === "Revision requested" && !note) {
    return FAIL({ note: "Say what they asked for. A revision with no reason is not actionable." });
  }
  const d = db.setApproval(str(fd, "id"), a, note);
  if (!d) return FAIL({}, "That deliverable is no longer there.");
  /* Sending it for approval is the moment the client needs telling. */
  const project = db.getProject(d.projectId);
  if (a === "Awaiting client" && project) {
    const by = await actorName();
    after(async () => {
      const { sendApprovalRequest } = await import("@/lib/project-mail");
      await sendApprovalRequest({ project, deliverable: d, by });
    });
  }
  refreshProject(d.projectId);
  return OK(`${d.name} is now "${a.toLowerCase()}".`);
}

/* ------------------------------------------------- delivery: the project */

export async function saveProjectDetails(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await allow("projects");
  if (refused) return refused;
  const id = str(fd, "id");
  const h = health(fd, "health");
  const ch = channel(fd, "channel");
  const errors: Record<string, string> = {};
  if (!h) errors.health = "Pick how it is going.";
  if (!ch) errors.channel = "Pick where updates go.";
  if (Object.keys(errors).length) return FAIL(errors);

  const p = db.patchProject(id, {
    owner: str(fd, "owner"), health: h!, channel: ch!,
    /* kobo() returns null for an empty box, which is the honest answer when no
       figure has been agreed -- not zero, which would read as "free". */
    /* A staff save leaves the agreed figure exactly as it was. */
    ...(can(await adminRole(), "money") ? { budget: kobo(fd, "budget") } : {}),
    scope: str(fd, "scope"),
    ...(isProjectIcon(str(fd, "icon")) ? { icon: str(fd, "icon") } : {}),
  });
  if (!p) return FAIL({}, "That project is no longer there.");
  refreshProject(id);
  return OK("Saved.");
}

export async function setProjectArchived(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await owner();
  if (refused) return refused;
  const id = str(fd, "id");
  const back = str(fd, "archived") === "false";
  const p = db.archiveProject(id, !back);
  if (!p) return FAIL({}, "That project is no longer there.");
  refreshProject(id);
  return OK(back
    ? `${p.title} is back in the list.`
    : `${p.title} is archived. Its invoices, updates and approvals are untouched.`);
}

/* ------------------------------------------------------- reconciliation */

/**
 * Write down what was done about a provider event that did not land cleanly.
 *
 * A NOTE IS REQUIRED, for the same reason a reversal's reason is. "Resolved"
 * on its own is a tick somebody put there; what the next person needs is
 * "matched by hand to INV-2026-003, client had typed the wrong reference".
 *
 * IT CANNOT BE EDITED AFTERWARDS. `resolveProviderEvent` refuses an event that
 * already carries a resolution, so a stale page re-submitted cannot overwrite
 * the first person's account of what happened.
 */
export async function resolveEvent(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await owner();
  if (refused) return refused;
  const id = str(fd, "id");
  const note = str(fd, "note");
  if (!note) return FAIL({ note: "Say what was done. A tick with nothing beside it explains nothing later." });
  if (!db.resolveProviderEvent(id, note, str(fd, "by") || await actorName())) {
    return FAIL({}, "That one has already been dealt with, or is no longer there.");
  }
  refresh("/admin/money", "/admin/money/reconciliation");
  return OK("Written down.");
}

/**
 * Attach an unmatched payment to an invoice by hand.
 *
 * THE MONEY IS ALREADY REAL. Paystack has taken it; the only question is which
 * invoice it belongs against, and that is a judgement a person makes. This
 * banks it through the same `applyPayment` everything else uses -- same
 * idempotency on the reference, same receipt number, same audit line -- and
 * then closes the event with a note naming who decided.
 */
export async function matchEventToInvoice(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await owner();
  if (refused) return refused;
  const id = str(fd, "id");
  const invoiceId = str(fd, "invoiceId");
  const by = str(fd, "by") || await actorName();

  const event = db.getProviderEvent(id);
  if (!event) return FAIL({}, "That event is no longer there.");
  if (event.resolution) return FAIL({}, "That one has already been dealt with.");
  if (!invoiceId) return FAIL({ invoiceId: "Pick the invoice it belongs against." });
  if (event.amount === null || event.amount <= 0) {
    return FAIL({}, "That event carries no amount, so there is nothing to bank. Resolve it with a note instead.");
  }

  const applied = db.applyPayment({
    invoiceId, amount: event.amount, method: "Paystack",
    reference: event.reference, by: `${by} (matched by hand)`,
    note: "Matched to this invoice by hand from the reconciliation screen.",
    /* The event's own mode, when it has one, rather than whatever
       `PAYSTACK_MODE` happens to be right now -- a test event matched days
       later on a since-switched-to-live deployment stays test money. Older
       events without authenticated mode evidence cannot be banked by this
       action: guessing the current mode could turn test money into live. */
    mode: event.mode,
  });
  if (!applied.ok) {
    if (applied.reason === "test-mode") return FAIL({}, "This event has no verified live-payment evidence. Test payments cannot settle invoices; verify the original transaction before assigning it.");
    return FAIL({}, applied.reason === "duplicate"
      ? "That reference is already banked against an invoice. Resolve this one with a note instead."
      : `It would not apply: ${applied.reason}.`);
  }

  db.resolveProviderEvent(
    id,
    `Matched by hand to ${applied.invoice.number}. Receipt ${applied.payment.receiptNo}.`,
    by,
  );
  refresh("/admin/money", "/admin/money/reconciliation", `/admin/money/${invoiceId}`);
  return OK(`Banked against ${applied.invoice.number} as ${applied.payment.receiptNo}.`);
}

/* ---------------------------------------------------------------- mail */

/** Send the invoice, with the link that pays it. */
export async function emailInvoice(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await owner();
  if (refused) return refused;
  const id = str(fd, "id");
  const inv = db.getInvoice(id);
  if (!inv) return FAIL({}, "That invoice is no longer there.");
  if (inv.status === "Draft") return FAIL({}, "Issue it first. A draft has no public page to link to.");
  if (inv.voided) return FAIL({}, "This invoice has been struck, so there is nothing to send. Raise a new one.");

  const { sendInvoiceEmail } = await import("@/lib/money-mail");
  const sent = await sendInvoiceEmail({ invoice: inv, by: str(fd, "by") || await actorName() });
  refresh("/admin/money", `/admin/money/${id}`);
  if (sent.sent) return OK("Sent, with the pay link on it.");
  return FAIL({}, sent.reason === "already sent"
    ? "It has already been emailed. The communication log below has the record."
    : sent.reason === "no address"
      ? "There is no email address on file for that client."
      : "The mail server would not take it. The communication log below says why.");
}

/** The nudge on an overdue invoice. */
export async function emailReminder(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await owner();
  if (refused) return refused;
  const id = str(fd, "id");
  const inv = db.getInvoice(id);
  if (!inv) return FAIL({}, "That invoice is no longer there.");
  if (inv.voided) return FAIL({}, "This invoice has been struck, so nobody owes anything on it.");
  if (invoiceTotals(inv).due <= 0) return FAIL({}, "There is nothing outstanding on it.");

  const { sendInvoiceReminderEmail } = await import("@/lib/money-mail");
  const sent = await sendInvoiceReminderEmail({ invoice: inv, by: str(fd, "by") || await actorName() });
  refresh("/admin/money", `/admin/money/${id}`);
  if (sent.sent) return OK("Reminder sent.");
  return FAIL({}, sent.reason === "opted out"
    ? "That client has invoice reminders switched off. It is recorded as skipped rather than sent."
    : sent.reason === "already sent"
      ? "One has already gone today. Tomorrow's is allowed."
      : sent.reason === "no address"
        ? "There is no email address on file for that client."
        : "The mail server would not take it.");
}

/**
 * A call, a WhatsApp message or a conversation, written down.
 *
 * THE SITE CANNOT SEE THESE, so this is a person saying it happened, and the
 * row says who. It is never an email: an email row is written by the outbox
 * when the site itself sends one.
 */
export async function logMessage(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await allow("clients");
  if (refused) return refused;
  const clientId = str(fd, "clientId");
  const client = db.getClient(clientId);
  if (!client) return FAIL({}, "That client is no longer there.");
  const channel = str(fd, "channel");
  if (!["WhatsApp", "Phone", "In person"].includes(channel)) return FAIL({ channel: "Pick how it happened." });
  const direction = str(fd, "direction") === "Inbound" ? "Inbound" : "Outbound";
  const subject = str(fd, "subject").slice(0, 160);
  if (!subject) return FAIL({ subject: "Say in a few words what it was about." });
  const summary = str(fd, "summary").slice(0, 600);
  const by = await actorName();
  await queueLogged({
    channel: channel as "WhatsApp" | "Phone" | "In person", direction,
    to: str(fd, "to").slice(0, 120) || client.name,
    subject, summary: summary || "No further note.",
    dedupeKey: `manual:${crypto.randomUUID()}`,
    by, clientId, state: "Sent",
  });
  db.audit({ actor: by, kind: "client", subjectId: clientId, subject: client.company,
             action: `logged ${direction === "Inbound" ? "an incoming" : "an outgoing"} ${channel === "In person" ? "conversation" : channel === "Phone" ? "call" : "WhatsApp message"}`,
             note: subject });
  refresh(`/admin/clients/${clientId}`);
  return OK("Logged.");
}

/** A message that failed, queued to be tried again. */
export async function resendMessage(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await owner();
  if (refused) return refused;
  const m = await retryLogged(str(fd, "id"), str(fd, "by") || await actorName());
  if (!m) return FAIL({}, "That one did not fail, or is no longer there.");
  refresh("/admin/money", "/admin/clients");
  return OK("Cleared for another attempt. The failed row stays as the record that the first try did not go.");
}

/* ------------------------------------------- voids, refunds and credit -- */

/**
 * Strike an invoice that should never have been raised.
 *
 * A REASON IS REQUIRED, like a reversal's. A struck invoice is a document a
 * client may be holding, and "why does this say void" is a question somebody
 * will be asked.
 */
export async function voidInvoice(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await owner();
  if (refused) return refused;
  const id = str(fd, "id");
  const reason = str(fd, "reason");
  if (!reason) return FAIL({ reason: "Say why. A struck invoice with no reason cannot be explained later." });

  const res = db.voidInvoice(id, reason, str(fd, "by") || await actorName());
  if (!res.ok) {
    return FAIL({}, {
      missing: "That invoice is no longer there.",
      already: "It is already voided.",
      draft: "It is still a draft, so delete it rather than voiding it. Nobody has seen the number.",
      "has-payments": "Money has been received against this one, so it cannot be struck. Refund or reverse the payment first, which is what says where the money went.",
      "no-reason": "Say why.",
    }[res.reason]);
  }
  refresh("/admin/money", `/admin/money/${id}`, `/admin/clients/${res.invoice.clientId}`);
  return OK("Struck. The number stays taken and the document still opens, saying nothing is owed.");
}

/**
 * Give money back.
 *
 * TWO DESTINATIONS, AND THE DIFFERENCE IS NOT COSMETIC. Back to their bank
 * means the money has left the studio. Held on account means it has not, and
 * the client now has a balance that will come off their next invoice. The form
 * asks, and the books record which.
 */
export async function refundPayment(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await owner();
  if (refused) return refused;
  const errors: Record<string, string> = {};
  const paymentId = str(fd, "id");
  const amount = kobo(fd, "amount");
  if (!amount) errors.amount = "How much is going back?";
  const reason = str(fd, "reason");
  if (!reason) errors.reason = "Say why. This is money leaving, and it is the entry somebody will question.";
  if (Object.keys(errors).length) return FAIL(errors);

  const toCredit = str(fd, "where") === "credit";
  const res = db.refundPayment({
    paymentId, amount: amount!, reason, toCredit,
    reference: str(fd, "reference"),
    actor: str(fd, "by") || await actorName(),
  });

  if (!res.ok) {
    const said: Record<typeof res.reason, string> = {
      missing: "That payment is no longer there.",
      reversed: "That payment is already reversed, so there is nothing there to give back.",
      "not-positive": "The amount has to be more than nothing.",
      "too-much": "That is more than is left on this payment. Part of it has already gone back.",
      "no-reason": "Say why.",
    };
    return FAIL(res.reason === "too-much" ? { amount: said[res.reason] } : {}, said[res.reason]);
  }

  const inv = db.getInvoice(res.payment.invoiceId);
  refresh("/admin/money", `/admin/money/${res.payment.invoiceId}`,
          inv ? `/admin/clients/${inv.clientId}` : "/admin/clients");
  return OK(toCredit
    ? `${naira(res.refund.amount)} moved onto the client's balance. It will come off their next invoice.`
    : `${naira(res.refund.amount)} recorded as returned. The receipt says so and the totals no longer count it.`);
}

/** Move an overpayment onto the client's balance rather than sending it back. */
export async function overpaymentToCredit(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await owner();
  if (refused) return refused;
  const id = str(fd, "id");
  const res = db.overpaymentToCredit(id, str(fd, "by") || await actorName());
  if (!res.ok) {
    return FAIL({}, {
      missing: "That invoice is no longer there.",
      "not-overpaid": "Nothing has been taken over the total on this one.",
      "no-payment": "There is no payment here to take it off.",
    }[res.reason]);
  }
  const inv = db.getInvoice(id);
  refresh("/admin/money", `/admin/money/${id}`, inv ? `/admin/clients/${inv.clientId}` : "/admin/clients");
  return OK(`${naira(res.credit.amount)} is on the client's balance now, and this invoice lands exactly on its total.`);
}

/** Spend a credit on an invoice. This is the balance carrying forward. */
export async function applyCredit(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await owner();
  if (refused) return refused;
  const creditId = str(fd, "id");
  const invoiceId = str(fd, "invoiceId");
  if (!invoiceId) return FAIL({ invoiceId: "Pick the invoice it should come off." });

  const res = db.applyCredit(creditId, invoiceId, str(fd, "by") || await actorName());
  if (!res.ok) {
    return FAIL({}, {
      missing: "That credit is no longer there.",
      spent: "That credit has already been used.",
      "no-invoice": "That invoice is no longer there.",
      draft: "That invoice is still a draft. Issue it first.",
      "wrong-client": "That invoice belongs to a different client, and one client's credit is not another's.",
      "nothing-due": "There is nothing outstanding on that invoice.",
    }[res.reason]);
  }

  refresh("/admin/money", `/admin/money/${invoiceId}`, `/admin/clients/${res.invoice.clientId}`);
  return OK(res.leftOver > 0
    ? `Applied to ${res.invoice.number}. ${naira(res.leftOver)} stays on their balance.`
    : `Applied to ${res.invoice.number}, and their balance is clear.`);
}

/* ---------------------------------------------------------- estimates -- */

export async function createEstimate(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await owner();
  if (refused) return refused;
  const errors: Record<string, string> = {};
  const clientId = str(fd, "clientId");
  if (!db.getClient(clientId)) errors.clientId = "Say who it is for.";

  const { lines, bad } = readLines(fd);
  if (bad) errors.lines = bad;

  const issued = isoDate(fd, "issued") ?? new Date().toISOString();
  const expires = isoDate(fd, "expires");
  if (!expires) errors.expires = "Say how long the price holds.";
  else if (expires < issued) errors.expires = "It expires before it is issued.";

  const vatRate = num(fd, "vatRate") ?? 7.5;
  if (vatRate < 0 || vatRate > 100) errors.vatRate = "VAT has to be between 0 and 100.";

  /* A DISCOUNT IS A RATE, NOT AN AMOUNT, so it survives a line being edited.
     Bounded at both ends: a negative one is a surcharge wearing a discount's
     name, and anything over 100 is money flowing the wrong way. */
  const discount = num(fd, "discount") ?? 0;
  if (discount < 0 || discount > 100) errors.discount = "A discount has to be between 0 and 100.";

  if (Object.keys(errors).length) return FAIL(errors);

  const est = db.addEstimate({
    clientId, projectId: str(fd, "projectId") || null,
    issued, expires: expires!, vatRate, lines,
    discount: discount > 0 ? discount : undefined,
    notes: str(fd, "notes") || undefined,
    terms: str(fd, "terms") || undefined,
    state: str(fd, "send") === "1" ? "Sent" : "Draft",
  }, str(fd, "by") || await actorName());

  refresh("/admin/money", `/admin/clients/${clientId}`);
  return OK(est.state === "Sent"
    ? `${est.number} is out. Its page is live at /q/${est.token}.`
    : `${est.number} saved as a draft. Nothing is public until you send it.`);
}

export async function sendEstimate(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await owner();
  if (refused) return refused;
  const est = db.sendEstimate(str(fd, "id"), str(fd, "by") || await actorName());
  if (!est) return FAIL({}, "That one is no longer a draft, or is no longer there.");
  refresh("/admin/money", `/admin/clients/${est.clientId}`);
  return OK(`${est.number} is out. Send the client the link and the price holds until it expires.`);
}

/**
 * The client's answer, recorded by whoever took it.
 *
 * THE NAME IS REQUIRED AND IT IS THEIRS, not the studio's. "Accepted by
 * Studio" is a row nobody can defend, and an acceptance is the one record a
 * disagreement about scope gets settled against.
 */
export async function answerEstimate(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await owner();
  if (refused) return refused;
  const accepted = str(fd, "answer") === "accepted";
  const by = str(fd, "by");
  if (!by) return FAIL({ by: "Who said so? An acceptance with no name against it cannot be relied on." });

  const res = db.answerEstimate({
    id: str(fd, "id"), accepted, by,
    note: str(fd, "note"),
    dueInDays: num(fd, "dueInDays") ?? 30,
    actor: str(fd, "actor") || "Studio",
  });

  if (!res.ok) {
    return FAIL({}, {
      missing: "That estimate is no longer there.",
      "not-sent": "Only an estimate that has been sent can be answered. A draft has not left the studio.",
      "no-name": "Who said so?",
    }[res.reason]);
  }

  refresh("/admin/money", `/admin/clients/${res.estimate.clientId}`);
  return OK(res.invoice
    ? `Accepted, and raised as ${res.invoice.number}. The estimate keeps its own number and its own page.`
    : "Recorded as declined. It stays on the books, because a quote nobody took is worth knowing about later.");
}

/** Quote the same thing again, as a fresh draft at today's date. */
export async function duplicateEstimate(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await owner();
  if (refused) return refused;
  const copy = db.duplicateEstimate(str(fd, "id"), str(fd, "by") || await actorName());
  if (!copy) return FAIL({}, "That estimate is no longer there.");
  refresh("/admin/money", `/admin/clients/${copy.clientId}`);
  return OK(`Copied to ${copy.number} as a draft. Change what needs changing, then send it.`);
}

export async function duplicateInvoice(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await owner();
  if (refused) return refused;
  /* The copy's due date comes from the saved default, so load it first. */
  await hydrateSettings();
  const copy = db.duplicateInvoice(str(fd, "id"), str(fd, "by") || await actorName());
  if (!copy) return FAIL({}, "That invoice is no longer there.");
  refresh("/admin/money", `/admin/clients/${copy.clientId}`);
  return OK(`Copied to ${copy.number} as a draft, due on your default terms. Change what needs changing, then issue it.`);
}

/* ----------------------------------------------------------- portal: support */

export async function replyToTicketAsStudio(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await allow("clients");
  if (refused) return refused;
  const body = str(fd, "body");
  if (!body) return FAIL({ body: "Type a reply first." });
  /* Signed with the person's name: "Studio" told the client nothing about
     who they were talking to. */
  const author = await actorName();
  const t = db.addTicketMessage({ ticketId: str(fd, "id"), from: "studio", author, body });
  if (!t) return FAIL({}, "That conversation is no longer there.");
  const ticket = db.getTicket(t.ticketId);
  if (ticket) {
    refresh(`/admin/clients/${ticket.clientId}`, "/admin/clients/support", `/admin/clients/support/${ticket.id}`, "/portal/support", `/portal/support/${ticket.id}`, "/portal");
    /* The client's copy goes behind the response; the row is written first. */
    after(() => import("@/lib/support-mail").then((m) => m.sendSupportReply({ ticket, reply: body, author, messageId: t.id, by: author })));
  }
  return OK("Reply sent. The client has been emailed.");
}

/** Open, answered or closed, set by the studio; reopening is a status too. */
export async function setTicketState(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await allow("clients");
  if (refused) return refused;
  const status = str(fd, "status");
  if (!["Open", "Answered", "Closed"].includes(status)) return FAIL({}, "That is not a status.");
  const t = db.setTicketStatus(str(fd, "id"), status as "Open" | "Answered" | "Closed");
  if (!t) return FAIL({}, "That conversation is no longer there.");
  db.audit({ actor: await actorName(), kind: "client", subjectId: t.clientId, subject: t.subject, action: `set a support question to ${status}` });
  refresh(`/admin/clients/${t.clientId}`, "/admin/clients/support", `/admin/clients/support/${t.id}`, "/portal/support", `/portal/support/${t.id}`, "/portal");
  return OK(status === "Closed" ? "Closed." : status === "Open" ? "Reopened." : "Marked answered.");
}

