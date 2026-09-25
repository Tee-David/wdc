-- What happened to an entry, and the notes the studio wrote about it.
--
-- ONE TIMELINE, TWO KINDS OF LINE. A note is a person writing something down;
-- an event is the system saying what changed (marked read, moved to Trash,
-- made a client, an email sent or failed). They are read together, newest
-- first, so "what happened with this brief" is one list, not three screens.
--
-- THE ACTOR IS STORED AS A NAME, as it was at the time. A note signed "Tobi"
-- must still say Tobi after Tobi changes their display name or leaves.
--
-- APPEND ONLY. The application never updates or deletes a line here.
CREATE TABLE IF NOT EXISTS entry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_key STRING NOT NULL,
  entry_id UUID NOT NULL,
  kind STRING NOT NULL,
  body STRING NOT NULL,
  actor STRING NOT NULL,
  -- For an email line: the message_log row it refers to.
  ref STRING NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT entry_events_kind_check CHECK (kind IN ('note', 'state', 'email', 'client'))
);

CREATE INDEX IF NOT EXISTS entry_events_entry_idx ON entry_events (entry_id, created_at DESC);
