import { NextResponse } from "next/server";
import { getAdminRequest } from "@/lib/admin/session";
import { getClient, getProject, getTicketMessages, getTickets } from "@/lib/admin/store";
import { csvBody, CSV_HEADERS } from "@/lib/admin/csv";
import { persistSoon, syncStore } from "@/lib/admin/persist";

export const dynamic = "force-dynamic";

/** Every client question as a CSV, filtered as the Support table was (Admin only, like every whole-table export). */
export async function GET(request: Request) {
  await syncStore();
  persistSoon();
  const { session } = await getAdminRequest();
  if (!session?.user || (session.user as typeof session.user & { role?: string }).role !== "owner") return new NextResponse("Not found", { status: 404 });
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "";
  const search = url.searchParams.get("q")?.trim().toLocaleLowerCase() ?? "";
  const words: Record<string, string> = { Open: "Waiting on us", Answered: "Answered", Closed: "Closed" };
  const rows = getTickets()
    .filter((t) => !status || t.status === status)
    .filter((t) => { const c = getClient(t.clientId); return !search || [t.subject, c?.company ?? "", c?.name ?? ""].some((v) => v.toLocaleLowerCase().includes(search)); })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((t) => {
      const c = getClient(t.clientId), msgs = getTicketMessages(t.id), first = msgs.find((m) => m.from === "studio");
      return [t.subject, c?.company ?? "", c?.name ?? "", words[t.status] ?? t.status, msgs.length, t.projectId ? getProject(t.projectId)?.title ?? "" : "", t.createdAt.slice(0, 16).replace("T", " "), first ? first.at.slice(0, 16).replace("T", " ") : "", t.updatedAt.slice(0, 16).replace("T", " ")];
    });
  return new NextResponse(csvBody([["Subject", "Company", "Contact", "Status", "Messages", "Project", "Asked", "First reply", "Last activity"], ...rows]), { headers: CSV_HEADERS("wdc-support-questions.csv") });
}
