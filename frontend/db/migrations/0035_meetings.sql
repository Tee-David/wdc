-- Cal.com remains the calendar authority. WDC stores scoped access and durable intent.
CREATE TABLE IF NOT EXISTS wdc_meeting_config (
  id STRING PRIMARY KEY DEFAULT 'studio',
  event_type_id INT8,
  schedule_id INT8,
  host_id INT8,
  enabled BOOL NOT NULL DEFAULT false,
  settings JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO wdc_meeting_config (id) VALUES ('studio') ON CONFLICT (id) DO NOTHING;
CREATE TABLE IF NOT EXISTS wdc_meetings (
  uid STRING PRIMARY KEY,
  booking JSONB NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  status STRING NOT NULL,
  revision INT8 NOT NULL DEFAULT 1,
  reminder_opt_in BOOL NOT NULL DEFAULT false,
  management_hash STRING UNIQUE,
  management_expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wdc_meetings_start ON wdc_meetings (start_at);
CREATE TABLE IF NOT EXISTS wdc_meeting_commands (
  id STRING PRIMARY KEY,
  fingerprint STRING NOT NULL,
  kind STRING NOT NULL,
  booking_uid STRING,
  actor STRING NOT NULL,
  payload JSONB NOT NULL,
  state STRING NOT NULL DEFAULT 'pending',
  result JSONB,
  error STRING,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wdc_meeting_commands_pending ON wdc_meeting_commands (state, created_at);
CREATE TABLE IF NOT EXISTS wdc_meeting_webhooks (
  digest STRING PRIMARY KEY,
  booking_uid STRING NOT NULL,
  kind STRING NOT NULL,
  state STRING NOT NULL DEFAULT 'pending',
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS wdc_meeting_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_uid STRING,
  kind STRING NOT NULL,
  actor STRING NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
