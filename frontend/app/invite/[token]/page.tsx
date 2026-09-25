import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { authViewport } from "@/components/auth/login-route";
import { InviteForm } from "@/components/auth/invite-form";
import { invitationForToken, invitationsConfigured, inviteState } from "@/lib/invitations";
import { getClient } from "@/lib/admin/store";
import { persistSoon, syncStore } from "@/lib/admin/persist";

export const metadata: Metadata = { title: "Accept your invitation", robots: { index: false, follow: false } };
export const viewport = authViewport;
export const dynamic = "force-dynamic";

const GONE: Record<string, { title: string; body: string }> = {
  invalid: { title: "This link is not valid", body: "Ask whoever invited you to send a new invitation." },
  redeemed: { title: "This invitation has been used", body: "The account it created is ready. Log in with it." },
  revoked: { title: "This invitation was withdrawn", body: "Ask whoever invited you to send a new one." },
  expired: { title: "This invitation has expired", body: "Invitations last a week. Ask whoever invited you to send a new one." },
  unavailable: { title: "Invitations are not available", body: "The account database is not connected on this deployment." },
};

/**
 * Where an emailed invitation lands. Read on the server, so the page says
 * what the invitation is -- and which address it is for -- in the first
 * response, and a spent or withdrawn link says so before anybody types.
 */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  await syncStore();
  persistSoon();
  const { token } = await params;
  let state: string = "unavailable";
  let invite = null;
  if (invitationsConfigured()) {
    try {
      invite = await invitationForToken(token);
      state = invite ? inviteState(invite) : "invalid";
    } catch {
      state = "unavailable";
    }
  }
  const demo = process.env.NEXT_PUBLIC_AUTH_DEMO === "true";

  if (!invite || state !== "pending") {
    const gone = GONE[state] ?? GONE.invalid;
    return (
      <AuthShell demo={demo}>
        <div className="lx">
          <div className="lx__step" data-dir="1">
            <h1 className="lx__heading">{gone.title}</h1>
            <p className="lx__sub">{gone.body}</p>
            <Link href="/login" className="au-btn au-btn--primary" data-awake="true">Go to log in</Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell demo={demo}>
      <InviteForm
        token={token}
        email={invite.email}
        name={invite.name}
        role={invite.role}
        invitedBy={invite.invitedBy}
        google={invite.role === "staff" && Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)}
        company={invite.clientId ? getClient(invite.clientId)?.company ?? null : null}
        expires={new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Lagos" }).format(new Date(invite.expiresAt))}
      />
    </AuthShell>
  );
}
