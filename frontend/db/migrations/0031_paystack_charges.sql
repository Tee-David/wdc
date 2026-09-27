-- One row per Paystack charge the books have taken, claimed BEFORE it is banked.
--
-- The webhook and the payer's return to /pay/done both bank a successful
-- charge, and they routinely arrive within the same second. On one server the
-- in-memory check in applyPayment stops the second; on Vercel they usually
-- land on different instances, and each would bank it. The primary key here is
-- the one place both can see: whoever inserts the reference first banks it,
-- the other finds it taken and does nothing twice (no second payment, no
-- second receipt). lib/paystack-claim.ts makes this table itself if it is
-- missing, so a deploy that has not applied this file is still safe.
CREATE TABLE IF NOT EXISTS paystack_charges (
  reference STRING PRIMARY KEY,
  invoice_id STRING NOT NULL,
  amount INT8 NOT NULL,
  claimed_by STRING NOT NULL,
  payment_id STRING,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
