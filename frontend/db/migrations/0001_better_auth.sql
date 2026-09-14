CREATE TABLE IF NOT EXISTS "user" (
  "id" STRING PRIMARY KEY,
  "name" STRING NOT NULL,
  "email" STRING NOT NULL,
  "emailVerified" BOOL NOT NULL DEFAULT false,
  "image" STRING NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- 'client', the least access, matching lib/auth.ts and lib/db/schema.ts.
  -- It said 'staff' here; 0003_role_default_client.sql fixes the databases
  -- that were created before this line was corrected.
  "role" STRING NOT NULL DEFAULT 'client'
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_email_uidx" ON "user" ("email");

CREATE TABLE IF NOT EXISTS "session" (
  "id" STRING PRIMARY KEY,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "token" STRING NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "ipAddress" STRING NULL,
  "userAgent" STRING NULL,
  "userId" STRING NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "session_token_uidx" ON "session" ("token");
CREATE INDEX IF NOT EXISTS "session_user_idx" ON "session" ("userId");

CREATE TABLE IF NOT EXISTS "account" (
  "id" STRING PRIMARY KEY,
  "accountId" STRING NOT NULL,
  "providerId" STRING NOT NULL,
  "userId" STRING NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "accessToken" STRING NULL,
  "refreshToken" STRING NULL,
  "idToken" STRING NULL,
  "accessTokenExpiresAt" TIMESTAMPTZ NULL,
  "refreshTokenExpiresAt" TIMESTAMPTZ NULL,
  "scope" STRING NULL,
  "password" STRING NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "account_user_idx" ON "account" ("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "account_provider_account_uidx" ON "account" ("providerId", "accountId");

CREATE TABLE IF NOT EXISTS "verification" (
  "id" STRING PRIMARY KEY,
  "identifier" STRING NOT NULL,
  "value" STRING NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier");
