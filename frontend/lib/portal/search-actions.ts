"use server";

import { getPortalRequest } from "./session";
import { getInvoices, getProject, getTicketsFor } from "@/lib/admin/store";
import { siteFaqs } from "@/lib/site-content";

export type PortalHit = { href: string; label: string; sub: string; kind: "Project" | "Invoice" | "Conversation" | "Help" };

/**
 * THE PORTAL'S SEARCH, over what this person may open and nothing else: their
 * projects, their invoices (when billing is theirs), their conversations and
 * the help articles. The scope is read from the session here, never from the
 * browser, so a typed id finds nothing it could not already open.
 */
export async function portalSearch(raw: string): Promise<PortalHit[]> {
  const q = String(raw ?? "").trim().slice(0, 80).toLocaleLowerCase();
  if (q.length < 2) return [];
  const { client, isPrimaryContact, allowedProjectIds, billingProjectIds } = await getPortalRequest();
  if (!client) return [];
  const has = (...parts: (string | undefined | null)[]) => parts.join(" ").toLocaleLowerCase().includes(q);
  const projects = allowedProjectIds.map((id) => getProject(id)).filter((p): p is NonNullable<typeof p> => Boolean(p) && !p!.archived);
  const hits: PortalHit[] = projects.filter((p) => has(p.title, p.service)).slice(0, 5)
    .map((p) => ({ href: `/portal/projects/${p.id}`, label: p.title, sub: p.stage, kind: "Project" }));
  const invoices = getInvoices().filter((i) => i.status !== "Draft" && !i.voided && ((isPrimaryContact && i.clientId === client.id) || (i.projectId && billingProjectIds.includes(i.projectId))));
  hits.push(...invoices.filter((i) => has(i.number, ...(i.formerNumbers ?? []), i.projectId ? getProject(i.projectId)?.title : "")).slice(0, 5)
    .map((i) => ({ href: `/i/${i.token}`, label: i.number, sub: i.projectId ? getProject(i.projectId)?.title ?? "Invoice" : "Invoice", kind: "Invoice" as const })));
  if (isPrimaryContact) hits.push(...getTicketsFor(client.id).filter((t) => has(t.subject)).slice(0, 5)
    .map((t) => ({ href: `/portal/support/${t.id}`, label: t.subject, sub: t.status === "Closed" ? "Closed" : "Open", kind: "Conversation" as const })));
  const mine = new Set<string>(projects.map((p) => p.service));
  const { faqs } = await siteFaqs();
  hits.push(...faqs.filter((f) => (!f.services?.length || f.services.some((x) => mine.has(x))) && has(f.q, f.a)).slice(0, 5)
    .map((f) => ({ href: `/portal/help?q=${encodeURIComponent(f.q.slice(0, 60))}`, label: f.q, sub: "Help article", kind: "Help" as const })));
  return hits;
}
