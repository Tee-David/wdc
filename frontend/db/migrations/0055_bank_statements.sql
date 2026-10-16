-- Bank statement lines for Reconciliation: imported from the bank's CSV, matched to invoices or set aside.
-- `fingerprint` makes a second import of the same statement add nothing.
CREATE TABLE IF NOT EXISTS bank_statement_lines (
 id UUID PRIMARY KEY,
 fingerprint STRING NOT NULL UNIQUE,
 account STRING NOT NULL DEFAULT '',
 posted_on DATE NOT NULL,
 amount INT8 NOT NULL CHECK (amount > 0),
 currency STRING NOT NULL DEFAULT 'NGN',
 narration STRING NOT NULL DEFAULT '',
 reference STRING NOT NULL DEFAULT '',
 state STRING NOT NULL DEFAULT 'new' CHECK (state IN ('new','matched','ignored')),
 invoice_id STRING,
 payment_id STRING,
 note STRING,
 imported_by STRING NOT NULL,
 imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 resolved_by STRING,
 resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS bank_statement_lines_state ON bank_statement_lines (state, posted_on DESC);
