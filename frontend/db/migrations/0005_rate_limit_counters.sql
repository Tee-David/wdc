-- The shared counter, for anything that spends money per call.
--
-- WHY THIS EXISTS WHEN lib/rate-limit.ts ALREADY DOES. That one keeps its
-- counts in the memory of a single serverless instance, and says so in its own
-- header. Vercel spreads requests across instances that start and stop
-- constantly, so the real ceiling is the limit times the number of warm
-- instances, and a cold start forgives everything. For a contact form that is
-- a fine speed bump. For a PAID, METERED API KEY it is not a limit at all: the
-- number it protects is a bill, and a bill does not reset because a container
-- recycled.
--
-- A FIXED WINDOW, NOT A SLIDING ONE, and that is the whole reason this is
-- cheap enough to put in front of every lookup. A sliding window needs a row
-- per hit; this needs one row per bucket for the life of the bucket, and one
-- statement to both record a hit and find out whether it was allowed. The cost
-- of the choice is a boundary effect: a caller can spend the tail of one
-- window and the head of the next back to back. For a daily spend cap that is
-- irrelevant, and the per-caller burst is still held by the in-memory limiter
-- in front of it.
--
-- TWO KINDS OF BUCKET, and the second is the one that matters. `ip:<addr>`
-- stops one person hammering it. `global` stops EVERYONE hammering it, which
-- is the failure the in-memory limiter cannot see at all: a thousand different
-- callers making one call each is a thousand paid lookups and not one of them
-- trips a per-caller limit.
CREATE TABLE IF NOT EXISTS rate_limit_counters (
  -- Scope and subject in one string, e.g. 'cac:global' or 'cac:ip:1.2.3.4'.
  -- The scope is part of the key so a tool cannot spend another tool's
  -- allowance.
  bucket STRING PRIMARY KEY,
  -- The start of the window this count belongs to, floored to the window
  -- length. Rollover is a comparison against this rather than a scheduled job:
  -- a hit that arrives in a new window overwrites the count instead of adding
  -- to it, so an idle bucket needs nothing done to it to be correct again.
  window_start TIMESTAMPTZ NOT NULL,
  hits INT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The sweep's only query: everything last touched before a cutoff. Without it,
-- a per-IP bucket is a row that lives forever for a visitor who came once.
CREATE INDEX IF NOT EXISTS rate_limit_counters_stale_idx
  ON rate_limit_counters (updated_at);
