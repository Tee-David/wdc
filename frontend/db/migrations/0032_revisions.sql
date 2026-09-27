-- Earlier versions of what the studio publishes, so an edit can be undone.
--
-- A LIVE POST'S PREVIOUS VERSION is written in the same transaction as the
-- save that replaces it: the row here is the post as readers saw it until
-- that moment, with who wrote it and when. The newest 25 per post are kept.
-- A draft keeps no history: nobody has read it, and its autosave would fill
-- the table with half-sentences.
--
-- THE FAQ'S PREVIOUS VALUES, the newest 10, written before each save or reset.
--
-- No foreign keys, by the standing decision in 0006. lib/revisions.ts makes
-- these tables itself if this file has not been applied, so a deploy ahead of
-- its migration still saves (and starts keeping history).
CREATE TABLE IF NOT EXISTS blog_post_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL,
  content JSONB NOT NULL,
  saved_by STRING NOT NULL,
  saved_at TIMESTAMPTZ NOT NULL,
  kept_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS blog_post_revisions_post_idx ON blog_post_revisions (post_id, kept_at DESC);

CREATE TABLE IF NOT EXISTS site_content_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key STRING NOT NULL,
  value JSONB NULL,
  saved_by STRING NOT NULL,
  saved_at TIMESTAMPTZ NOT NULL,
  kept_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS site_content_history_key_idx ON site_content_history (key, kept_at DESC);
