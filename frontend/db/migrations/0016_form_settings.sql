-- Each form's settings, as the studio changed them.
--
-- ONE ROW PER FORM, AND ONLY WHAT WAS CHANGED. A form with no row uses the
-- defaults written in code (lib/forms/settings.ts), so a form works the day it
-- ships and a setting added later has a value without a backfill. Resetting a
-- form deletes its row.
CREATE TABLE IF NOT EXISTS form_settings (
  form_key STRING PRIMARY KEY,
  settings JSONB NOT NULL,
  saved_by STRING NOT NULL,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
