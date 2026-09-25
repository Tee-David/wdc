import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requestOriginIsAllowed } from "@/lib/onboarding-server";
import { callerKey, rateLimit } from "@/lib/rate-limit";
import { presignPut, r2Config } from "@/lib/r2";
import { customFormBySlug } from "@/lib/forms/custom";
import { FILE_MAX_BYTES, FILE_TYPES } from "@/lib/forms/custom-def";

/**
 * ONE FILE FOR A FORM BUILT IN THE ADMIN: a presigned PUT, good for five
 * minutes, to a key of our choosing under this form's own folder. The type is
 * decided from the extension against the form's list, never from what the
 * browser says. Only a live form with a file question can sign anything.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!requestOriginIsAllowed(request)) return NextResponse.json({ error: "This request could not be verified." }, { status: 403 });
  const limit = rateLimit(callerKey(request, "custom-form-upload"), 20, 10 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: "Too many uploads at once. Give it a minute." }, { status: 429 });

  const { slug } = await params;
  const row = await customFormBySlug(slug).catch(() => null);
  if (!row?.published || row.status !== "live" || !row.published.fields.some((f) => f.type === "file")) {
    return NextResponse.json({ error: "This form does not take files." }, { status: 404 });
  }
  let body: { filename?: unknown; size?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "The request could not be read." }, { status: 400 }); }
  const filename = typeof body.filename === "string" ? body.filename.slice(0, 200) : "";
  const size = typeof body.size === "number" ? body.size : -1;
  const ext = filename.match(/\.([a-zA-Z0-9]{1,8})$/)?.[1]?.toLowerCase() ?? "";
  const contentType = FILE_TYPES[ext];
  if (!filename || !contentType) return NextResponse.json({ error: "That file type is not one this form takes." }, { status: 415 });
  if (!(size > 0) || size > FILE_MAX_BYTES) return NextResponse.json({ error: `Files need to be ${FILE_MAX_BYTES / 1024 / 1024}MB or smaller.` }, { status: 413 });

  const config = r2Config();
  if (!config.ok) return NextResponse.json({ error: "Uploads are not available right now. Tick the box below and email the file to us instead." }, { status: 503 });
  const key = `forms/${row.slug}/${Date.now().toString(36)}-${randomUUID().slice(0, 8)}.${ext}`;
  const signed = presignPut({ config: config.config, key, contentType });
  return NextResponse.json({ url: signed.url, key: signed.key, contentType });
}
