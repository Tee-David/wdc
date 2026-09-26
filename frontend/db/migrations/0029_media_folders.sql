-- Folders in the media library (phase 2 of claude.ai/artifact/AgHqC7o7WnB3TrtgJGYRw8).
--
-- A tree kept as parent links. A studio library holds tens of folders, a
-- few hundred at most: the whole tree is one query of a few KB, so there is
-- no closure table or stored path to keep in step on every move. Folders are
-- virtual: a file's key, and so its public address, never changes when it
-- moves. A file with no folder is "Unsorted".
CREATE TABLE IF NOT EXISTS media_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NULL REFERENCES media_folders (id),
  -- 1 to 5, kept by the move action for the whole subtree.
  depth INT2 NOT NULL DEFAULT 1,
  name STRING NOT NULL,
  -- Order among siblings, for "sort by hand".
  position INT4 NOT NULL DEFAULT 0,
  -- A solid tag: navy, orange, green, red or amber. Null for none.
  color STRING NULL,
  created_by STRING NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT media_folders_name_len CHECK (length(name) BETWEEN 1 AND 40),
  CONSTRAINT media_folders_depth CHECK (depth BETWEEN 1 AND 5),
  CONSTRAINT media_folders_not_self CHECK (parent_id IS NULL OR parent_id != id),
  CONSTRAINT media_folders_color CHECK (color IS NULL OR color IN ('navy', 'orange', 'green', 'red', 'amber'))
);
-- Names are unique among siblings, ignoring case.
CREATE UNIQUE INDEX IF NOT EXISTS media_folders_sibling_name ON media_folders ((COALESCE(parent_id::TEXT, 'top')), (lower(name)));
CREATE INDEX IF NOT EXISTS media_folders_parent_idx ON media_folders (parent_id, position);

-- Deleting a folder moves its files first, so no ON DELETE here.
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS folder_id UUID NULL REFERENCES media_folders (id);
CREATE INDEX IF NOT EXISTS media_assets_folder_idx ON media_assets (folder_id, uploaded_at DESC);
