-- Messages (owner, 2026-10-26): reactions and team-only tags on a message, and messages Admin schedules to send later.
-- A mark is one person's reaction or one tag on one message; the studio sees them, the client portal never does.
CREATE TABLE IF NOT EXISTS message_marks (
  thread_key STRING NOT NULL,
  message_id STRING NOT NULL,
  user_id STRING NOT NULL,
  kind STRING NOT NULL CHECK (kind IN ('react', 'tag')),
  value STRING NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_key, message_id, user_id, kind, value)
);
CREATE INDEX IF NOT EXISTS message_marks_by_thread ON message_marks (thread_key);

-- A message written now and sent by the five-minute heartbeat at send_at. The row is the intent; sent_at is set
-- once, in the same statement that claims it, so a second heartbeat cannot send it twice.
CREATE TABLE IF NOT EXISTS message_schedules (
  id UUID PRIMARY KEY,
  thread_key STRING NOT NULL,
  author_id STRING NOT NULL,
  author_name STRING NOT NULL,
  body STRING NOT NULL,
  send_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ NULL,
  cancelled_at TIMESTAMPTZ NULL,
  error STRING NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS message_schedules_due ON message_schedules (send_at);
