-- Personal data requests: who asked for what, and what was done.
--
-- THE ADDRESS IS NEVER STORED, only a SHA-256 of it (lower-cased), so the
-- log of erasures is not itself a list of the people who asked to be
-- forgotten. The hash is also what stops a later CSV import from putting an
-- erased address back on the newsletter.
CREATE TABLE IF NOT EXISTS privacy_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_hash STRING NOT NULL,
  kind STRING NOT NULL CHECK (kind IN ('export', 'erase')),
  counts JSONB NOT NULL DEFAULT '{}'::JSONB,
  by_name STRING NOT NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS privacy_requests_hash_idx ON privacy_requests (email_hash, kind);
CREATE INDEX IF NOT EXISTS privacy_requests_at_idx ON privacy_requests (at DESC);
