import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { hydrateSettings } from "@/lib/settings/store";
import { getSetting } from "@/lib/admin/store";
import { db } from "@/lib/db/pool";
import { suppress } from "@/lib/contacts";
import { normaliseEmail } from "@/lib/newsletter";

export const dynamic = "force-dynamic";

/**
 * Delivery events from the mail service (Postmark, Brevo): a bounce or a spam
 * complaint puts the address on the suppression list at once; a soft bounce
 * counts, and the fifth suppresses. The address in the URL is a random code
 * kept in Settings; a wrong one does nothing (and says so the same way).
 */
const same = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

type Ev = { email: string; kind: "hard" | "soft" | "complaint"; why: string };

function parse(provider: string, b: Record<string, unknown>): Ev | null {
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  if (provider === "postmark") {
    const type = s(b.RecordType), email = s(b.Email) || s(b.Recipient);
    if (!email) return null;
    if (type === "SpamComplaint") return { email, kind: "complaint", why: "spam complaint" };
    if (type === "Bounce") return { email, kind: /soft|transient/i.test(s(b.Type)) ? "soft" : "hard", why: s(b.Description).slice(0, 200) || s(b.Type) };
    return null;
  }
  if (provider === "brevo") {
    const ev = s(b.event), email = s(b.email);
    if (!email) return null;
    if (ev === "spam" || ev === "complaint") return { email, kind: "complaint", why: "spam complaint" };
    if (ev === "hard_bounce" || ev === "blocked" || ev === "invalid_email") return { email, kind: "hard", why: s(b.reason).slice(0, 200) || ev };
    if (ev === "soft_bounce" || ev === "deferred") return { email, kind: "soft", why: s(b.reason).slice(0, 200) || ev };
    return null;
  }
  return null;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ provider: string; key: string }> }) {
  const { provider, key } = await params;
  await hydrateSettings();
  const wanted = getSetting("mail.eventsKey") ?? "";
  const reply = NextResponse.json({ ok: true });
  if (!wanted || !same(key, wanted)) return reply;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return reply; }
  const ev = parse(provider, body);
  if (!ev) return reply;
  const email = normaliseEmail(ev.email);
  try {
    if (ev.kind === "soft") {
      const r = await db.query<{ soft_bounces: number }>(`UPDATE contacts SET soft_bounces = soft_bounces + 1 WHERE email = $1 RETURNING soft_bounces`, [email]);
      if ((r.rows[0]?.soft_bounces ?? 0) >= 5) await suppress(email, "bounced", `five soft bounces: ${ev.why}`);
    } else await suppress(email, ev.kind === "complaint" ? "complained" : "bounced", ev.why);
  } catch { /* tables arrive with migrations 0045 and 0046 */ }
  return reply;
}
