import { NextResponse, type NextRequest } from "next/server";
import { nudgesOffTokenValid, switchNudgesOff } from "@/lib/onboarding-nudge";

export const dynamic = "force-dynamic";

/**
 * The one tap link at the foot of a reminder: stop reminding about THIS draft.
 * Signed, so it cannot be forged or aimed at somebody else's draft, and it
 * fails closed when links cannot be signed. It answers with a small plain page
 * rather than JSON, because a person taps it from their inbox.
 */
const page = (title: string, body: string, status = 200) =>
  new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title>` +
    `<style>body{font:16px/1.5 system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 16px;color:#111}h1{font-size:1.4rem}</style></head>` +
    `<body><h1>${title}</h1><p>${body}</p></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  );

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("d") ?? "";
  const token = request.nextUrl.searchParams.get("t") ?? "";
  if (!nudgesOffTokenValid(id, token)) return page("That link did not work", "It may be incomplete. Your saved form is not affected.", 400);
  try {
    await switchNudgesOff(id);
  } catch {
    return page("We could not do that just now", "Please try the link again in a little while.", 503);
  }
  return page("No more reminders", "We will not remind you about this form again. Your answers are still saved, and your link still works until it expires.");
}
