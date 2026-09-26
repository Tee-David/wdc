-- An invitation can make an owner, not only staff.
--
-- Team and roles used to invite staff and then promote them with a separate
-- "Make owner" once they had signed in; the invite now asks which role up
-- front (settings review, 2026-09-26). Redemption already writes the
-- invitation's role onto the new account, so widening the check is the whole
-- change. A new constraint name, because CockroachDB will not drop and re-add
-- the same name inside one transaction.
ALTER TABLE invitations ADD CONSTRAINT invitations_role_check_v2 CHECK (role IN ('client', 'staff', 'owner'));
ALTER TABLE invitations DROP CONSTRAINT invitations_role_check;
