import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { isAdminCapture } from "@/lib/admin/capture";

export function proxy(request: NextRequest) {
  if (isAdminCapture(request.headers)) {
    return NextResponse.next();
  }
  if (getSessionCookie(request, { cookiePrefix: "wdc" })) {
    return NextResponse.next();
  }
  const login = new URL("/login", request.url);
  login.searchParams.set("redirect", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/admin/:path*"] };
