-- Mail connections beyond the studio's own server: API services and extra SMTP.
-- Secrets are encrypted before they are stored (key in MAIL_SECRETS_KEY) and never sent back to the browser.
CREATE TABLE IF NOT EXISTS mail_connections (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}'::JSONB,
  secrets_enc TEXT NOT NULL DEFAULT '',
  health_status TEXT NULL,
  health_message TEXT NULL,
  health_at TIMESTAMPTZ NULL,
  created_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
