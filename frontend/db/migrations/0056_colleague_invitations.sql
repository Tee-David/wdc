-- People at your business: a client's primary contact invites a colleague.
-- The project access waits here until the invitation is accepted, then becomes
-- workspace_project_members rows (lib/invitations.ts redeemInvitation).
CREATE TABLE IF NOT EXISTS invitation_project_grants (
 invitation_id UUID NOT NULL,
 project_id STRING NOT NULL,
 can_review BOOL NOT NULL DEFAULT false,
 can_billing BOOL NOT NULL DEFAULT false,
 granted_by STRING NOT NULL,
 PRIMARY KEY (invitation_id, project_id)
);
CREATE INDEX IF NOT EXISTS invitation_project_grants_project ON invitation_project_grants (project_id);
