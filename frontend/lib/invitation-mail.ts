import "server-only";

import { db } from "@/lib/db/pool";
import { SITE_URL } from "@/lib/site";
import { accountInvitationEmail } from "@/lib/email-templates";
import { INVITE_TTL_DAYS, type Invitation } from "@/lib/invitations";
import { secretKey, sendLogged } from "@/lib/outbox";

export const inviteUrl = (token: string) => new URL(`/invite/${token}`, SITE_URL).toString();

/**
 * The invitation, as mail. Called from behind the response: the invitation
 * row already exists, so a send that fails leaves a row saying so in the
 * outbox and a "send again" on the screen that made it.
 *
 * Keyed to the link's hash, never the link: the outbox is readable by the
 * studio and must not be a way into somebody's new account.
 */
export async function sendInvitationEmail(invitation: Invitation, token: string) {
  const url = inviteUrl(token);
  let result: "sent" | "duplicate";
  try {
  result = await sendLogged(
    {
      to: invitation.email,
      ...accountInvitationEmail({
        name: invitation.name.trim().split(/\s+/)[0] || undefined,
        email: invitation.email,
        url,
        role: invitation.role === "client" ? "client" : "staff",
        invitedBy: invitation.invitedBy,
        expiresInDays: INVITE_TTL_DAYS,
      }),
    },
    {
      summary: invitation.role !== "client" ? "An invitation to the studio admin." : "An invitation to the project portal.",
      dedupeKey: secretKey("invitation", url),
      by: invitation.invitedBy,
      clientId: invitation.clientId ?? undefined,
    },
  );
  } catch (error) {
    const code = (error as { code?: string }).code;
    const failed = code === "EAUTH" || code === "EENVELOPE" || (error instanceof Error && error.message.includes("SMTP is not configured"));
    await db.query(`UPDATE user_invitation_delivery SET state=$2,updated_at=now(),error=$3 WHERE invitation_id=$1`, [invitation.id, failed ? "failed" : "uncertain", failed ? "Mail server refused the invitation. Review email settings, then send again." : "Delivery outcome is uncertain. Check the email log before sending again."]);
    throw new Error("Invitation email did not confirm acceptance.");
  }
  // A failed status write must not relabel an already accepted email as failed.
  await db.query(`UPDATE user_invitation_delivery SET state=$2,updated_at=now(),error=NULL WHERE invitation_id=$1`, [invitation.id, result === "sent" ? "accepted" : "uncertain"]);
}
