-- Automations: a trigger, then steps (wait, email, tag, stop, note, webhook) run for each person once.
ALTER TABLE contact_tags ADD COLUMN IF NOT EXISTS added_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE TABLE IF NOT EXISTS automations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'marketing',
  trigger_kind TEXT NOT NULL,
  trigger_value TEXT NOT NULL DEFAULT '',
  steps JSONB NOT NULL DEFAULT '[]'::JSONB,
  enabled BOOL NOT NULL DEFAULT false,
  enabled_at TIMESTAMPTZ NULL,
  created_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- One run per person per automation: the unique key is what stops anyone entering twice.
CREATE TABLE IF NOT EXISTS automation_runs (
  id TEXT PRIMARY KEY,
  automation_id TEXT NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  contact_id TEXT NOT NULL,
  email STRING NOT NULL,
  step INT NOT NULL DEFAULT 0,
  next_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active',
  note TEXT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ NULL,
  UNIQUE (automation_id, contact_id)
);
CREATE INDEX IF NOT EXISTS automation_runs_due ON automation_runs (status, next_at);
