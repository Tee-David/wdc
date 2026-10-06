CREATE TABLE IF NOT EXISTS client_profile_preferences (
  user_id TEXT PRIMARY KEY REFERENCES "user"("id") ON DELETE CASCADE,
  setup_state TEXT CHECK (setup_state IN ('pending','completed','skipped')),
  appearance TEXT CHECK (appearance IN ('system','light','dark')),
  avatar_key TEXT,
  pending_avatar_key TEXT,
  pending_avatar_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS client_avatar_cleanup (
  object_key TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  not_before TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- No backfill: existing clients are never forced through first-use setup.
