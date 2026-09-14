-- The newsletter list.
--
-- ONE ROW PER ADDRESS, enforced by the database rather than by a check in the
-- route. Two people submitting the same address in the same second is the
-- ordinary case for a footer form, and a uniqueness rule that lives in
-- application code loses that race. `ON CONFLICT` then makes a resubscribe
-- idempotent instead of an error.
--
-- THE ADDRESS IS STORED NORMALISED and the original is kept beside it. We
-- match, dedupe and unsubscribe on the normalised form; we write to the one
-- they actually typed, because "Tobi@Example.com" is how they think of
-- themselves and a mail merge that shouts their address back in lower case
-- reads as a machine.
--
-- NOTHING IS DELETED. Unsubscribing sets a timestamp. A deleted row cannot
-- prove somebody asked to be taken off the list, and that proof is the only
-- defence when they say they asked and we kept mailing.
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email STRING NOT NULL UNIQUE,
  email_as_typed STRING NOT NULL,
  -- Where they signed up from, so a spike can be traced to a page rather than
  -- guessed at. Not an analytics identifier and not tied to a person.
  source STRING NOT NULL DEFAULT 'footer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ NULL
);

-- The only query the list is ever read by: everyone still subscribed, newest
-- first. A partial index keeps the unsubscribed rows out of it entirely.
CREATE INDEX IF NOT EXISTS newsletter_subscribers_active_idx
  ON newsletter_subscribers (created_at DESC)
  WHERE unsubscribed_at IS NULL;
