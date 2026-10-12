import {
  getClients, getEstimates, getExpenses, getInvoices, getPayments, getProjects, getSubmissions, getTasks, getTickets,
} from "../store";
import { invoiceStatus, invoiceTotals, type Client, type Estimate, type Expense, type Invoice, type Payment, type Project, type Submission, type Task, type Ticket } from "../types";
import { currencyOf } from "@/lib/money/currency";
import { DAY, type Filters, type Span } from "./filters";

/**
 * WHAT A REPORT IS ALLOWED TO SEE.
 *
 * The filters are applied once, here, to every kind of record. Each section of
 * the page then adds up the same scoped lists, so two tables on one screen can
 * never disagree about which invoices are in. Nothing is stored: the books are
 * read as they stand. Drafts and voided invoices are not on the books.
 *
 * Money is held to ONE currency per report (the filter), never converted: a
 * dollar invoice is not a worth-about-this-many-naira invoice until somebody
 * moves the money, and a report that guesses the rate is the one that gets
 * quoted wrongly later.
 */
export type Scope = {
  f: Filters;
  today: string;
  now: Date;
  clients: Map<string, Client>;
  allClients: Client[];
  invoices: Invoice[];
  /** Every payment on a scoped invoice, any date; sections cut it by period. */
  payments: { p: Payment; inv: Invoice }[];
  expenses: Expense[];
  estimates: Estimate[];
  projects: Project[];
  tasks: Task[];
  tickets: Ticket[];
  submissions: Submission[];
  projectById: Map<string, Project>;
  /** Other currencies on the books, so a report can say what it left out. */
  otherCurrencies: string[];
};

export const day = (iso: string) => iso.slice(0, 10);
export const inside = (iso: string | null | undefined, s: Span) => !!iso && day(iso) >= s.from && day(iso) <= s.to;
export const owners = (p: Project) => (p.owner || "").split(",").map((x) => x.trim()).filter(Boolean);

export function buildScope(f: Filters, nowMs: number): Scope {
  const now = new Date(nowMs);
  const allClients = getClients({ includeArchived: true });
  const projects0 = getProjects(true);
  const projectById = new Map(projects0.map((p) => [p.id, p]));
  const q = f.q.toLowerCase();

  const clientOk = (c: Client | undefined) => {
    if (!c) return false;
    if (f.client.length && !f.client.includes(c.id)) return false;
    if (f.dept.length && !(c.departments ?? []).some((d) => f.dept.includes(d))) return false;
    if (f.svc.length && !c.services.some((s) => f.svc.includes(s))) return false;
    if (q && !`${c.company} ${c.name} ${c.email}`.toLowerCase().includes(q)) return false;
    return true;
  };
  const clients = new Map(allClients.filter(clientOk).map((c) => [c.id, c]));
  const clientById = new Map(allClients.map((c) => [c.id, c]));

  const projectOk = (p: Project | undefined | null) => {
    if (!p) return false;
    if (f.svc.length && !f.svc.includes(p.service)) return false;
    if (f.staff.length && !owners(p).some((o) => f.staff.includes(o))) return false;
    return clients.has(p.clientId);
  };
  const projects = projects0.filter(projectOk);

  const onBooks = getInvoices().filter((i) => i.status !== "Draft" && !i.voided && currencyOf(i) === f.cur);
  const invoices = onBooks.filter((i) => {
    if (!clients.has(i.clientId)) return false;
    const pr = i.projectId ? projectById.get(i.projectId) : null;
    if (f.svc.length && pr && !f.svc.includes(pr.service)) return false;
    if (f.staff.length && !(pr && owners(pr).some((o) => f.staff.includes(o)))) return false;
    if (f.status.length && !f.status.includes(invoiceStatus(i, now))) return false;
    const total = invoiceTotals(i).total;
    if (f.min != null && total < f.min * 100) return false;
    if (f.max != null && total > f.max * 100) return false;
    return true;
  });
  const invById = new Map(invoices.map((i) => [i.id, i]));
  const payments = getPayments().flatMap((p) => {
    const inv = invById.get(p.invoiceId);
    if (!inv) return [];
    if (f.method.length && !f.method.includes(p.method)) return [];
    return [{ p, inv }];
  });

  const scoped = !!(f.client.length || f.dept.length || f.svc.length || f.staff.length || f.q);
  const expenses = getExpenses().filter((e) => {
    const pr = e.projectId ? projectById.get(e.projectId) : null;
    const cid = e.clientId ?? pr?.clientId;
    /* Overhead belongs to no client, so any filter that names a client, service, team or person leaves it out. */
    if (!cid) return !scoped;
    if (!clients.has(cid)) return false;
    if (f.svc.length && pr && !f.svc.includes(pr.service)) return false;
    if (f.staff.length && !(pr && owners(pr).some((o) => f.staff.includes(o)))) return false;
    if (f.method.length && !(e.method && f.method.includes(e.method))) return false;
    if (f.min != null && e.amount < f.min * 100) return false;
    if (f.max != null && e.amount > f.max * 100) return false;
    return true;
  }).filter((e) => !(e as { currency?: string }).currency || (e as { currency?: string }).currency === f.cur);

  const estimates = getEstimates().filter((e) => currencyOf(e) === f.cur && clients.has(e.clientId)
    && (!f.svc.length || !e.projectId || f.svc.includes(projectById.get(e.projectId)?.service ?? "")));
  const tasks = getTasks().filter((t) => {
    const pr = projectById.get(t.projectId);
    if (!pr || !projectOk(pr)) return false;
    return !f.staff.length || f.staff.includes(t.assignee);
  });
  const tickets = getTickets().filter((t) => clients.has(t.clientId));
  const submissions = getSubmissions().filter((s) => (!s.clientId || clients.has(s.clientId)) && (!f.svc.length || f.svc.includes(s.service)));

  const otherCurrencies = [...new Set(getInvoices().map((i) => currencyOf(i)).filter((c) => c !== f.cur))];
  void clientById;
  return { f, today: now.toISOString().slice(0, 10), now, clients, allClients, invoices, payments, expenses, estimates, projects, tasks, tickets, submissions, projectById, otherCurrencies };
}

export const daysBetween = (a: string, b: string) => Math.round((Date.parse(day(b)) - Date.parse(day(a))) / DAY);
