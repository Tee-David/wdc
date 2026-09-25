-- Site-wide settings the owner changes in the admin, one row per key.
--
-- Only what was changed is stored. Every key has a default written in code
-- beside the thing that reads it, so a key with no row still has a value and
-- a reset is a delete. The value is JSON so a setting can be a number, a list
-- or a small object without a column per type.
CREATE TABLE IF NOT EXISTS app_settings (
  key STRING PRIMARY KEY,
  value JSONB NOT NULL,
  saved_by STRING NOT NULL,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
