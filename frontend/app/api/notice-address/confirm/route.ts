import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { audit } from "@/lib/admin/store";
import { syncStore } from "@/lib/admin/persist";
import { callerKey, rateLimit } from "@/lib/rate-limit";
import { dropNotice, matchNotice } from "@/lib/notice-address";
import { writeSetting } from "@/lib/settings/store";

export const dynamic = "force-dynamic";

/**
 * Confirming a new "Replies go to" address, by POST from the page the email's
 * link opens (a GET never confirms: link scanners open every link). The token
 * is the permission, with no session, because the person who reads the new
 * inbox need not be able to sign in. It fails closed: anything but a live,
 * matching token changes nothing.
 *
 * The limit is abuse control on one instance's memory, not a quota: a token is
 * 32 random bytes, so guessing is not the threat it would slow.
 */
export async function POST(request: NextRequest) {
  const back = (q: string) => NextResponse.redirect(new URL(`/confirm-notice-address?${q}`, request.nextUrl), 303);
  if (!rateLimit(callerKey(request, "notice-confirm"), 10, 10 * 60_000).ok) return back("busy=1");
  const fd = await request.formData().catch(() => null);
  const token = String(fd?.get("t") ?? "");
  try {
    await syncStore();
    const pending = await matchNotice(token);
    if (!pending) return back("bad=1");
    await writeSetting("mail.replyTo", pending.to, `${pending.by} (confirmed by email)`);
    await dropNotice("Confirmation link");
    audit({ actor: "Confirmation link", kind: "setting", subjectId: "mail.replyTo", subject: "Replies go to", action: `confirmed ${pending.to} for studio notices and replies` });
    revalidatePath("/admin/settings/email");
    return back("done=1");
  } catch {
    return back("error=1");
  }
}
