-- Email designs made in the builder. One current design per email kind, plus its history.
CREATE TABLE IF NOT EXISTS email_designs (
  kind TEXT PRIMARY KEY,
  design JSONB NOT NULL,
  enabled BOOL NOT NULL DEFAULT false,
  updated_by TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS email_design_versions (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  design JSONB NOT NULL,
  saved_by TEXT NOT NULL DEFAULT '',
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_design_versions_kind ON email_design_versions (kind, saved_at DESC);
