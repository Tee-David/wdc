-- Explicit project membership; storing a contact name never grants access.
CREATE TABLE IF NOT EXISTS workspace_project_members (
  project_id STRING NOT NULL,
  user_id STRING NOT NULL,
  can_manage BOOL NOT NULL DEFAULT false,
  can_review BOOL NOT NULL DEFAULT false,
  can_billing BOOL NOT NULL DEFAULT false,
  granted_by STRING NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  PRIMARY KEY (project_id,user_id)
);
CREATE INDEX IF NOT EXISTS workspace_project_members_user ON workspace_project_members(user_id,revoked_at);
-- Immutable decisions for the existing deliverable model.
CREATE TABLE IF NOT EXISTS workspace_deliverable_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id STRING NOT NULL,
  deliverable_id STRING NOT NULL,
  version INT NOT NULL,
  decision STRING NOT NULL CHECK(decision IN ('Approved','Revision requested')),
  actor_id STRING NOT NULL,
  actor_name STRING NOT NULL,
  note STRING NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS workspace_deliverable_decisions_item ON workspace_deliverable_decisions(deliverable_id,version,created_at);
CREATE TABLE IF NOT EXISTS workspace_deliverable_reviews (
  deliverable_id STRING PRIMARY KEY,
  project_id STRING NOT NULL,
  version INT NOT NULL,
  shared_at TIMESTAMPTZ NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  shared_by STRING NOT NULL,
  CHECK(version>0),
  CHECK(due_at>=shared_at)
);
