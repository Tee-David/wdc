-- The admin's records (clients, projects, money, tickets, work) until each
-- gets its own table: one row per record, the record itself as JSON.
--
-- WHY ONE TABLE AND NOT FIFTEEN, today: the screens read these through
-- lib/admin/store.ts, whose functions are synchronous and whose shapes are
-- lib/admin/types.ts. Keeping the shapes and making them durable is one
-- module (lib/admin/persist.ts); fifteen tables and an async rewrite of every
-- caller is the later, larger job the checklist still carries.
--
-- `seq` rises on every write, so an instance asks only for what changed since
-- it last looked. `ord` is the seq a record was first written at, which keeps
-- the lists in the order the records were made. A NULL `data` is a deletion,
-- kept so another instance learns about it.
CREATE SEQUENCE IF NOT EXISTS admin_records_seq;

CREATE TABLE IF NOT EXISTS admin_records (
  collection STRING NOT NULL,
  id STRING NOT NULL,
  data JSONB,
  seq INT8 NOT NULL,
  ord INT8 NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (collection, id)
);

CREATE INDEX IF NOT EXISTS admin_records_seq_idx ON admin_records (seq);
