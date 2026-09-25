-- An enquiry whose studio notice was switched off in the form's settings.
--
-- Neither 'sent' nor 'failed' is true of it, and the admin's "notice not
-- delivered" pill must not fire for a notice nobody wanted sent.
ALTER TABLE contact_enquiries DROP CONSTRAINT IF EXISTS contact_enquiries_delivery_check;
ALTER TABLE contact_enquiries ADD CONSTRAINT contact_enquiries_delivery_check
  CHECK (delivery IN ('pending', 'sent', 'failed', 'skipped'));
