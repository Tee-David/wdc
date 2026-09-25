import { NextResponse } from "next/server";
import { SERVICES } from "@/lib/services";
import { getAdminRequest } from "@/lib/admin/session";
import { getClients, getInvoicesFor, getProjectsFor } from "@/lib/admin/store";
import { invoiceTotals } from "@/lib/admin/types";
import { csvBody, CSV_HEADERS } from "@/lib/admin/csv";
import { persistSoon, syncStore } from "@/lib/admin/persist";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await syncStore();
  persistSoon();
  const { session } = await getAdminRequest();
  if (!session?.user || (session.user as typeof session.user & { role?: string }).role !== "owner") {
    return new NextResponse("Not found", { status: 404 });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("q")?.trim().toLocaleLowerCase() ?? "";
  /* The list's date range, so an export is what the screen showed. */
  const day = (k: string) => { const v = url.searchParams.get(k) ?? ""; return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : ""; };
  const from = day("from");
  const to = day("to");
  const service = SERVICES.find((item) => item.slug === url.searchParams.get("service"))?.slug;
  const status = url.searchParams.get("status");
  const includeArchived = status === "archived" || status === "all";
  const clients = getClients({ includeArchived })
    .filter((client) => status !== "archived" || client.archived)
    .filter((client) => !service || client.services.includes(service))
    .filter((client) => (!from || client.since.slice(0, 10) >= from) && (!to || client.since.slice(0, 10) <= to))
    .filter((client) => !search || [client.company, client.name, client.email, client.sector]
      .some((value) => value.toLocaleLowerCase().includes(search)));

  const header = ["Company", "Contact", "Email", "Phone", "Sector", "Services", "Status", "Live projects", "Outstanding NGN", "Client since"];
  const rows = clients.map((client) => {
    const owed = getInvoicesFor(client.id)
      .filter((invoice) => invoice.status !== "Draft")
      .reduce((sum, invoice) => sum + invoiceTotals(invoice).due, 0);
    const live = getProjectsFor(client.id).filter((project) => project.stage !== "Delivered").length;
    return [
      client.company, client.name, client.email, client.phone, client.sector,
      client.services.map((slug) => SERVICES.find((item) => item.slug === slug)?.short ?? slug).join("; "),
      client.archived ? "Archived" : "Active", live, (owed / 100).toFixed(2), client.since,
    ];
  });
  return new NextResponse(csvBody([header, ...rows]), {
    headers: CSV_HEADERS("wdc-clients.csv"),
  });
}
