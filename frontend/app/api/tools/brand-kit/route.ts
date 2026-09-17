import { NextResponse, type NextRequest } from "next/server";
import { buildBrandKit, type BrandKitFailure } from "@/lib/brand-kit";
import { callerKey, rateLimit } from "@/lib/rate-limit";

/**
 * The brand asset pack at /tools/brand-kit: an uploaded logo in, a palette,
 * a contrast grid and a favicon set out. See `lib/brand-kit.ts` for why
 * nothing here is stored.
 *
 * NODE RUNTIME, EXPLICITLY: `sharp` is a native addon and does not run on
 * the edge runtime.
 */
export const runtime = "nodejs";
export const maxDuration = 30;

const LIMIT = 8;
const WINDOW_MS = 60_000;
/** Matches `MAX_UPLOAD_BYTES` in `lib/brand-kit.ts`; checked here first so an
 *  oversized upload is refused before its full body is even read. */
const MAX_BYTES = 8 * 1024 * 1024;

function explain(reason: BrandKitFailure) {
  switch (reason) {
    case "too-large":
      return "That file is over 8MB. Export a smaller version of the logo and try again.";
    case "unsupported-format":
      return "We can read PNG, JPEG, WebP, GIF, AVIF and SVG. Export the logo as one of those.";
    case "too-big":
      return "That image's dimensions are larger than this tool works with. A logo does not need to be that large -- try a smaller export.";
    default:
      return "We could not read that as an image. Try a different file.";
  }
}

export async function POST(request: NextRequest) {
  const limit = rateLimit(callerKey(request, "tools-brand-kit"), LIMIT, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Please wait a moment before trying another logo." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES + 64_000 /* form-data framing overhead */) {
    return NextResponse.json({ error: explain("too-large") }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "That upload did not arrive in one piece. Try again." }, { status: 400 });
  }

  const file = form.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a logo file first." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: explain("too-large") }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const built = await buildBrandKit(buffer);
  if (!built.ok) {
    return NextResponse.json({ error: explain(built.reason) }, { status: 422 });
  }

  return NextResponse.json(built.result, { headers: { "cache-control": "no-store" } });
}
