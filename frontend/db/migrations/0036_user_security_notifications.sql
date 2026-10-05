CREATE TABLE IF NOT EXISTS user_security_preferences (
  user_id TEXT PRIMARY KEY REFERENCES "user"("id") ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS user_security_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL UNIQUE REFERENCES user_security_events(id),
  target_id TEXT NOT NULL REFERENCES "user"("id"),
  kind TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','sending','accepted','failed','uncertain','skipped','requested')),
  attempts INT NOT NULL DEFAULT 0,
  provider_started BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_security_notices_pending ON user_security_notices(state,created_at);
