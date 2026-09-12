CREATE TABLE IF NOT EXISTS onboarding_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service STRING NOT NULL CHECK (service IN ('branding', 'seo', 'web', 'apps', 'software', 'social')),
  status STRING NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'archived')),
  current_step INT4 NOT NULL DEFAULT 0 CHECK (current_step >= 0 AND current_step <= 4),
  answers JSONB NOT NULL DEFAULT '{}'::JSONB,
  email STRING NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS onboarding_submissions_status_updated_idx
  ON onboarding_submissions (status, updated_at DESC);

CREATE TABLE IF NOT EXISTS onboarding_resume_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES onboarding_submissions (id) ON DELETE CASCADE,
  token_hash STRING NOT NULL UNIQUE,
  email STRING NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ NULL,
  revoked_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS onboarding_resume_tokens_submission_idx
  ON onboarding_resume_tokens (submission_id, created_at DESC);
CREATE INDEX IF NOT EXISTS onboarding_resume_tokens_expiry_idx
  ON onboarding_resume_tokens (expires_at);
