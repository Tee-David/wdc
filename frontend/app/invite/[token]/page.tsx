import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { authViewport } from "@/components/auth/login-route";
import { InviteForm } from "@/components/auth/invite-form";
import { invitationForToken, invitationsConfigured, inviteState } from "@/lib/invitations";
import { getClient } from "@/lib/admin/store";
import { CONTACT_EMAIL } from "@/lib/site";
import { persistSoon, syncStore } from "@/lib/admin/persist";

export const metadata: Metadata = { title: "Accept your invitation", robots: { index: false, follow: false } };
export const viewport = authViewport;
export const dynamic = "force-dynamic";

const GONE: Record<string, { title: string; body: string }> = {
  invalid: { title: "This link is not valid", body: "It may have been copied only in part. Email us and we will send you a new invitation." },
  redeemed: { title: "Your account is ready", body: "This invitation has already made your account." },
  revoked: { title: "This invitation was withdrawn", body: "A newer one may be in your inbox. If not, email us and we will send one." },
  expired: { title: "This invitation has expired", body: "Invitations last a week. Email us and we will send you a new one." },
  unavailable: { title: "Invitations are not available", body: "The account database is not connected on this deployment. Email us and we will sort it out." },
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
            {/* ONE WAY FORWARD PER STATE. Someone whose invitation made their
                account logs in, and is told which address and that an emailed
                link needs no password; everyone else writes to us, with the
                address in plain sight rather than behind a button. */}
            {state === "redeemed" ? (
              <>
                {invite ? <p className="lx__sub">Log in as <b>{invite.email}</b>. If you chose to be emailed a link instead of a password, pick &ldquo;Email me a link&rdquo;; no password is needed.</p> : null}
                <Link href="/login" className="au-btn au-btn--primary" data-awake="true">Go to log in</Link>
              </>
            ) : (
              <>
                <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("A new invitation, please")}`} className="au-btn au-btn--primary" data-awake="true">Email us for a new invitation</a>
                <p className="lx__sub">{CONTACT_EMAIL} · Already have an account? <Link href="/login">Log in</Link></p>
              </>
            )}
          </div>
        </div>
      </AuthShell>
    );
  }

  /* Someone already signed in on this browser is told before accepting
     replaces them, not after. */
  const signedIn = await import("@/lib/auth")
    .then(async ({ auth }) => auth.api.getSession({ headers: await (await import("next/headers")).headers() }))
    .catch(() => null);
  const signedInAs = signedIn?.user?.email && signedIn.user.email.toLowerCase() !== invite.email.toLowerCase() ? signedIn.user.email : null;

  return (
    <AuthShell demo={demo}>
      <InviteForm
        signedInAs={signedInAs}
        token={token}
        email={invite.email}
        name={invite.name}
        role={invite.role === "client" ? "client" : "staff"}
        invitedBy={invite.invitedBy}
        google={invite.role !== "client" && Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)}
        company={invite.clientId ? getClient(invite.clientId)?.company ?? null : null}
        expires={new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Lagos" }).format(new Date(invite.expiresAt))}
      />
    </AuthShell>
  );
}
