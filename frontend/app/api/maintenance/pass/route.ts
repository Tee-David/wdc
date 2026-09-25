import { NextRequest, NextResponse } from "next/server";
import { adminRole } from "@/lib/admin/guard";
import { linkValid, maintenance, PASS_COOKIE, passFor } from "@/lib/maintenance";

/**
 * A pass through maintenance mode, as a cookie, then on to the home page.
 *
 * With `?t=` it is the reviewer's link, checked against its signature; without
 * it the visitor must be signed in as owner or staff. Anything else is sent
 * to the home page without a pass, which in maintenance is the 503: nothing
 * here says whether a token was close.
 */
export async function GET(request: NextRequest) {
  const home = NextResponse.redirect(new URL("/", request.url));
  const m = await maintenance({ fresh: true });
  if (!m.on) return home;
  const token = request.nextUrl.searchParams.get("t");
  const allowed = token ? linkValid(m, token) : Boolean(await adminRole());
  const pass = passFor(m);
  if (!allowed || !pass) return home;
  home.cookies.set(PASS_COOKIE, pass, {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 7 * 24 * 60 * 60,
    secure: process.env.NODE_ENV === "production",
  });
  return home;
}
