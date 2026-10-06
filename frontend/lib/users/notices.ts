import "server-only";
import { db } from "@/lib/db/pool";
import { sendLogged } from "@/lib/outbox";
import { composeEmailHtml, emailP } from "@/lib/email-templates";

const descriptions: Record<string, string> = {
  rename: "Your display name was updated by a studio owner.",
  owner: "A studio owner gave your account owner access. Owner access includes finance, settings and user management.",
  staff: "A studio owner changed your account to staff access. Your previous sessions have ended.",
  deactivate: "A studio owner deactivated your account and ended your sessions. Contact the studio if you need access restored.",
  reactivate: "A studio owner reactivated your account. You can sign in again.",
  signout: "A studio owner ended your active sessions. You can sign in again.",
};

/** Claim one persisted intent. No cron or blind retry of ambiguous SMTP outcomes. */
export async function sendSecurityNotice(id: string) {
  const claim = await db.query<{ target_id: string; kind: string; attempts: number }>(`UPDATE user_security_notices SET state='sending',provider_started=false,attempts=attempts+1,updated_at=now() WHERE id=$1 AND state='queued' RETURNING target_id,kind,attempts`, [id]);
  const notice = claim.rows[0]; if (!notice) return;
  let providerStarted = false;
  let accepted = false;
  try {
  const recipient = await db.query<{ email: string; enabled: boolean }>(`SELECT u."email",coalesce(p.email_enabled,true) AS enabled FROM "user" u LEFT JOIN user_security_preferences p ON p.user_id=u."id" WHERE u."id"=$1`, [notice.target_id]);
  const person = recipient.rows[0];
  if (notice.kind === "recovery") {
    if (!person) throw new Error("Recovery account no longer exists.");
    const started = await db.query(`UPDATE user_security_notices SET provider_started=true,updated_at=now() WHERE id=$1 AND attempts=$2 AND state='sending' AND provider_started=false RETURNING id`, [id,notice.attempts]);
    if (!started.rowCount) return;
    providerStarted = true;
    const [{ auth }, { SITE_URL }] = await Promise.all([import("@/lib/auth"), import("@/lib/site")]);
    await auth.api.requestPasswordReset({ body: { email: person.email, redirectTo: new URL("/reset-password", SITE_URL).toString() } });
    accepted = true;
    await db.query(`UPDATE user_security_notices SET state='requested',updated_at=now() WHERE id=$1`, [id]);
    return;
  }
  if (!person?.enabled) { await db.query(`UPDATE user_security_notices SET state='skipped',updated_at=now() WHERE id=$1`, [id]); return; }
  const copy = descriptions[notice.kind];
  if (!copy) throw new Error("Unknown security notice kind.");
    const started = await db.query(`UPDATE user_security_notices SET provider_started=true,updated_at=now() WHERE id=$1 AND attempts=$2 AND state='sending' AND provider_started=false RETURNING id`, [id,notice.attempts]);
    if (!started.rowCount) return;
    providerStarted = true;
    const result = await sendLogged({ to: person.email, subject: "Your WDC account was updated", text: `${copy}\n\nIf you did not expect this change, contact the studio. You can switch off account-change emails in your account settings. Recovery links you request remain available.`, html: composeEmailHtml({ title: "Account updated", preheader: copy, heading: "Your account was updated", blocks: [emailP(copy), emailP("If you did not expect this change, contact the studio."), emailP("You can switch off account-change emails in your account settings. Recovery links you request remain available.")] }) }, { summary: "An account access or identity change.", dedupeKey: `user-security:${id}:${notice.attempts}`, by: "Account security" });
    accepted = result === "sent";
    await db.query(`UPDATE user_security_notices SET state=$2,updated_at=now() WHERE id=$1`, [id, accepted ? "accepted" : "uncertain"]);
  } catch (error) {
    if (accepted) throw error; // Never retry a persistence failure after SMTP acceptance.
    const code = (error as { code?: string }).code;
    const definite = !providerStarted || ["EAUTH", "EENVELOPE"].includes(code ?? "") || (error instanceof Error && error.message.includes("SMTP is not configured"));
    await db.query(`UPDATE user_security_notices SET state=$2,updated_at=now() WHERE id=$1 AND attempts=$3`, [id, definite ? "failed" : "uncertain",notice.attempts]);
  }
}
