-- A department can have leads (owner, 2026-10-25: "Admin and department leads assign work").
-- A lead manages the projects of the clients their department looks after: assigns and
-- moves tasks and requests handovers, as a project owner can. Nothing else changes.
ALTER TABLE department_members ADD COLUMN IF NOT EXISTS lead BOOL NOT NULL DEFAULT false;
