-- Versioned service work. Nothing is client-visible until deliberately shared.
CREATE TABLE IF NOT EXISTS workspace_service_items (
 id UUID PRIMARY KEY, project_id TEXT NOT NULL, service TEXT NOT NULL,
 kind TEXT NOT NULL, title TEXT NOT NULL, visibility TEXT NOT NULL DEFAULT 'internal',
 state TEXT NOT NULL DEFAULT 'draft', revision INT NOT NULL DEFAULT 1,
 version INT NOT NULL DEFAULT 1, data JSONB NOT NULL DEFAULT '{}',
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CONSTRAINT service_visibility CHECK (visibility IN ('internal','shared')),
 CONSTRAINT service_revision CHECK (revision > 0 AND version > 0),
 CONSTRAINT service_name CHECK (service IN ('social','branding','web','apps','software','seo','ads'))
);
CREATE INDEX IF NOT EXISTS workspace_service_project ON workspace_service_items(project_id,updated_at DESC);
CREATE TABLE IF NOT EXISTS workspace_service_versions (
 item_id UUID NOT NULL REFERENCES workspace_service_items(id), version INT NOT NULL,
 title TEXT NOT NULL, data JSONB NOT NULL, actor_id TEXT NOT NULL, visibility TEXT NOT NULL DEFAULT 'internal',
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY(item_id,version)
);
CREATE TABLE IF NOT EXISTS workspace_service_decisions (
 id UUID PRIMARY KEY, item_id UUID NOT NULL REFERENCES workspace_service_items(id),
 version INT NOT NULL, decision TEXT NOT NULL, actor_id TEXT NOT NULL,
 actor_name TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 FOREIGN KEY(item_id,version) REFERENCES workspace_service_versions(item_id,version),
 CONSTRAINT service_decision CHECK (decision IN ('approved','changes_requested','accepted','declined','acknowledged'))
);
CREATE TABLE IF NOT EXISTS workspace_service_notes (
 id UUID PRIMARY KEY, item_id UUID NOT NULL REFERENCES workspace_service_items(id),
 version INT NOT NULL, actor_id TEXT NOT NULL, actor_name TEXT NOT NULL,
 body TEXT NOT NULL, context TEXT NOT NULL DEFAULT '', resolved BOOL NOT NULL DEFAULT false,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 FOREIGN KEY(item_id,version) REFERENCES workspace_service_versions(item_id,version)
);
CREATE TABLE IF NOT EXISTS workspace_service_activity (
 id UUID PRIMARY KEY, item_id UUID NOT NULL REFERENCES workspace_service_items(id),
 version INT NOT NULL, actor_name TEXT NOT NULL, action TEXT NOT NULL,
 details JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 FOREIGN KEY(item_id,version) REFERENCES workspace_service_versions(item_id,version)
);
