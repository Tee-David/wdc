import { NextResponse } from "next/server";
import { SERVICES } from "@/lib/services";
import { getAdminRequest } from "@/lib/admin/session";
import { getClient, getProjects } from "@/lib/admin/store";
import { HEALTH, STAGES } from "@/lib/admin/types";
import { csvBody, CSV_HEADERS } from "@/lib/admin/csv";
import { persistSoon, syncStore } from "@/lib/admin/persist";

export const dynamic = "force-dynamic";

/** The projects list as the screen filtered it. Owner only: the agreed budget is money. */
export async function GET(request: Request) {
  await syncStore();
  persistSoon();
  const { session } = await getAdminRequest();
  if (!session?.user || (session.user as typeof session.user & { role?: string }).role !== "owner") {
    return new NextResponse("Not found", { status: 404 });
  }
  const sp = new URL(request.url).searchParams;
  const needle = (sp.get("q") ?? "").trim().slice(0, 80).toLocaleLowerCase();
  const stage = STAGES.find((s) => s === sp.get("stage"));
  const service = SERVICES.find((s) => s.slug === sp.get("service"));
  const health = HEALTH.find((h) => h === sp.get("health"));
  const owner = sp.get("owner") ?? "";
  const list = getProjects().filter((p) =>
    (!needle || `${p.title} ${getClient(p.clientId)?.company ?? ""} ${p.owner}`.toLocaleLowerCase().includes(needle)) &&
    (!stage || p.stage === stage) && (!service || p.service === service.slug) && (!health || p.health === health) && (!owner || p.owner === owner));
  const header = ["Project", "Client", "Owner", "Service", "Stage", "Health", "Due", "Agreed budget NGN"];
  const rows = list.map((p) => [
    p.title, getClient(p.clientId)?.company ?? "", p.owner, SERVICES.find((s) => s.slug === p.service)?.short ?? p.service,
    p.stage, p.health, p.due ?? "", p.budget === null ? "" : (p.budget / 100).toFixed(2),
  ]);
  return new NextResponse(csvBody([header, ...rows]), { headers: CSV_HEADERS("wdc-projects.csv") });
}
