-- A checkout keeps its originating account when Settings mode changes.
CREATE TABLE IF NOT EXISTS paystack_checkout_attempts (
  reference TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  amount INT8 NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL CHECK (currency = 'NGN'),
  mode TEXT NOT NULL CHECK (mode IN ('test','live')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
