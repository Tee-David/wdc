import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { actorName, owner } from "@/lib/admin/guard";
import { sameOrigin } from "@/lib/meetings/policy";
import { rateLimit } from "@/lib/rate-limit";
import { MAX_BYTES, checkRows, countBy, parseImport } from "@/lib/contacts-import";
import { commitImport, importLookups } from "@/lib/contacts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const fail = (error: string, status: number) => NextResponse.json({ ok: false, error }, { status, headers: { "Cache-Control": "no-store" } });

/**
 * IMPORT, IN TWO STEPS, BOTH READ ON THE SERVER.
 *
 *   step=check    parse the file, look every row up, say what each would do. Writes nothing.
 *   step=import   the same, again, then write the rows that pass. Needs confirmed=1 when any
 *                 of them says marketing = yes.
 *
 * A ROUTE, NOT A SERVER ACTION: an action's body is capped at 1 MB by default and the file
 * may be 2 MB. The route does what an action would: same-origin only (a missing Origin is
 * refused), the owner only, and a bounded read of the body before anything is parsed.
 * The rules themselves are lib/contacts-import.ts; this file only fetches the facts.
 */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request.headers.get("origin"), request.nextUrl.origin)) return fail("That request did not come from this site.", 403);
  const refused = await owner();
  if (refused) return fail(refused.message ?? "Sign in again, then retry.", 401);
  const by = await actorName();

  /* In one instance's memory (lib/rate-limit.ts): abuse control, not a quota. Checking is cheap and may be repeated; importing is the tight one. */
  const type = request.headers.get("content-type") ?? "";
  if (!type.startsWith("multipart/form-data")) return fail("Choose a CSV file.", 400);
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES + 64 * 1024) return fail("That file is over 2 MB. Split it and import the parts one at a time.", 413);
  let form: FormData;
  try {
    const reader = request.body?.getReader();
    if (!reader) return fail("Choose a CSV file.", 400);
    const parts: Uint8Array[] = []; let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BYTES + 64 * 1024) { await reader.cancel(); return fail("That file is over 2 MB. Split it and import the parts one at a time.", 413); }
      parts.push(value);
    }
    form = await new Response(Buffer.concat(parts), { headers: { "content-type": type } }).formData();
  } catch { return fail("That file could not be read.", 400); }

  const step = form.get("step") === "import" ? "import" : "check";
  const limit = step === "import" ? rateLimit(`contacts-import:${by}`, 6, 600_000) : rateLimit(`contacts-check:${by}`, 30, 600_000);
  if (!limit.ok) return fail(`Too many tries. Wait ${Math.ceil(limit.retryAfterSeconds / 60)} minute${limit.retryAfterSeconds > 90 ? "s" : ""} and try again.`, 429);

  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return fail("Choose a CSV file.", 400);
  if (file.size > MAX_BYTES) return fail("That file is over 2 MB. Split it and import the parts one at a time.", 413);
  const text = await file.text();
  if (text.startsWith("PK") || /\.xlsx?$/i.test(file.name)) return fail("That is an Excel file. In Excel choose Save As, then CSV (UTF-8), and add that file instead.", 422);

  const parsed = parseImport(text, file.size);
  if ("error" in parsed) return fail(parsed.error, 422);
  let results;
  try { results = checkRows(parsed.rows, await importLookups(parsed.rows)); } catch { return fail("The list could not be checked just now. Is migration 0045 applied (Settings › System)?", 503); }

  const counts = { new: countBy(results, "new"), update: countBy(results, "update"), refused: countBy(results, "refused") };
  const needsPermission = results.some((r) => r.verdict !== "refused" && r.marketing);

  if (step === "check") {
    /* Refused rows first: they are what a person has to fix. Capped, because the whole list could be 5,000 lines of JSON. */
    const shown = [...results.filter((r) => r.verdict === "refused"), ...results.filter((r) => r.verdict !== "refused")].slice(0, 200);
    return NextResponse.json(
      { ok: true, file: file.name.slice(0, 120), counts, needsPermission, total: results.length, rows: shown.map((r) => ({ n: r.n, email: r.email, verdict: r.verdict, why: r.why })) },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  if (needsPermission && form.get("confirmed") !== "1") return fail("Tick the box to confirm everyone marked marketing = yes agreed to hear from you.", 400);
  if (counts.new + counts.update === 0) return fail("There is nothing in that file to import.", 422);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  try {
    const done = await commitImport(results, { file: file.name.slice(0, 120), by, ip });
    revalidatePath("/admin/email");
    return NextResponse.json({ ok: true, added: done.added, updated: done.updated, refused: counts.refused }, { headers: { "Cache-Control": "no-store" } });
  } catch { return fail("The import could not finish just now. Nothing is lost: run it again and the rows already added become updates.", 503); }
}
