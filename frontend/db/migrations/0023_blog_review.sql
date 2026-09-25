-- Pending review for blog posts.
--
-- Staff write and submit; the owner publishes or sends it back with a note.
-- `status` gains 'review' (validated in application code, like the others).
-- The note is the owner's words to the writer, shown in the editor until the
-- post is submitted again.
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS submitted_by STRING NULL;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ NULL;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS review_note STRING NULL;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS review_by STRING NULL;
