import { Panel, when } from "./bits";
import { InviteClientButton, RevokeInviteButton } from "./invite-buttons";
import { accountFor, invitationsConfigured, invitationsFor, inviteState, type Invitation } from "@/lib/invitations";

/**
 * Whether this client can sign in to the portal, and the one control that
 * changes it. Read from the database on each view, never inferred: an
 * account either exists for their address or it does not.
 */
export default async function PortalAccess({ clientId, email }: { clientId: string; email: string }) {
  const back = `/admin/clients/${clientId}`;
  if (!invitationsConfigured()) {
    return (
      <Panel title="Portal access">
        <p className="ad__dim" style={{ padding: ".8rem 1rem", margin: 0 }}>
          The account database is not connected on this deployment, so portal invitations are off.
        </p>
      </Panel>
    );
  }

  let account: Awaited<ReturnType<typeof accountFor>> = null;
  let latest: Invitation | undefined;
  try {
    [account, [latest]] = await Promise.all([accountFor(email || "-"), invitationsFor({ clientId, role: "client", limit: 1 })]);
  } catch {
    return (
      <Panel title="Portal access">
        <p className="ad__dim" style={{ padding: ".8rem 1rem", margin: 0 }}>The account database did not answer just now. Reload in a moment.</p>
      </Panel>
    );
  }

  const state = latest ? inviteState(latest) : null;
  return (
    <Panel title="Portal access">
      <div style={{ padding: ".8rem 1rem", display: "grid", gap: ".6rem" }}>
        {account ? (
          <p style={{ margin: 0 }}>
            <span className="ad__pill ad__pill--good">Has an account</span>{" "}
            <small className="ad__dim">since {when(account.createdAt)}, signing in as {email}.</small>
          </p>
        ) : state === "pending" && latest ? (
          <>
            {/* role="status": this line IS the confirmation after pressing
                invite -- the button's own message leaves with the button. */}
            <p style={{ margin: 0 }} role="status">
              <span className="ad__pill ad__pill--warn">Invited</span>{" "}
              <small className="ad__dim">
                {when(latest.createdAt)} by {latest.invitedBy}; the link works until {when(latest.expiresAt)}.
              </small>
            </p>
            <div className="ad__row">
              <InviteClientButton clientId={clientId} again />
              <RevokeInviteButton id={latest.id} back={back} />
            </div>
          </>
        ) : (
          <>
            <p className="ad__dim" style={{ margin: 0 }} role="status">
              {state === "expired" ? "The last invitation expired unused. " : state === "revoked" ? "The last invitation was withdrawn. " : ""}
              No account yet. An account is optional for a client; the invitation goes to {email || "their address"} and
              can only make an account for that address.
            </p>
            {email ? <InviteClientButton clientId={clientId} again={false} /> : null}
          </>
        )}
      </div>
    </Panel>
  );
}
