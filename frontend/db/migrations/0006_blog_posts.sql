-- The blog.
--
-- WHY THE POSTS LEAVE lib/blog.ts. They are content, and content that only an
-- engineer can change is content that does not get changed. The admin blog
-- editor in section 4.8 needs rows to edit; this is the table it edits.
--
-- THE BODY IS JSONB AND THAT IS DELIBERATE. `BlogBlock` is an ORDERED,
-- discriminated union -- p, h2, h3, list, quote, callout -- and the renderer
-- walks it to guarantee one h1 and a correct heading outline. Normalising it
-- into a blocks table would buy nothing and cost the ordering guarantee, and
-- storing rendered HTML instead would give away the outline guarantee
-- entirely, which is the one thing an editor must not be able to break.
--
-- `tags` is jsonb for the same reason and one more: tags become a real table
-- the day there are author and category records to join to, which is its own
-- checklist item and not this one.
--
-- THREE DATES, NOT ONE, and they answer different questions. `published_at` is
-- the DISPLAY date and what the index orders by, so a post can be written
-- today and dated for next week. `created_at` is when the row appeared.
-- `updated_at` is shown to the reader as "updated" only when it is set, so a
-- typo fix does not have to claim the post was rewritten.
--
-- No hard foreign keys anywhere in this schema, by standing decision.
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The URL, and the editor's stable handle for a post whose title changes.
  slug STRING NOT NULL UNIQUE,
  -- The on-page h1.
  title STRING NOT NULL,
  -- The <title>, written for a search result, so it can differ from the h1.
  seo_title STRING NOT NULL,
  -- The meta description. 120-155 characters is the range that earns a snippet.
  description STRING NOT NULL,
  -- One sentence, on the index card.
  excerpt STRING NOT NULL,
  -- A ServiceSlug. Validated in application code rather than by an enum here,
  -- so adding a service is one file and not a migration.
  topic STRING NOT NULL,
  tags JSONB NOT NULL DEFAULT '[]',
  -- A path under /public. The covers are the site's own hero photographs, so
  -- the blog introduces no new licensing and no second visual vocabulary.
  cover STRING NOT NULL,
  body JSONB NOT NULL,

  -- draft | scheduled | published. An editor needs all three, and a post that
  -- is scheduled is simply published with a date in the future.
  status STRING NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NULL
);

-- The only query the index ever runs: published posts, newest first. A partial
-- index keeps drafts and anything scheduled for the future out of it entirely
-- rather than filtering them out after the fact.
CREATE INDEX IF NOT EXISTS blog_posts_live_idx
  ON blog_posts (published_at DESC)
  WHERE status = 'published';

-- `relatedPosts` asks for other posts under the same topic. Without this it is
-- a scan, which is fine at six posts and is not fine later.
CREATE INDEX IF NOT EXISTS blog_posts_topic_idx
  ON blog_posts (topic, published_at DESC)
  WHERE status = 'published';
