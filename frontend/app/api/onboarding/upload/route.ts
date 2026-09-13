import { NextRequest, NextResponse } from "next/server";
import { cookieToken, draftFromToken, requestOriginIsAllowed } from "@/lib/onboarding-server";
import { callerKey, rateLimit } from "@/lib/rate-limit";
import { presignPut, r2Config, uploadKey } from "@/lib/r2";

/**
 * Authorises ONE upload, to a key of our choosing, for five minutes.
 *
 * The browser never gets R2 credentials; it gets a presigned PUT that is good
 * for a single object of a single declared type. Every decision that matters
 * -- where the file lands, what it may be, how big, how long the permission
 * lasts -- is made here. See lib/r2.ts for why it is presigned rather than
 * streamed through this route.
 *
 * A client may only upload against a draft they already hold the cookie for,
 * so an upload is always attached to a real onboarding record rather than
 * being an open door to the bucket.
 */

const MB = 1024 * 1024;
const MAX_BYTES = 25 * MB;

/* Extensions and the types they are allowed to arrive as. A browser's reported
   MIME type is a hint, not a fact, so both are checked and the SIGNED type is
   the one from this table -- not the one the client sent. */
const ALLOWED: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  ai: "application/postscript",
  eps: "application/postscript",
  psd: "image/vnd.adobe.photoshop",
  zip: "application/zip",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

export async function POST(request: NextRequest) {
  if (!requestOriginIsAllowed(request)) {
    return NextResponse.json({ error: "This request could not be verified." }, { status: 403 });
  }

  /* Eight files is the ceiling the dropzone enforces, so twenty signings in
     ten minutes covers retries and a change of mind without leaving the
     signing endpoint open to being called in a loop. */
  const limit = rateLimit(callerKey(request, "onboarding-upload"), 20, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many uploads at once. Give it a minute and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const token = cookieToken(request);
  const draft = token ? await draftFromToken(token) : null;
  if (!draft) {
    return NextResponse.json(
      { error: "Start the form before adding files, so we know which project they belong to." },
      { status: 401 },
    );
  }
  if (draft.status === "submitted") {
    return NextResponse.json({ error: "This onboarding form has already been submitted." }, { status: 409 });
  }

  let body: { filename?: unknown; size?: unknown; report?: unknown };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "The request could not be read." }, { status: 400 }); }

  /* A FAILURE REPORT, NOT A REQUEST FOR A GRANT.
     The browser cannot see why it refused a cross-origin PUT, so the page
     cannot tell a blocked request from a dropped one and neither could we.
     This tells us which one it was from the only place that knows anything:
     the presign succeeded, so the credentials and the draft are fine, and a
     transport failure after that is almost always the bucket's CORS policy
     not naming this origin. Cheap, authenticated (the draft cookie was
     already checked above) and it never issues a URL. */
  if (body.report === "transport-failed") {
    console.error(
      "[r2] presigned PUT never reached the bucket. Check the R2 bucket's CORS policy allows PUT from",
      request.headers.get("origin") ?? "(no origin header)",
      "- file:",
      typeof body.filename === "string" ? body.filename.slice(0, 120) : "(unnamed)",
    );
    return new NextResponse(null, { status: 204 });
  }

  const filename = typeof body.filename === "string" ? body.filename.slice(0, 200) : "";
  const size = typeof body.size === "number" && Number.isFinite(body.size) ? body.size : -1;

  if (!filename) {
    return NextResponse.json({ error: "That file has no name we can use." }, { status: 422 });
  }
  if (size < 0 || size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Files need to be ${MAX_BYTES / MB}MB or smaller.` },
      { status: 413 },
    );
  }

  const ext = filename.match(/\.([a-zA-Z0-9]{1,8})$/)?.[1]?.toLowerCase() ?? "";
  const contentType = ALLOWED[ext];
  if (!contentType) {
    return NextResponse.json(
      { error: "That file type is not one we can take. Images, PDFs, design files and zips." },
      { status: 415 },
    );
  }

  const config = r2Config();
  if (!config.ok) {
    /* Fail closed and say so plainly in the log, while the client gets a
       message about us rather than about them -- this is our misconfiguration,
       not their bad file. */
    console.error("R2 upload unavailable; missing env:", config.missing.join(", "));
    return NextResponse.json(
      { error: "File uploads are unavailable right now. Everything else on the form still saves." },
      { status: 503 },
    );
  }

  const key = uploadKey(draft.id ?? "draft", filename);
  const signed = presignPut({ config: config.config, key, contentType });

  return NextResponse.json({
    url: signed.url,
    key: signed.key,
    publicUrl: signed.publicUrl,
    contentType,
    expiresIn: signed.expiresIn,
  });
}
