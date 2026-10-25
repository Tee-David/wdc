-- A team chat message can answer an earlier message in the same chat (swipe or the reply arrow in Messages).
-- Project notes already carry reply_to (0051); client questions keep theirs in the studio store.
ALTER TABLE team_messages ADD COLUMN IF NOT EXISTS reply_to UUID NULL;
