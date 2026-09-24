-- Every message the site sent, or a person wrote down, and whether it went.
--
-- IT WAS AN ARRAY IN MEMORY. The outbox wrote its row before calling the mail
-- server and deduped on the event, which was right, but the row lived in one
-- server instance: a cold start forgot the log and the dedupe with it, and two
-- warm instances each had their own. A retry that landed on a fresh instance
-- could send the same receipt twice, and a failed notice left nothing to find.
--
-- THE ROW STILL COMES FIRST. `state` is written 'Queued' before the provider is
-- called and moved to 'Sent' or 'Failed' after. A row still Queued an hour
-- later is a message that vanished inside the provider.
--
-- ONE ROW PER EVENT. `dedupe_key` is unique, so a second attempt at the same
-- event is refused by the database rather than by a check that two instances
-- can both pass.
--
-- NO BODY. The subject and a one-line summary only; a log that keeps every
-- word is a second copy of the mailbox, and it is the copy that leaks.
CREATE TABLE IF NOT EXISTS message_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  channel STRING NOT NULL,
  direction STRING NOT NULL DEFAULT 'Outbound',
  to_addr STRING NOT NULL,
  subject STRING NOT NULL,
  summary STRING NOT NULL,
  state STRING NOT NULL DEFAULT 'Queued',
  -- The provider's own words when it refused, trimmed, never a credential.
  error STRING NULL,
  -- How long the provider took, when the site sent it.
  ms INT8 NULL,
  sent_by STRING NOT NULL,
  client_id STRING NULL,
  about JSONB NULL,
  dedupe_key STRING NOT NULL,
  -- Each resend: {at, to, by, sent, ms, error}. Capped at 20 by the writer.
  resends JSONB NOT NULL DEFAULT '[]'::JSONB,
  settled_at TIMESTAMPTZ NULL,
  CONSTRAINT message_log_dedupe_key UNIQUE (dedupe_key),
  CONSTRAINT message_log_state_check CHECK (state IN ('Queued', 'Sent', 'Failed', 'Skipped')),
  CONSTRAINT message_log_direction_check CHECK (direction IN ('Outbound', 'Inbound'))
);

CREATE INDEX IF NOT EXISTS message_log_created_idx ON message_log (created_at DESC);
CREATE INDEX IF NOT EXISTS message_log_client_idx ON message_log (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS message_log_state_idx ON message_log (state, created_at DESC);
