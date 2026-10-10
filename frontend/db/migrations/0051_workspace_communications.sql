-- Durable project communication: no notification or send intent lives only in memory.
CREATE TABLE IF NOT EXISTS workspace_events (
 id UUID PRIMARY KEY, project_id STRING NOT NULL, client_id STRING NULL,
 kind STRING NOT NULL, category STRING NOT NULL, actor_id STRING NOT NULL, actor_name STRING NOT NULL,
 title STRING NOT NULL, summary STRING NOT NULL, href STRING NOT NULL,
 visibility STRING NOT NULL CHECK (visibility IN ('client','internal')),
 due_at TIMESTAMPTZ NULL, stale_key STRING NULL, cancelled_at TIMESTAMPTZ NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS workspace_events_project_idx ON workspace_events(project_id,created_at DESC);
CREATE INDEX IF NOT EXISTS workspace_events_due_idx ON workspace_events(due_at) WHERE cancelled_at IS NULL;
CREATE TABLE IF NOT EXISTS workspace_notification_preferences (
 user_id STRING PRIMARY KEY, modes JSONB NOT NULL DEFAULT '{"actions":"immediate","progress":"digest","support":"immediate","billing":"immediate","reminders":"immediate"}'::JSONB,
 digest_days INT NOT NULL DEFAULT 7 CHECK (digest_days IN (1,7)), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS workspace_notifications (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), event_id UUID NOT NULL, user_id STRING NOT NULL,
 href STRING NOT NULL, read_at TIMESTAMPTZ NULL, actioned_at TIMESTAMPTZ NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(event_id,user_id)
);
CREATE INDEX IF NOT EXISTS workspace_notifications_person_idx ON workspace_notifications(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS workspace_email_intents (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), event_id UUID NOT NULL, user_id STRING NOT NULL,
 message_id UUID NULL, href STRING NOT NULL, mode STRING NOT NULL CHECK(mode IN ('immediate','digest','off')),
 state STRING NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sending','accepted','failed','skipped')),
 available_at TIMESTAMPTZ NOT NULL DEFAULT now(), claimed_at TIMESTAMPTZ NULL, settled_at TIMESTAMPTZ NULL,
 attempt INT NOT NULL DEFAULT 0, retry_by STRING NULL, error STRING NULL,
 UNIQUE(event_id,user_id)
);
CREATE INDEX IF NOT EXISTS workspace_email_pending_idx ON workspace_email_intents(state,available_at);
CREATE TABLE IF NOT EXISTS workspace_handovers (
 id UUID PRIMARY KEY, project_id STRING NOT NULL, from_user_id STRING NOT NULL, to_user_id STRING NOT NULL,
 title STRING NOT NULL, context STRING NOT NULL, files STRING NOT NULL DEFAULT '', decisions STRING NOT NULL DEFAULT '', risks STRING NOT NULL DEFAULT '', next_action STRING NOT NULL,
 due_at TIMESTAMPTZ NULL, accepted_at TIMESTAMPTZ NULL, accepted_by STRING NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS workspace_handovers_project_idx ON workspace_handovers(project_id,created_at DESC);
CREATE TABLE IF NOT EXISTS workspace_team_tasks (
 id UUID PRIMARY KEY, project_id STRING NOT NULL, title STRING NOT NULL, assignee_id STRING NOT NULL,
 due_at TIMESTAMPTZ NULL, priority STRING NOT NULL DEFAULT 'Normal' CHECK(priority IN ('Low','Normal','High')),
 handover_id UUID NULL, blocked_by UUID NULL, completed_at TIMESTAMPTZ NULL,
 created_by STRING NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS workspace_team_tasks_project_idx ON workspace_team_tasks(project_id,created_at DESC);
CREATE TABLE IF NOT EXISTS workspace_team_notes (
 id UUID PRIMARY KEY, project_id STRING NOT NULL, handover_id UUID NULL, author_id STRING NOT NULL,
 author_name STRING NOT NULL, mention_user_id STRING NULL, reply_to UUID NULL, visibility STRING NOT NULL CHECK(visibility IN ('client','internal')),
 body STRING NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS workspace_team_notes_project_idx ON workspace_team_notes(project_id,created_at DESC);

-- Email-only primary contacts keep a delivery identity without becoming auth accounts.
ALTER TABLE workspace_email_intents ADD COLUMN IF NOT EXISTS recipient_email STRING NULL;
ALTER TABLE workspace_email_intents ADD COLUMN IF NOT EXISTS recipient_client_id STRING NULL;
ALTER TABLE workspace_events ADD COLUMN IF NOT EXISTS recipient_purpose STRING NOT NULL DEFAULT 'updates';
