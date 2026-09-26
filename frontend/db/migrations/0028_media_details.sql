-- The media library's details (phase 1 of claude.ai/artifact/AgHqC7o7WnB3TrtgJGYRw8).
--
-- A caption beside the description, a "decorative" flag for a picture whose
-- empty alt is on purpose rather than forgotten, and the size the browser
-- measured before the upload, so a page can reserve the right space and the
-- library can say "1600 × 900". Every column has a default or is nullable:
-- nothing changes for a row that already exists.
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS caption STRING NOT NULL DEFAULT '';
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS decorative BOOL NOT NULL DEFAULT false;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS width INT4 NULL;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS height INT4 NULL;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS duration_ms INT4 NULL;
