-- Trash for blog drafts, replacing permanent deletion.
--
-- Only a draft can be put in the Trash (a post that has been live is in
-- search results and other people's links, so it is unpublished instead).
-- A trashed post is hidden from the admin list, the editor and the preview,
-- keeps its address reserved, can be restored as a draft, and is removed for
-- good by the daily tidy after 30 days.
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS trashed_at TIMESTAMPTZ NULL;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS trashed_by STRING NULL;
