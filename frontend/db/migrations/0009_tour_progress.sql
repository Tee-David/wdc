-- Which guided tours a person has finished or skipped, per account.
--
-- THE ACCOUNT IS THE SOURCE OF TRUTH, the browser is a cache. An owner who
-- skipped the walkthrough on a laptop should not be offered it again on a
-- phone; that needs a row keyed to them rather than a key in one browser's
-- storage. `tour` is `<id>@<version>`, so a new version of a tour is a new row
-- and a clean slate, with no migration to write.
--
-- One row per person per tour version, and a replay deletes it. No foreign
-- key to "user", by the schema's standing decision; the id is Better Auth's.
CREATE TABLE IF NOT EXISTS tour_progress (
  user_id STRING NOT NULL,
  tour STRING NOT NULL,
  status STRING NOT NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tour),
  CONSTRAINT tour_progress_status_check CHECK (status IN ('completed', 'skipped'))
);
