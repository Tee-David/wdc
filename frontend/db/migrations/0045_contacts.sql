-- One person record per email address, for the Email page: clients, leads and subscribers together.
-- `marketing` is true only for people who agreed to hear from us (newsletter sign-up, or set by hand);
-- campaigns go to nobody else. The suppression list is separate so a deleted contact cannot be re-added.
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  email STRING NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  "type" TEXT NOT NULL DEFAULT 'lead',
  status TEXT NOT NULL DEFAULT 'subscribed',
  marketing BOOL NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT '',
  client_id TEXT NULL,
  consent_at TIMESTAMPTZ NULL,
  consent_source TEXT NULL,
  consent_ip TEXT NULL,
  unsub_reason TEXT NULL,
  soft_bounces INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity TIMESTAMPTZ NULL
);
-- If a `contacts` table already existed in the database in some older shape, CREATE TABLE IF NOT EXISTS
-- leaves it alone, so every column is added again here (a no-op on a fresh table) before the index uses them.
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'lead';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'subscribed';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS marketing BOOL NOT NULL DEFAULT false;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT '';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS client_id TEXT NULL;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ NULL;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS consent_source TEXT NULL;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS consent_ip TEXT NULL;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS unsub_reason TEXT NULL;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS soft_bounces INT NOT NULL DEFAULT 0;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ NULL;
CREATE INDEX IF NOT EXISTS contacts_status_type ON contacts (status, "type");
CREATE TABLE IF NOT EXISTS contact_tags (
  contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (contact_id, tag)
);
CREATE INDEX IF NOT EXISTS contact_tags_tag ON contact_tags (tag);
CREATE TABLE IF NOT EXISTS contact_events (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  by TEXT NOT NULL DEFAULT '',
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contact_events_contact ON contact_events (contact_id, at DESC);
CREATE TABLE IF NOT EXISTS suppression (
  email STRING PRIMARY KEY,
  reason TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);
