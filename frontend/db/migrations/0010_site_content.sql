-- Public copy the studio edits from the admin, stored as an override over
-- what shipped in lib/.
--
-- ONE ROW PER PIECE OF CONTENT, keyed by name ('faq'), holding the whole
-- list as JSONB. The list is small, it is always read whole, and its order is
-- part of its meaning, so rows per question would buy nothing.
--
-- NO ROW MEANS "WHAT SHIPPED". Resetting deletes the row, so the shipped copy
-- in lib/ is always one press away and never has to be re-typed.
CREATE TABLE IF NOT EXISTS site_content (
  key STRING PRIMARY KEY,
  value JSONB NOT NULL,
  saved_by STRING NOT NULL,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
