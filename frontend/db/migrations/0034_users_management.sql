-- Account-management metadata. Existing accounts and authored records are retained.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "lastSignInAt" TIMESTAMPTZ;

-- Serializes invite creation for an address, including when no account exists yet.
CREATE TABLE IF NOT EXISTS user_invitation_targets (
  email TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS user_invitation_delivery (
  invitation_id UUID PRIMARY KEY REFERENCES invitations(id),
  state TEXT NOT NULL DEFAULT 'queued' CHECK (state IN ('queued', 'accepted', 'failed', 'uncertain')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  error TEXT
);

CREATE TABLE IF NOT EXISTS user_security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  event TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_security_events_target ON user_security_events(target_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_support_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,
  actor_id TEXT NOT NULL REFERENCES "user"("id"),
  actor_session_id TEXT NOT NULL REFERENCES "session"("id") ON DELETE CASCADE,
  target_id TEXT NOT NULL REFERENCES "user"("id"),
  client_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS user_support_sessions_expiry ON user_support_sessions(expires_at);
