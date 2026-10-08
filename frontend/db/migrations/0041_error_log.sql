-- Server errors, one row per distinct error per day (Next's onRequestError). Kept 30 days.
CREATE TABLE IF NOT EXISTS error_log (
  id TEXT PRIMARY KEY,
  digest TEXT NOT NULL,
  day DATE NOT NULL DEFAULT current_date,
  message TEXT NOT NULL,
  stack TEXT,
  path TEXT,
  method TEXT,
  route_type TEXT,
  count INT NOT NULL DEFAULT 1,
  first_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS error_log_digest_day ON error_log (digest, day);
CREATE INDEX IF NOT EXISTS error_log_last ON error_log (last_at DESC);
