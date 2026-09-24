import { draftMode } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { postForPreview } from "@/lib/blog-db";
import { owner } from "@/lib/admin/guard";

/**
 * Opens a post on its real page, whatever its state, for the owner only.
 *
 * Draft mode is Next's own mechanism: it sets a signed bypass cookie and the
 * page renders from the table on that request instead of from the static
 * copy. The owner check is here, where the cookie is handed out, and again on
 * the page itself, so a bypass cookie on its own shows nobody a draft.
 */
export async function GET(request: NextRequest) {
  if (await owner()) return new NextResponse("Sign in to the admin to preview posts.", { status: 401 });

  const slug = request.nextUrl.searchParams.get("slug") ?? "";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return new NextResponse("No such post.", { status: 404 });
  let post;
  try { post = await postForPreview(slug); } catch { post = undefined; }
  if (!post) return new NextResponse("No such post.", { status: 404 });

  (await draftMode()).enable();
  return NextResponse.redirect(new URL(`/blog/${slug}`, request.nextUrl.origin), 307);
}
