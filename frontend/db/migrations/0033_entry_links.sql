-- Which client, and which project, a form entry has been assigned to.
--
-- BEFORE THIS, an entry was only ever matched to a client by its email or
-- phone, which cannot say "this brief is for that client" when the person
-- wrote with another address, and cannot say which project at all. This is
-- the studio's own decision, stored: one row per entry, replaced when it is
-- reassigned. Who did it and when is on the entry's timeline (entry_events,
-- kind 'client'), which is append only, so the history is kept there.
--
-- client_id and project_id are the ids the admin store uses (text, not
-- UUIDs), and there are no foreign keys, by the standing decision in 0006.
-- lib/forms/links.ts creates this table itself if the file has not been
-- applied yet, so a deploy ahead of its migration still works.
CREATE TABLE IF NOT EXISTS entry_links (
  entry_id UUID PRIMARY KEY,
  form_key STRING NOT NULL,
  client_id STRING NOT NULL,
  project_id STRING NULL,
  linked_by STRING NOT NULL,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS entry_links_client_idx ON entry_links (client_id);
