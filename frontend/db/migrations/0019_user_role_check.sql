-- "user"."role" can only be one of the three roles the app knows.
--
-- It was a free STRING, described in lib/roles.ts and lib/db/schema.ts as an
-- enum that the database never enforced. A typo'd or stale value ("admin",
-- "user", the old default "staff" on rows nobody meant to be staff) would sit
-- there meaning nothing to the guard, which fails closed, so the person could
-- not get in and nobody could say why.
--
-- LEAST PRIVILEGE FOR ANYTHING UNKNOWN. A value outside the three becomes
-- 'client' before the check is added: never owner, never staff. An owner who
-- finds themselves demoted by this was never an owner the app recognised.
UPDATE "user" SET "role" = 'client' WHERE "role" IS NULL OR "role" NOT IN ('owner', 'staff', 'client');
ALTER TABLE "user" DROP CONSTRAINT IF EXISTS user_role_check;
ALTER TABLE "user" ADD CONSTRAINT user_role_check CHECK ("role" IN ('owner', 'staff', 'client'));
