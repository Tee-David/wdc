import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { isAdminCapture } from "@/lib/admin/capture";
import { maintenance, maintenancePage, PASS_COOKIE, passValid, retryAfter } from "@/lib/maintenance";

/**
 * Two jobs. The admin and the portal need a session cookie (the layouts
 * check the role). Every other page matched below answers 503 while
 * maintenance mode is on, unless the visitor holds a pass (lib/maintenance.ts).
 */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path.startsWith("/admin") || path.startsWith("/portal")) {
    /* THE PATH ASKED FOR, handed to the layouts: a cookie that is present but
       expired passes here and is refused there, and the layout needs the
       address to send the person back to after they sign in. */
    const forward = new Headers(request.headers);
    forward.set("x-wdc-path", request.nextUrl.pathname + request.nextUrl.search);
    const through = () => NextResponse.next({ request: { headers: forward } });
    if (isAdminCapture(request.headers)) return through();
    if (getSessionCookie(request, { cookiePrefix: "wdc" })) return through();
    const login = new URL("/login", request.url);
    login.searchParams.set("redirect", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }

  const m = await maintenance();
  if (!m.on || passValid(m, request.cookies.get(PASS_COOKIE)?.value)) return NextResponse.next();
  return new NextResponse(await maintenancePage(m), {
    status: 503,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "retry-after": String(retryAfter(m)),
      "x-robots-tag": "noindex",
      "cache-control": "no-store",
    },
  });
}

/*
 * THE MATCHER IS THE ALLOW-LIST. Anything not matched never reaches the
 * maintenance check: every /api route (the Paystack webhook, sign-in, the
 * forms), /pay, /i, /r, /q, /unsubscribe, the sign-in pages, Next's own
 * files, and anything with a file extension.
 */
export const config = {
  matcher: [
    "/admin/:path*",
    "/portal/:path*",
    "/((?!api/|_next/|admin|portal|login|signed-in|forgot-password|reset-password|invite/|pay/|i/|r/|q/|unsubscribe|.*\\..*).*)",
  ],
};
