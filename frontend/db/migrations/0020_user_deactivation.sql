-- Taking somebody's access away without deleting them.
--
-- A member of staff who leaves still has their name on every change they
-- made; deleting the row would orphan that history. Deactivating keeps the
-- row, refuses every new sign-in, and (in the same transaction, in the app)
-- deletes their sessions so the access ends now rather than when a cookie
-- expires. Reactivating clears both columns.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "deactivatedAt" TIMESTAMPTZ NULL;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "deactivatedBy" STRING NULL;
