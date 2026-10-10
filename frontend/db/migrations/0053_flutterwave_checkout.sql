CREATE SEQUENCE IF NOT EXISTS flutterwave_receipt_seq;
CREATE TABLE IF NOT EXISTS flutterwave_checkout_attempts (
 reference STRING PRIMARY KEY,
 invoice_id STRING NOT NULL,
 amount INT8 NOT NULL CHECK (amount > 0),
 currency STRING NOT NULL,
 mode STRING NOT NULL CHECK (mode IN ('test','live')),
 transaction_id STRING UNIQUE,
 payment_id STRING,
 last_checked_at TIMESTAMPTZ,
 notifications_staged BOOL NOT NULL DEFAULT false,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
