-- People who asked, on the maintenance page, to be told when the site is back.
--
-- One row per address, and each row is deleted once its message is sent: the
-- address was given for that one message and is kept no longer (the daily job
-- also clears anything older than 30 days, whatever happened). `since` names
-- the maintenance the person signed up during, so a retry of the same send is
-- recognised by the outbox's dedupe key rather than mailed twice.
CREATE TABLE IF NOT EXISTS maintenance_waitlist (
  email STRING PRIMARY KEY,
  email_as_typed STRING NOT NULL,
  reason STRING NULL CHECK (reason IS NULL OR reason IN ('project', 'client', 'browsing')),
  since STRING NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
