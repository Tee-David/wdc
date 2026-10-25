import "server-only";

import {
  addClient, addInvoice, addProject, applyPayment, audit, getClients, getInvoices, getProjects, nextInvoiceNumber,
  nextReceiptNumber, patchClient, setClientDepartments,
} from "@/lib/admin/store";
import { listDepartments } from "@/lib/departments";
import { saveStore, syncStore } from "@/lib/admin/persist";
import type { Client, Project } from "@/lib/admin/types";
import type { ServiceSlug } from "@/lib/services";

/**
 * REALTORS' PRACTICE AND SHOP WITH PECULIAR, brought in from the studio's own invoice files (the owner's zip of
 * thirteen invoices, 2 Jul 2025 to 5 Oct 2026). Applied from Settings > System by the owner, because that is the
 * only way into production's database that does not put its address in a script.
 *
 * WHAT IS RECORDED IS WHAT THE FILES SAY, and what the owner said about them: the owner confirmed that all thirteen
 * were paid in full, so each gets one transfer payment on its own date and the receipt numbering that follows.
 * Nothing is invented: the files carry no email, phone or bank details, so none are written; no owner is named on a
 * project; the old invoice number is kept on the invoice (`formerNumbers`) so the studio's own paperwork still
 * matches it.
 *
 * SAFE TO RUN TWICE. A client is found by company name before one is made, an invoice by the old number it carries,
 * a project by its title, and a payment by its reference, so a second run adds nothing.
 */

type Row = { old: string; issued: string; line: string; qty: number; unit: number; project: string };
const naira = (n: number) => Math.round(n * 100);

/* The studio's earlier numbers are the three digits on each file. Amounts are in naira. */
const REALTORS: Row[] = [
  { old: "067", issued: "2025-08-04", line: "Real estate property aggregation platform", qty: 1, unit: naira(250_000), project: "aggregation" },
  { old: "072", issued: "2025-09-01", line: "Real estate property aggregation platform (V2)", qty: 1, unit: naira(250_000), project: "aggregation" },
  { old: "013", issued: "2026-03-02", line: "Real estate property aggregation platform (Final V3)", qty: 1, unit: naira(690_000), project: "aggregation" },
  { old: "033", issued: "2026-04-02", line: "Custom real estate website platform", qty: 1, unit: naira(400_000), project: "website" },
  { old: "054", issued: "2026-05-26", line: "VM overages", qty: 1, unit: naira(26_000), project: "cloud" },
  { old: "055", issued: "2026-07-29", line: "1 month SEO and presentation", qty: 1, unit: naira(160_000), project: "seo" },
  { old: "056", issued: "2026-08-18", line: "6 months service agreement (retainer)", qty: 1, unit: naira(580_000), project: "retainer" },
  { old: "057", issued: "2026-08-29", line: "DB cluster allocation upgrade", qty: 1, unit: naira(50_000), project: "cloud" },
  { old: "058", issued: "2026-09-03", line: "3 months paid API credits purchase", qty: 1, unit: naira(135_000), project: "ai" },
  { old: "059", issued: "2026-09-08", line: "Graphics", qty: 30, unit: naira(3_000), project: "graphics" },
  { old: "060", issued: "2026-09-27", line: "2 months AI subscription", qty: 1, unit: naira(60_000), project: "ai" },
  { old: "061", issued: "2026-10-05", line: "VM allocation upgrade", qty: 1, unit: naira(164_000), project: "cloud" },
];
const PECULIAR: Row[] = [
  { old: "052", issued: "2025-07-11", line: "E-commerce website", qty: 1, unit: naira(150_000), project: "shop" },
];

type Plan = { title: string; service: ServiceSlug; ongoing: boolean; due: string | null; scope: string; dept: RegExp };
const PROJECTS: Record<string, Plan> = {
  aggregation: { title: "Real estate property aggregation platform", service: "software", ongoing: false, due: "2026-03-02", scope: "The property scraper app. Version 1 (Aug 2025), Version 2 (Sep 2025) and the final Version 3 (Mar 2026). Maintained under the service agreement.", dept: /software/i },
  website: { title: "Real estate website platform", service: "web", ongoing: false, due: "2026-04-02", scope: "A custom real estate website platform, built from April 2026 and complete. It is now looked after under the service agreement.", dept: /web/i },
  cloud: { title: "VPS and cloud infrastructure", service: "software", ongoing: true, due: null, scope: "The server (VPS) the studio runs for the client: VM and database cluster capacity, overages and allocation upgrades as it grows.", dept: /software/i },
  seo: { title: "SEO and presentation", service: "seo", ongoing: false, due: "2026-07-29", scope: "One month of SEO work and a presentation.", dept: /seo/i },
  retainer: { title: "Service agreement (6 month retainer)", service: "software", ongoing: true, due: "2027-02-18", scope: "A six month maintenance retainer from 18 Aug 2026. It covers the three systems the studio manages for Realtors' Practice: the scraper app, the real estate website and the VPS.", dept: /software/i },
  ai: { title: "AI subscription and API credits", service: "software", ongoing: true, due: "2026-12-03", scope: "Paid API credits for three months (from 3 Sep 2026) and an AI subscription for two months (from 27 Sep 2026).", dept: /software/i },
  graphics: { title: "Graphics (30 designs)", service: "branding", ongoing: false, due: "2026-09-08", scope: "Thirty graphics.", dept: /brand/i },
  shop: { title: "E-commerce website", service: "web", ongoing: false, due: "2025-07-11", scope: "An e-commerce website.", dept: /web/i },
};

