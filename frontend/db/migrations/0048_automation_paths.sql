-- Automations that branch (a Yes/No step). A person's place in a flow is now a PATH of step ids
-- ("check-id/email-id") instead of an index in one list. NULL means "use the old `step` index",
-- which is how every run from before this migration keeps going; '' means the run has nothing left to do.
-- Safe to run twice.
ALTER TABLE automation_runs ADD COLUMN IF NOT EXISTS path TEXT NULL;

-- How many times each step has run, so the Results view can show real counts and never invent them.
CREATE TABLE IF NOT EXISTS automation_step_hits (
  automation_id TEXT NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  n INT NOT NULL DEFAULT 0,
  PRIMARY KEY (automation_id, step_id)
);
