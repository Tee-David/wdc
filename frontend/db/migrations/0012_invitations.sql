-- An invitation to have an account: a client to their portal, or a member of
-- staff to the admin. Sign-up is shut everywhere else (lib/auth.ts), so this
-- is the only way a new account comes into being apart from the owner seed.
--
-- BOUND TO ONE ADDRESS. `email` is normalised (trimmed, lower case) when the
-- invitation is made, and the account created from it gets exactly that
-- address -- the redemption page never asks for one, so a forwarded link
-- cannot register somebody else.
--
-- ONLY A HASH OF THE TOKEN. The link carries the token; this table carries
-- its SHA-256. A copy of the table is a list of fingerprints, not a list of
-- ways into the site.
--
-- ONCE, AND NOT FOREVER. `redeemed_at` is set in the same transaction that
-- creates the account, and a row with it set, a revoked row, or one past
-- `expires_at` redeems nothing.
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash STRING NOT NULL UNIQUE,
  email STRING NOT NULL,
  name STRING NOT NULL DEFAULT '',
  role STRING NOT NULL,
  -- The admin's client record this portal account belongs to. The portal
  -- finds a client by the signed-in email, which is this invitation's email.
  client_id STRING NULL,
  invited_by STRING NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  redeemed_at TIMESTAMPTZ NULL,
  redeemed_user_id STRING NULL,
  revoked_at TIMESTAMPTZ NULL,
  revoked_by STRING NULL,
  CONSTRAINT invitations_role_check CHECK (role IN ('client', 'staff'))
);

CREATE INDEX IF NOT EXISTS invitations_email_idx ON invitations (email);
CREATE INDEX IF NOT EXISTS invitations_client_idx ON invitations (client_id);
