import { NextResponse, type NextRequest } from "next/server";
import { unsubscribe, unsubscribeTokenValid } from "@/lib/newsletter";

export const dynamic = "force-dynamic";

/**
 * Leaving the newsletter, by POST only.
 *
 * TWO CALLERS. A mail client's one-click unsubscribe (RFC 8058) posts
 * `List-Unsubscribe=One-Click` to the link in the header, which carries the
 * address and its signature in the query. The confirmation page posts a form
 * with the same two fields. A GET never unsubscribes anybody: link scanners
 * and previewers open every link in an inbox.
 *
 * The signature is the permission. No session, and no way to take somebody
 * else off the list without the link they were sent.
 */
export async function POST(request: NextRequest) {
  const url = request.nextUrl;
  let email = url.searchParams.get("e") ?? "";
  let token = url.searchParams.get("t") ?? "";
  const type = request.headers.get("content-type") ?? "";
  let fromPage = false;
  if (type.includes("application/x-www-form-urlencoded") || type.includes("multipart/form-data")) {
    const fd = await request.formData().catch(() => null);
    if (fd?.get("e")) { email = String(fd.get("e")); token = String(fd.get("t") ?? ""); fromPage = true; }
  }
  if (!unsubscribeTokenValid(email, token)) {
    return fromPage
      ? NextResponse.redirect(new URL("/unsubscribe?bad=1", url), 303)
      : NextResponse.json({ error: "That link is not valid." }, { status: 400 });
  }
  try { await unsubscribe(email); } catch {
    return fromPage
      ? NextResponse.redirect(new URL("/unsubscribe?error=1", url), 303)
      : NextResponse.json({ error: "Please try again shortly." }, { status: 503 });
  }
  /* The same answer whether they were on the list or not. */
  return fromPage ? NextResponse.redirect(new URL("/unsubscribe?done=1", url), 303) : NextResponse.json({ ok: true });
}
