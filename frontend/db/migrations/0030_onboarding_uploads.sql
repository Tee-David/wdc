-- Files a client uploads on an onboarding brief, one row per signed upload.
--
-- The brief's answer keeps only the file NAMES the client saw, so until now
-- the admin could show "Sample Document.pdf" and nothing else: the address in
-- the bucket was thrown away. This row is written when the upload is signed,
-- and the entry page matches it to the names in the answer (a name only
-- reaches the answer once its upload finished), so every file the client sent
-- can be opened and downloaded.
CREATE TABLE IF NOT EXISTS onboarding_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id STRING NOT NULL,
  object_key STRING NOT NULL,
  filename STRING NOT NULL,
  bytes INT8 NOT NULL DEFAULT 0,
  content_type STRING NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT onboarding_uploads_key UNIQUE (object_key)
);
CREATE INDEX IF NOT EXISTS onboarding_uploads_draft_idx ON onboarding_uploads (draft_id, created_at);
