-- The redesigned onboarding forms have up to nine screens, and the first
-- migration limited the saved step to 0 to 4. Widen it. Until this is applied
-- the draft route saves such steps as 4 (see app/api/onboarding/draft/route.ts),
-- so nothing breaks in the meantime.
ALTER TABLE onboarding_submissions DROP CONSTRAINT IF EXISTS onboarding_submissions_current_step_check;
ALTER TABLE onboarding_submissions DROP CONSTRAINT IF EXISTS check_current_step;
ALTER TABLE onboarding_submissions ADD CONSTRAINT onboarding_submissions_current_step_check CHECK (current_step >= 0 AND current_step <= 20);

-- Reminders for unfinished drafts: at most two, each one switchable off by the
-- person it goes to (the setting lives with the draft's owner, not the template).
ALTER TABLE onboarding_submissions ADD COLUMN IF NOT EXISTS nudges_sent INT4 NOT NULL DEFAULT 0;
ALTER TABLE onboarding_submissions ADD COLUMN IF NOT EXISTS last_nudged_at TIMESTAMPTZ NULL;
ALTER TABLE onboarding_submissions ADD COLUMN IF NOT EXISTS nudges_off BOOL NOT NULL DEFAULT false;
