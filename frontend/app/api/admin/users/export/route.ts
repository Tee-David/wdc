import { NextRequest, NextResponse } from "next/server";
import { usersOwner } from "@/lib/users/authorize";
import { invitationsPage, userFilter, usersPage } from "@/lib/users/manage";
import { userCsv } from "@/lib/users/export";
import { db } from "@/lib/db/pool";

export async function GET(request: NextRequest) {
  try {
    const actor = await usersOwner("read");
    const format = request.nextUrl.searchParams.get("format");
    if (format !== "csv" && format !== "json") return NextResponse.json({ error: "Choose CSV or JSON." }, { status: 400 });
    const f = userFilter(Object.fromEntries(request.nextUrl.searchParams));
    const scope = request.nextUrl.searchParams.get("scope");
    if (scope !== "page" && scope !== "filtered" && scope !== "selected") return NextResponse.json({ error: "Choose this page or filtered results." }, { status: 400 });
    const result = f.tab === "invitations" ? await invitationsPage(f, scope === "filtered" ? 1001 : undefined) : await usersPage(f, scope === "filtered" ? 1001 : undefined);
    if (scope === "filtered" && result.total > 1000) return NextResponse.json({ error: "Narrow your filters to at most 1,000 results, or export this page." }, { status: 422 });
        const ids = [...new Set((request.nextUrl.searchParams.get("ids") ?? "").split(",").filter(Boolean))];
    if (scope === "selected" && (!ids.length || ids.length > 100 || ids.some(id => !/^[\w-]{1,160}$/.test(id)))) return NextResponse.json({ error: "Select between one and 100 rows on this page." }, { status: 400 });
    // Selection is bounded to the authorized, filtered current page; no arbitrary ID lookup.
    const rows = scope === "selected" ? result.rows.filter(row => ids.includes(row.id)) : result.rows;
    if (scope === "selected" && rows.length !== ids.length) return NextResponse.json({ error: "Selection changed. Refresh and select the rows again." }, { status: 409 });
    await db.query(`INSERT INTO user_security_events(actor_id,target_id,event,detail) VALUES($1,$1,'users-export',$2)`, [actor.user.id, `${f.tab}; ${rows.length} rows; ${format}`]);
    return new NextResponse(format === "json" ? JSON.stringify(rows, null, 2) : userCsv(rows), { headers: { "Content-Type": format === "json" ? "application/json" : "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="wdc-${f.tab}.${format}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return NextResponse.json({ error: "Export could not be authorized or loaded. Exit support view if active, then retry as an owner." }, { status: 403 });
  }
}
