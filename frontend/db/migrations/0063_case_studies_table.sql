-- Case studies (2026-11-12). An older `case_studies` table (id, title, client, industry, problem, solution, results,
-- images, tags, featured, order) was already in the database before lib/work-db.ts, so that file's
-- CREATE TABLE IF NOT EXISTS never ran: the site kept showing the case studies from lib/work.ts, and saving or hiding
-- one in the admin failed on the missing `draft` column. The old table held no rows in production on 2026-11-12.
-- It is kept under a new name, not dropped, and the table the admin editor expects is created.
ALTER TABLE IF EXISTS case_studies RENAME TO case_studies_legacy;

CREATE TABLE IF NOT EXISTS case_studies (
  slug STRING PRIMARY KEY,
  draft JSONB NOT NULL,
  live JSONB,
  hidden BOOL NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by STRING NOT NULL DEFAULT '',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
