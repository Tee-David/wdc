"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as db from "./store";
import { invoiceTotals, naira, type InvoiceLine } from "./types";
import {
  FAIL, OK, type ActionState,
  isoDate, kobo, looksEmail, num, required, services, stage, str,
} from "./validate";

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
 * WHAT IS NOT HERE YET, said rather than implied: there is no authentication.
 * These endpoints are reachable by anyone who can reach /admin, which is
 * everyone, because Better Auth and the middleware gate are the next piece of
 * work. next.config.ts keeps /admin out of the index and out of every cache,
 * which is not the same as keeping people out. Nothing below should be
 * exposed to the internet until that gate is in front of it.
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

  return {
    errors,
    draft: {
      company, name, email,
      phone: str(fd, "phone"),
      services: picked,
      sector: str(fd, "sector"),
      notes: str(fd, "notes") || undefined,
    },
  };
}

export async function createClient(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { errors, draft } = readClient(fd);
  if (Object.keys(errors).length) return FAIL(errors);

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
  const id = str(fd, "id");
  const { errors, draft } = readClient(fd);
  if (Object.keys(errors).length) return FAIL(errors);
  if (!db.patchClient(id, draft)) return FAIL({}, "That client is no longer there.");

  refresh("/admin/clients", `/admin/clients/${id}`);
  return OK("Saved.");
}

export async function archiveClient(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd, "id");
  const back = str(fd, "restore") === "1";
  const c = db.archiveClient(id, !back);
  if (!c) return FAIL({}, "That client is no longer there.");

  refresh("/admin/clients", `/admin/clients/${id}`);
  return OK(back ? `${c.company} is back on the books.` : `${c.company} is archived. Their invoices and projects are untouched.`);
}

/* -------------------------------------------------------------- projects */

export async function createProject(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const errors: Record<string, string> = {};
  const title = required(errors, "title", str(fd, "title"), "A project name");
  const clientId = str(fd, "clientId");
  if (!clientId) errors.clientId = "Say who it is for.";
  else if (!db.getClient(clientId)) errors.clientId = "That client is no longer there.";

  const [service] = services(fd, "service");
  if (!service) errors.service = "Pick the service.";
  const at = stage(fd) ?? "Onboarding";

  if (Object.keys(errors).length) return FAIL(errors);

  const p = db.addProject({ clientId, title, service: service!, stage: at, due: isoDate(fd, "due") });
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
  const id = str(fd, "id");
  const to = stage(fd);
  if (!to) return FAIL({ stage: "Pick a stage." });

  const p = db.setStage(id, to, str(fd, "note") || undefined);
  if (!p) return FAIL({}, "That project is no longer there.");

  refresh("/admin/projects", `/admin/projects/${id}`, `/admin/clients/${p.clientId}`);
  return OK(`Now at ${p.stage}.`);
}

export async function addNote(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd, "id");
  const text = str(fd, "note");
  if (!text) return FAIL({ note: "Write the note first." });

  const p = db.addProjectNote(id, text);
  if (!p) return FAIL({}, "That project is no longer there.");

  refresh(`/admin/projects/${id}`);
  return OK("Noted.");
}

export async function setDue(_prev: ActionState, fd: FormData): Promise<ActionState> {
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
  const id = str(fd, "id");
  const inv = db.sendInvoice(id);
  if (!inv) return FAIL({}, "That invoice is no longer there.");
  if (inv.status === "Draft") return FAIL({}, "It could not be issued.");

  refresh("/admin/money", `/admin/money/${id}`, `/admin/clients/${inv.clientId}`);
  return OK(`${inv.number} is issued. Emailing it to the client arrives with SMTP.`);
}

export async function deleteInvoice(_prev: ActionState, fd: FormData): Promise<ActionState> {
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
  const invoiceId = str(fd, "invoiceId");
  const amount = kobo(fd, "amount");
  const reference = str(fd, "reference");
  const methodRaw = str(fd, "method");
  const method = (["Paystack", "Transfer", "Cash"] as const).find((m) => m === methodRaw) ?? "Transfer";

  const errors: Record<string, string> = {};
  if (!amount) errors.amount = "How much came in?";
  if (!reference) errors.reference = "A reference is what stops this being recorded twice.";
  if (Object.keys(errors).length) return FAIL(errors);

  const res = db.applyPayment({ invoiceId, amount: amount!, method, reference, at: isoDate(fd, "at") ?? undefined });

  if (!res.ok) {
    const said = {
      "no-invoice": "That invoice is no longer there.",
      duplicate: "That reference is already recorded, so nothing was added. This is the guard working.",
      "not-positive": "The amount has to be more than nothing.",
      draft: "This invoice is still a draft. Issue it first.",
    }[res.reason];
    return FAIL({ reference: res.reason === "duplicate" ? said : "" }, said);
  }

  refresh("/admin/money", `/admin/money/${invoiceId}`, `/admin/clients/${res.invoice.clientId}`);

  const t = invoiceTotals(res.invoice);
  if (res.overpaid) {
    return OK(`Recorded. This invoice is now paid ${naira(res.invoice.paid - t.total)} over its total, so check before refunding.`);
  }
  return OK(t.due ? `Recorded. ${naira(t.due)} still owing.` : "Recorded. This invoice is settled.");
}

export async function reversePayment(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd, "id");
  const invoiceId = str(fd, "invoiceId");
  if (!db.reversePayment(id)) return FAIL({}, "That payment is no longer there.");

  refresh("/admin/money", `/admin/money/${invoiceId}`);
  return OK("Reversed, and the invoice re-totalled.");
}

/* -------------------------------------------------------------- expenses */

export async function createExpense(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const errors: Record<string, string> = {};
  const description = required(errors, "description", str(fd, "description"), "What it was for");
  const amount = kobo(fd, "amount");
  if (!amount) errors.amount = "How much was it?";
  if (Object.keys(errors).length) return FAIL(errors);

  db.addExpense({
    description, amount: amount!,
    category: str(fd, "category") || "Other",
    at: isoDate(fd, "at") ?? new Date().toISOString(),
  });

  refresh("/admin/money");
  return OK("Added.");
}

export async function removeExpense(_prev: ActionState, fd: FormData): Promise<ActionState> {
  if (!db.deleteExpense(str(fd, "id"))) return FAIL({}, "That one is already gone.");
  refresh("/admin/money");
  return OK("Removed.");
}

/* ------------------------------------------------------------ onboarding */

export async function attachSubmission(_prev: ActionState, fd: FormData): Promise<ActionState> {
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
