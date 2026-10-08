-- Campaigns: one-off emails to an audience of contacts who asked to hear from us.
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  design JSONB NOT NULL,
  audience JSONB NOT NULL DEFAULT '{}'::JSONB,
  track TEXT NOT NULL DEFAULT 'full',
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ NULL,
  recipients INT NOT NULL DEFAULT 0,
  anon_clicks INT NOT NULL DEFAULT 0,
  anon_opens INT NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ NULL,
  finished_at TIMESTAMPTZ NULL
);
CREATE INDEX IF NOT EXISTS campaigns_status ON campaigns (status, scheduled_at);
-- One row per recipient. `status` moves pending -> processing -> sent or failed; a row is marked sent BEFORE
-- the provider is called, so a run that overlaps another can never send the same row twice.
CREATE TABLE IF NOT EXISTS campaign_sends (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id TEXT NOT NULL,
  email STRING NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT NULL,
  claimed_at TIMESTAMPTZ NULL,
  sent_at TIMESTAMPTZ NULL,
  opened_at TIMESTAMPTZ NULL,
  clicks INT NOT NULL DEFAULT 0,
  UNIQUE (campaign_id, contact_id)
);
CREATE INDEX IF NOT EXISTS campaign_sends_status ON campaign_sends (status, campaign_id);
CREATE INDEX IF NOT EXISTS campaign_sends_email ON campaign_sends (email);
CREATE TABLE IF NOT EXISTS campaign_links (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  clicks INT NOT NULL DEFAULT 0,
  UNIQUE (campaign_id, url)
);
CREATE TABLE IF NOT EXISTS segments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  audience JSONB NOT NULL,
  created_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
