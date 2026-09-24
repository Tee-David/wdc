-- Every enquiry the contact form receives.
--
-- THE ROW COMES BEFORE THE MAIL. `/api/contact` used to send an email and keep
-- nothing, so an enquiry the mail server refused was simply gone: the visitor
-- was told to try again, and the one who did not is a lead nobody ever saw.
-- Now the row is the enquiry and the mail is the notification about it.
--
-- DELIVERY IS TRACKED ON THE ROW, not inferred. 'pending' is written with the
-- row, and the send behind the response moves it to 'sent' or 'failed'. A row
-- still pending an hour later is a message that disappeared inside the
-- provider, which is the one case a log written after the send cannot show.
--
-- NOTHING IS DELETED BY THE APPLICATION. An enquiry is a conversation somebody
-- started with the studio; if it ever needs to go, that is a deliberate act by
-- a person, not a code path.
CREATE TABLE IF NOT EXISTS contact_enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name STRING NOT NULL,
  last_name STRING NOT NULL,
  -- Normalised (trimmed, lower case) because it is what we match on.
  email STRING NOT NULL,
  phone STRING NULL,
  topic STRING NOT NULL,
  message STRING NOT NULL,
  delivery STRING NOT NULL DEFAULT 'pending',
  delivery_error STRING NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ NULL,
  CONSTRAINT contact_enquiries_delivery_check CHECK (delivery IN ('pending', 'sent', 'failed'))
);

-- The admin reads newest first, a page at a time.
CREATE INDEX IF NOT EXISTS contact_enquiries_created_idx
  ON contact_enquiries (created_at DESC);
