import { NextResponse } from "next/server";
import { getAdminRequest } from "@/lib/admin/session";
import { getClient, getInvoices } from "@/lib/admin/store";
import { invoiceStatus, invoiceTotals, type InvoiceStatus } from "@/lib/admin/types";
import { csvBody, CSV_HEADERS } from "@/lib/admin/csv";

export const dynamic = "force-dynamic";

const STATUSES: InvoiceStatus[] = ["Draft", "Sent", "Part paid", "Paid", "Overdue", "Void"];

/**
 * The same list the Money screen's Invoices panel shows, as a CSV --
 * mirroring `/admin/clients/export`, including the filters: opened from the
 * panel's own "Export CSV" link, it carries whatever search, status and sort
 * the panel is currently showing, so the download matches the screen rather
 * than always being everything.
 */
export async function GET(request: Request) {
  const { session } = await getAdminRequest();
  if (!session?.user || (session.user as typeof session.user & { role?: string }).role !== "owner") {
    return new NextResponse("Not found", { status: 404 });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("q")?.trim().toLocaleLowerCase() ?? "";
  const statusParam = url.searchParams.get("status");
  const status = STATUSES.includes(statusParam as InvoiceStatus) ? (statusParam as InvoiceStatus) : null;

  const rows = getInvoices()
    .map((invoice) => ({ invoice, client: getClient(invoice.clientId), computed: invoiceStatus(invoice) }))
    .filter(({ computed }) => !status || computed === status)
    .filter(({ invoice, client }) => !search
      || invoice.number.toLocaleLowerCase().includes(search)
      || (client?.company ?? "").toLocaleLowerCase().includes(search))
    .map(({ invoice, client, computed }) => {
      const t = invoiceTotals(invoice);
      return [
        invoice.number, client?.company ?? "Unknown", computed, invoice.due,
        (t.total / 100).toFixed(2), (invoice.paid / 100).toFixed(2), (t.due / 100).toFixed(2),
      ];
    });

  const header = ["Number", "Client", "Status", "Due", "Total NGN", "Paid NGN", "Owed NGN"];
  return new NextResponse(csvBody([header, ...rows]), {
    headers: CSV_HEADERS("wdc-invoices.csv"),
  });
}
