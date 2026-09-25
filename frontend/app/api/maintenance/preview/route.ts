import { NextRequest, NextResponse } from "next/server";
import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { maintenance } from "@/lib/maintenance";
import { maintenanceDesign, renderMaintenancePage } from "@/lib/maintenance-page/render";
import { templateById, type TemplateId } from "@/lib/maintenance-page/registry";

export const dynamic = "force-dynamic";

/**
 * A maintenance template, drawn for an admin to look at.
 *
 * Any template, whether or not it is the chosen one and whether or not the
 * site is in maintenance: with the saved message and time when maintenance is
 * on, and sample times when it is off. The form in it saves nothing.
 *
 * FAILS CLOSED, and quietly. Anybody without the settings permission gets a
 * plain 404, the same as a page that does not exist, so this says nothing
 * about which templates there are to somebody who should not be asking.
 */
export async function GET(request: NextRequest) {
  if (!can(await adminRole(), "settings")) return new NextResponse("Not found", { status: 404 });
  const design = await maintenanceDesign({ fresh: true });
  const wanted = templateById(request.nextUrl.searchParams.get("template"))?.id ?? design.template;
  const html = await renderMaintenancePage({
    m: await maintenance({ fresh: true }),
    design,
    preview: { template: wanted as TemplateId, href: (id) => `/api/maintenance/preview?template=${id}` },
  });
  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
