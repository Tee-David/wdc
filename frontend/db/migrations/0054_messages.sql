-- Messages: per-person read, pin and archive state for every conversation, and team chats.
-- A conversation key is "t-<ticket id>", "p-<project id>" or "d-<team thread id>"; the state belongs to the person, not the conversation.
CREATE TABLE IF NOT EXISTS message_reads (
 user_id STRING NOT NULL,
 thread_key STRING NOT NULL,
 last_read_at TIMESTAMPTZ,
 pinned BOOL NOT NULL DEFAULT false,
 archived BOOL NOT NULL DEFAULT false,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY (user_id, thread_key)
);

-- Team chats between studio people: a direct conversation between two, or a named group.
CREATE TABLE IF NOT EXISTS team_threads (
 id UUID PRIMARY KEY,
 kind STRING NOT NULL CHECK (kind IN ('direct','group')),
 title STRING NOT NULL DEFAULT '',
 created_by STRING NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 last_message_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS team_thread_members (
 thread_id UUID NOT NULL REFERENCES team_threads(id) ON DELETE CASCADE,
 user_id STRING NOT NULL,
 added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY (thread_id, user_id)
);
CREATE INDEX IF NOT EXISTS team_thread_members_user ON team_thread_members (user_id);
CREATE TABLE IF NOT EXISTS team_messages (
 id UUID PRIMARY KEY,
 thread_id UUID NOT NULL REFERENCES team_threads(id) ON DELETE CASCADE,
 author_id STRING NOT NULL,
 author_name STRING NOT NULL,
 body STRING NOT NULL CHECK (length(body) BETWEEN 1 AND 5000),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS team_messages_thread ON team_messages (thread_id, created_at DESC);