const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export type ImportResult = { summary: string; created: string[]; found: string[] };

async function bring(company: string, contact: string, rows: Row[], tags: string[], services: ServiceSlug[], by: string, note: string[]) {
  let client = getClients({ includeArchived: true }).find((c) => key(c.company) === key(company)) as Client | undefined;
  const existed = Boolean(client);
  if (!client) {
    client = addClient({ company, name: contact, email: "", phone: "", services, sector: "Real estate", tags, contacts: [], departments: [] } as never, by);
    audit({ actor: by, kind: "client", subjectId: client.id, subject: client.company, action: "brought in", note: "From the studio's invoice files" });
  } else {
    patchClient(client.id, {
      services: [...new Set([...client.services, ...services])],
      tags: [...new Set([...(client.tags ?? []), ...tags])],
    }, by);
  }
  const c = client;
  if (company === "Realtors' Practice" && !(c.notes ?? "").includes("scraper app")) patchClient(c.id, { notes: [(c.notes ?? "").trim(), "Systems the studio manages: the scraper app, the real estate website and the VPS, under the six month service agreement."].filter(Boolean).join("\n") }, by);
  /* A second contact is added when the record already names somebody else. */
  const names = [c.name, ...(c.contacts ?? []).map((p) => p.name)].map(key);
  if (!names.includes(key(contact)) && c.name.trim()) patchClient(c.id, { contacts: [...(c.contacts ?? []), { name: contact }] }, by);

  const projectIds: Record<string, string> = {};
  let projects = 0, invoices = 0, payments = 0;
  for (const slug of [...new Set(rows.map((r) => r.project))]) {
    const plan = PROJECTS[slug];
    let p = getProjects(true).find((x) => x.clientId === c.id && key(x.title) === key(plan.title)) as Project | undefined;
    if (!p) {
      p = addProject({ clientId: c.id, title: plan.title, service: plan.service, stage: plan.ongoing ? "In progress" : "Delivered", due: plan.due, scope: plan.scope, budget: null });
      const first = rows.filter((r) => r.project === slug).map((r) => r.issued).sort()[0];
      p.events = [{ at: first, text: "Brought in from the studio's earlier invoice records", visibility: "internal" }];
      projects++;
    }
    projectIds[slug] = p.id;
  }
  for (const r of rows) {
    let inv = getInvoices().find((i) => i.clientId === c.id && (i.formerNumbers ?? []).includes(r.old));
    if (!inv) {
      inv = addInvoice({ clientId: c.id, projectId: projectIds[r.project], issued: r.issued, due: r.issued, vatRate: 0, lines: [{ description: r.line, qty: r.qty, unit: r.unit }], status: "Sent" });
      inv.number = nextInvoiceNumber(Number(r.issued.slice(0, 4)));
      inv.formerNumbers = [r.old];
      invoices++;
    }
    const total = r.qty * r.unit;
    if (inv.paid < total) {
      const res = applyPayment({ invoiceId: inv.id, amount: total - inv.paid, method: "Transfer", reference: `RP-IMPORT-${r.old}`, at: r.issued, by: "Imported record", note: `Paid in full. From the studio's earlier invoice ${r.old}.` });
      if (res.ok) {
        /* A receipt carries the year it was paid, not the year it was brought in. */
        res.payment.receiptNo = nextReceiptNumber(Number(r.issued.slice(0, 4)));
        payments++;
      }
    }
  }
  const depts = await listDepartments().catch(() => null);
  if (depts) {
    const want = [...new Set(rows.map((r) => PROJECTS[r.project].dept))];
    const ids = depts.filter((d) => want.some((re) => re.test(d.name))).map((d) => d.id);
    if (ids.length) setClientDepartments(c.id, [...new Set([...(c.departments ?? []), ...ids])], by);
  } else note.push("Departments are not set up yet, so none were attached to " + company + ".");
  return { existed, projects, invoices, payments, company };
}

export async function importRealtorsPractice(by: string): Promise<ImportResult> {
  await syncStore();
  const notes: string[] = [];
  const a = await bring("Realtors' Practice", "Olawale Legunsen", REALTORS, ["retainer"], ["software", "web", "seo", "branding"], by, notes);
  /* Samuel Legunsen is the name on eight of the files; he is a contact of the same company. */
  const client = getClients({ includeArchived: true }).find((c) => key(c.company) === key("Realtors' Practice"));
  if (client && ![client.name, ...(client.contacts ?? []).map((p) => p.name)].map(key).includes(key("Samuel Legunsen"))) {
    patchClient(client.id, { contacts: [...(client.contacts ?? []), { name: "Samuel Legunsen" }] }, by);
  }
  const b = await bring("Shop With Peculiar", "Shop With Peculiar", PECULIAR, [], ["web"], by, notes);
  await saveStore();
  const line = (x: typeof a) => `${x.company}: ${x.existed ? "already on file, updated" : "added"}, ${x.projects} project${x.projects === 1 ? "" : "s"}, ${x.invoices} invoice${x.invoices === 1 ? "" : "s"} and ${x.payments} payment${x.payments === 1 ? "" : "s"} recorded`;
  return {
    summary: `${line(a)}. ${line(b)}.${notes.length ? ` ${notes.join(" ")}` : ""}`,
    created: [a, b].filter((x) => !x.existed).map((x) => x.company),
    found: [a, b].filter((x) => x.existed).map((x) => x.company),
  };
}
