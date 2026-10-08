-- Double opt-in for the newsletter. A person who types their address waits in
-- newsletter_pending until they press the link in the confirmation email; only
-- then do they become a row in newsletter_subscribers, with the proof of consent.
-- Existing subscribers are untouched (their consent columns stay empty: legacy).
CREATE TABLE IF NOT EXISTS newsletter_pending (
  email STRING PRIMARY KEY,
  email_as_typed STRING NOT NULL,
  source STRING NOT NULL DEFAULT 'footer',
  token_hash STRING NOT NULL,
  ip STRING NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ NULL;
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS consent_source STRING NULL;
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS consent_ip STRING NULL;
