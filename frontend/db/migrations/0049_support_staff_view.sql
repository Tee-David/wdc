-- Owner's read-only "View as staff". A staff view has no client record, so client_id may be empty;
-- target_role says which kind of view a row is (NULL on every row from before this migration = a client view).
-- The app tells the two apart by joining the target's live role, so a row can never grant the other kind of view.
-- Safe to run twice. The client "View as client" keeps working with or without this migration.
ALTER TABLE user_support_sessions ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE user_support_sessions ADD COLUMN IF NOT EXISTS target_role TEXT NULL;
