-- The audit log, kept in the database.
--
-- Until now it lived in one server instance's memory, so a deploy or a cold
-- start emptied it and two instances each held half. APPEND-ONLY: the
-- application only ever inserts here. Nothing updates or deletes a row, and
-- the admin has no control that would.
--
-- `from_value`/`to_value` are the before and after as a person reads them
-- ("₦377,250.00", not 37725000), for the reason given on AuditEntry in
-- lib/admin/types.ts.
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor STRING NOT NULL,
  kind STRING NOT NULL,
  subject_id STRING NOT NULL,
  subject STRING NOT NULL,
  action STRING NOT NULL,
  field STRING NULL,
  from_value STRING NULL,
  to_value STRING NULL,
  note STRING NULL
);

CREATE INDEX IF NOT EXISTS audit_log_at_idx ON audit_log (at DESC);
CREATE INDEX IF NOT EXISTS audit_log_kind_at_idx ON audit_log (kind, at DESC);
CREATE INDEX IF NOT EXISTS audit_log_subject_idx ON audit_log (subject_id, at DESC);
