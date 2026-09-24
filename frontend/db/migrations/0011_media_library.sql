-- Images and documents the studio uploads for the public site: blog pictures,
-- social cards, downloadable PDFs.
--
-- THE ROW IS WRITTEN AFTER THE OBJECT EXISTS. The browser PUTs straight to R2
-- with a presigned URL; the server then asks R2 for the object's real size and
-- type before recording it, so a row never describes a file that is not there
-- or a size the browser merely claimed.
--
-- ARCHIVED, NEVER DELETED BY THE APPLICATION. A published page may be pointing
-- at the file, and the database cannot know every place a URL was pasted.
-- Archiving hides it from the library; the object stays readable.
CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Chosen by the server, under media/. Unique so the same upload cannot be
  -- recorded twice by a double press.
  key STRING NOT NULL UNIQUE,
  -- The name it arrived with, for people. Never used to build the key.
  filename STRING NOT NULL,
  content_type STRING NOT NULL,
  bytes INT8 NOT NULL,
  alt STRING NOT NULL DEFAULT '',
  uploaded_by STRING NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by STRING NULL,
  CONSTRAINT media_assets_bytes_check CHECK (bytes >= 0)
);

-- The library reads newest first, live or archived.
CREATE INDEX IF NOT EXISTS media_assets_uploaded_idx
  ON media_assets (uploaded_at DESC);
