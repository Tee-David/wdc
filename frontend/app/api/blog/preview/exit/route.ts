import { draftMode } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

/** Leaves preview. A POST, because it changes what later requests see. */
export async function POST(request: NextRequest) {
  (await draftMode()).disable();
  const back = request.nextUrl.searchParams.get("to") ?? "/blog";
  const path = /^\/blog(\/[a-z0-9-]+)?$/.test(back) ? back : "/blog";
  return NextResponse.redirect(new URL(path, request.nextUrl.origin), 303);
}
