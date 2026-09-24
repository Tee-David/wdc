import "server-only";

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
  await sendLogged(
    {
      to: invitation.email,
      ...accountInvitationEmail({
        name: invitation.name.trim().split(/\s+/)[0] || undefined,
        email: invitation.email,
        url,
        role: invitation.role,
        invitedBy: invitation.invitedBy,
        expiresInDays: INVITE_TTL_DAYS,
      }),
    },
    {
      summary: invitation.role === "staff" ? "An invitation to the studio admin." : "An invitation to the project portal.",
      dedupeKey: secretKey("invitation", url),
      by: invitation.invitedBy,
      clientId: invitation.clientId ?? undefined,
    },
  );
}
