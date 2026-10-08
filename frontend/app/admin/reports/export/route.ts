import { NextResponse, type NextRequest } from "next/server";
import { allow } from "@/lib/admin/guard";
import { csvBody, CSV_HEADERS } from "@/lib/admin/csv";
import { syncStore } from "@/lib/admin/persist";
import { byMethod, byMonth, expensesByCategory, readPeriod, topClients } from "@/lib/admin/reports";

export const dynamic = "force-dynamic";

/** The Reports page as a CSV for the same days. Money is the owner's; a refusal is a 404. Amounts are in naira. */
export async function GET(request: NextRequest) {
  if (await allow("exports") || await allow("money")) return new NextResponse("Not found", { status: 404 });
  await syncStore();
  const p = readPeriod({ from: request.nextUrl.searchParams.get("from") ?? undefined, to: request.nextUrl.searchParams.get("to") ?? undefined });
  const n = (kobo: number) => (kobo / 100).toFixed(2);
  const rows: (string | number)[][] = [
    [`WDC report ${p.from} to ${p.to}`], [],
    ["Month", "Invoiced", "Collected", "Spent", "Net"],
    ...byMonth(p).map((m) => [m.label, n(m.invoiced), n(m.collected), n(m.spent), n(m.net)]), [],
    ["Client", "Collected"], ...topClients(p, 50).map((c) => [c.name, n(c.amount)]), [],
    ["Payment method", "Collected"], ...byMethod(p).map((m) => [m.method, n(m.amount)]), [],
    ["Expense category", "Spent"], ...expensesByCategory(p).map((c) => [c.category, n(c.amount)]),
  ];
  return new NextResponse(csvBody(rows), { headers: CSV_HEADERS(`wdc-report-${p.from}-to-${p.to}.csv`) });
}
