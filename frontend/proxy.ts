import { NextRequest, NextResponse } from "next/server";
import { SUPPORT_COOKIE, SUPPORT_STAFF_COOKIE, supportHome, supportKind, supportRequestAllowed } from "@/lib/users/support-policy";
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
  /* A SUPPORT VIEW (client or staff) READS ALLOW-LISTED PAGES AND NOTHING ELSE.
     Decided from the cookie NAMES alone: the proxy never opens the database.
     Whether the cookie is still good is the layouts' question, answered from
     persisted truth on every request (lib/users/support.ts). */
  const kind = supportKind(request.cookies.has(SUPPORT_COOKIE), request.cookies.has(SUPPORT_STAFF_COOKIE));
  if (kind && !supportRequestAllowed(path, request.method, kind)) {
    const home = supportHome(kind);
    if (home && (request.method === "GET" || request.method === "HEAD") && !path.startsWith("/api/")) return NextResponse.redirect(new URL(`${home}?notice=support-read-only`, request.url), 303);
    return NextResponse.json({ error: "Exit the read-only support view before making changes." }, { status: 403 });
  }
  // These routes remain available during maintenance; they now also pass the support guard.
  if (/^\/(api(?:\/|$)|login(?:\/|$)|signed-in(?:\/|$)|forgot-password(?:\/|$)|reset-password(?:\/|$)|invite(?:\/|$)|pay(?:\/|$)|i(?:\/|$)|r(?:\/|$)|q(?:\/|$)|f(?:\/|$)|onboarding(?:\/|$)|unsubscribe(?:\/|$))/.test(path)) return NextResponse.next();
  if (path.startsWith("/admin") || path.startsWith("/portal")) {
    /* THE PATH ASKED FOR, handed to the layouts: a cookie that is present but
       expired passes here and is refused there, and the layout needs the
       address to send the person back to after they sign in. */
    const forward = new Headers(request.headers);
    forward.set("x-wdc-path", request.nextUrl.pathname + request.nextUrl.search);
    const through = () => NextResponse.next({ request: { headers: forward } });
    // Even a lost original session must reach the support-unavailable screen and its Exit action.
    if (path.startsWith("/portal") && request.cookies.has(SUPPORT_COOKIE)) return through();
    // The same for the staff view on /admin: an ended view still shows its Exit screen.
    if (path.startsWith("/admin") && request.cookies.has(SUPPORT_STAFF_COOKIE)) return through();
    if (isAdminCapture(request.headers)) return through();
    if (getSessionCookie(request, { cookiePrefix: "wdc" })) return through();
    /* A SAVE FROM A PAGE THAT WAS ALREADY OPEN. Redirecting a server action
       to /login navigates the whole page and throws away what was typed in
       the dialog. Let it reach the action instead: every admin action checks
       the session itself and fails closed (lib/admin/guard.ts), and its
       refusal offers a sign-in in a new tab, so the form can be saved again. */
    if (request.method === "POST" && request.headers.has("next-action")) return through();
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
 * files, and anything with a file extension. Also /onboarding and /f/: a
 * client half-way through the brief, or following a resume link from their
 * email, is in the middle of something just as a payer is, and both forms'
 * APIs were already open, so the pages in front of them must be too.
 */
export const config = {
  matcher: [
    "/admin/:path*",
    "/portal/:path*",
    "/api/:path*",
    "/((?!_next/|.*\\..*).*)",
  ],
};
