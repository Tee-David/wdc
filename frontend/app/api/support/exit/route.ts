import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { endSupportView } from "@/lib/users/support";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return NextResponse.json({ error: "This request is not allowed." }, { status: 403 });
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  try { await endSupportView(session); } catch {
    return NextResponse.redirect(new URL(session ? "/admin/users?notice=support-ended-audit-pending" : "/login", request.url), 303);
  }
  return NextResponse.redirect(new URL(session ? "/admin/users?notice=support-ended" : "/login", request.url), 303);
}
