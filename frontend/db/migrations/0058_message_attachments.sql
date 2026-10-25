-- Pictures and files in Messages: one row per file, against the conversation ("t-", "p-" or "d-") and the message that carries it.
-- The file itself is in the private bucket under chat/<conversation>/; the key is the row's identity, so recording twice is harmless.
CREATE TABLE IF NOT EXISTS message_attachments (
 key STRING PRIMARY KEY,
 thread_key STRING NOT NULL,
 message_id STRING NOT NULL,
 name STRING NOT NULL,
 content_type STRING NOT NULL,
 bytes INT8 NOT NULL,
 uploaded_by STRING NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS message_attachments_thread ON message_attachments (thread_key, message_id);

-- A team message can be a picture with no words, so the body may be empty (it was 1 to 5000 characters).
ALTER TABLE team_messages DROP CONSTRAINT IF EXISTS team_messages_body_check;
ALTER TABLE team_messages DROP CONSTRAINT IF EXISTS check_body;
ALTER TABLE team_messages ADD CONSTRAINT team_messages_body_length CHECK (length(body) <= 5000);
