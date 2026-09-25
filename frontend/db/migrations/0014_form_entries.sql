-- What the studio has done with each entry, and the number people call it by.
--
-- READ, STARRED, AND WHICH BOX. An inbox needs to say what is new, what
-- somebody marked to come back to, and what was thrown out. `box` is one of
-- inbox / spam / trash rather than three booleans, so an entry cannot be in
-- spam and trash at once. Trash is recoverable; deleting for good is a
-- separate, deliberate act from the Trash tab.
--
-- A NUMBER PER FORM. "Brief #12" and "Enquiry #7" are what somebody says on a
-- call; a UUID is not. The counter row is bumped in the same statement that
-- writes the entry, so two submissions at once cannot share a number.
ALTER TABLE onboarding_submissions ADD COLUMN IF NOT EXISTS serial INT8 NULL;
ALTER TABLE onboarding_submissions ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ NULL;
ALTER TABLE onboarding_submissions ADD COLUMN IF NOT EXISTS starred BOOL NOT NULL DEFAULT false;
ALTER TABLE onboarding_submissions ADD COLUMN IF NOT EXISTS box STRING NOT NULL DEFAULT 'inbox';
ALTER TABLE onboarding_submissions ADD COLUMN IF NOT EXISTS box_at TIMESTAMPTZ NULL;

ALTER TABLE contact_enquiries ADD COLUMN IF NOT EXISTS serial INT8 NULL;
ALTER TABLE contact_enquiries ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ NULL;
ALTER TABLE contact_enquiries ADD COLUMN IF NOT EXISTS starred BOOL NOT NULL DEFAULT false;
ALTER TABLE contact_enquiries ADD COLUMN IF NOT EXISTS box STRING NOT NULL DEFAULT 'inbox';
ALTER TABLE contact_enquiries ADD COLUMN IF NOT EXISTS box_at TIMESTAMPTZ NULL;

CREATE TABLE IF NOT EXISTS form_counters (
  form_key STRING PRIMARY KEY,
  last INT8 NOT NULL DEFAULT 0
);

-- Number what already exists, oldest first, then start each counter after it.
UPDATE onboarding_submissions AS s SET serial = n.rn
FROM (
  SELECT id, row_number() OVER (PARTITION BY service ORDER BY COALESCE(submitted_at, created_at), id) AS rn
  FROM onboarding_submissions WHERE status = 'submitted'
) AS n
WHERE s.id = n.id AND s.serial IS NULL;

UPDATE contact_enquiries AS c SET serial = n.rn
FROM (SELECT id, row_number() OVER (ORDER BY created_at, id) AS rn FROM contact_enquiries) AS n
WHERE c.id = n.id AND c.serial IS NULL;

INSERT INTO form_counters (form_key, last)
SELECT 'onboarding-' || service, max(serial) FROM onboarding_submissions WHERE serial IS NOT NULL GROUP BY service
ON CONFLICT (form_key) DO UPDATE SET last = GREATEST(form_counters.last, excluded.last);

INSERT INTO form_counters (form_key, last)
SELECT 'contact', max(serial) FROM contact_enquiries HAVING max(serial) IS NOT NULL
ON CONFLICT (form_key) DO UPDATE SET last = GREATEST(form_counters.last, excluded.last);

CREATE INDEX IF NOT EXISTS onboarding_submissions_service_box_idx
  ON onboarding_submissions (service, box, submitted_at DESC);
CREATE INDEX IF NOT EXISTS contact_enquiries_box_idx
  ON contact_enquiries (box, created_at DESC);
