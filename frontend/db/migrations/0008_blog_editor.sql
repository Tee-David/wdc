-- What the admin blog editor needs beyond 0006.
--
-- A CANONICAL OVERRIDE, for the post that was first published somewhere else
-- (a guest post, a LinkedIn article) and is republished here. Null means the
-- post's own URL, which is the answer for almost every post.
--
-- A SOCIAL IMAGE, null by default, and that default matters: setting an
-- explicit Open Graph image suppresses the drawn `opengraph-image` card that
-- carries the post's headline. Only a post that genuinely needs a different
-- picture sets one.
--
-- WHO LAST SAVED IT, so a changed post can be answered for. The full history
-- lives in the audit log; this is the line on the list.
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS canonical STRING NULL;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS social_image STRING NULL;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS saved_by STRING NULL;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS saved_at TIMESTAMPTZ NULL;
