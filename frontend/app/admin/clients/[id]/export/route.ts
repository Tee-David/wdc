import { NextResponse } from "next/server";
import { adminRole, actorName } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import * as store from "@/lib/admin/store";
import { estimateTotals, invoiceTotals } from "@/lib/admin/types";
import { currencyOf } from "@/lib/money/currency";
import { persistSoon, syncStore } from "@/lib/admin/persist";

export const dynamic = "force-dynamic";

/**
 * EVERYTHING ABOUT ONE CLIENT, as one JSON file: the record and its people,
 * every project with its tasks, updates and deliverables, every invoice with
 * its payments, every quote, the monthly plan and every support question. For a
 * handover or a data request (the privacy export adds forms and accounts by
 * email). Admin only; every download is in the audit log. Money is in kobo (or
 * the currency's minor unit), as stored.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await syncStore();
  persistSoon();
  if (!can(await adminRole(), "settings")) return new NextResponse("Not found", { status: 404 });
  const { id } = await params;
  const c = store.getClient(id);
  if (!c) return new NextResponse("Not found", { status: 404 });
  const projects = store.getProjectsFor(c.id, true).map((p) => ({ ...p, tasks: store.getTasksFor(p.id), updates: store.getUpdatesFor(p.id), deliverables: store.getDeliverablesFor(p.id) }));
  const invoices = store.getInvoicesFor(c.id).map((i) => ({ ...i, currency: currencyOf(i), totals: invoiceTotals(i), payments: store.getPaymentsFor(i.id) }));
  const quotes = store.getEstimatesFor(c.id).map((e) => ({ ...e, totals: estimateTotals(e) }));
  const questions = store.getTicketsFor(c.id).map((t) => ({ ...t, messages: store.getTicketMessages(t.id) }));
  const by = await actorName();
  store.audit({ actor: by, kind: "client", subjectId: c.id, subject: c.company || c.name, action: "exported everything held about them" });
  const name = `${(c.company || c.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${new Date().toISOString().slice(0, 10)}`;
  return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), exportedBy: by, client: c, plan: store.getRetainerFor(c.id) ?? null, projects, invoices, quotes, questions }, null, 2), {
    headers: { "content-disposition": `attachment; filename="${name}.json"`, "content-type": "application/json; charset=utf-8", "cache-control": "private, no-store", "x-content-type-options": "nosniff" },
  });
}
