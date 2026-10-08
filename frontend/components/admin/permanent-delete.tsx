"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { deletePermanently, deletionImpact } from "@/lib/admin/actions";
import type { Impact } from "@/lib/admin/store";
import { Actions, Field, Fields, Form, Hidden, Submit } from "./form";

/**
 * THE SECOND STEP: delete for good, from the archive. Says what goes, what
 * stays and what blocks it before anything is typed; the name has to be typed,
 * and the button then asks once more ("I understand this cannot be undone").
 * The server checks all of it again.
 */
export function PermanentDelete({ kind, id, name, close }: { kind: "client" | "project"; id: string; name: string; close?: () => void }) {
  const [impact, setImpact] = useState<Impact | null | undefined>(undefined);
  useEffect(() => { let on = true; deletionImpact(kind, id).then((i) => on && setImpact(i)).catch(() => on && setImpact(null)); return () => { on = false; }; }, [kind, id]);

  if (impact === undefined) return <p className="ad__dim">Checking what depends on {name}…</p>;
  if (impact === null) return <p>That could not be checked just now. Nothing has been changed.</p>;
  return (
    <Form action={deletePermanently} onDone={close}
      confirm={`Delete ${name} permanently? This removes it and everything listed here for good. It cannot be undone.`}>
      <Hidden name="kind" value={kind} />
      <Hidden name="id" value={id} />
      <Fields>
        <div className="ad__note" role="note">
          <b>Goes with it</b>
          <ul>{impact.goes.map((g) => <li key={g}>{g}</li>)}</ul>
          <b>Stays</b>
          <ul>{impact.stays.map((g) => <li key={g}>{g}</li>)}</ul>
        </div>
        {impact.blocked ? (
          <p role="alert"><b>It cannot be deleted yet.</b> {impact.blocked}</p>
        ) : (
          <Field name="typed" label={`Type ${name} to confirm`} required hint="Archiving keeps everything and can be undone. This cannot." />
        )}
      </Fields>
      <Actions>
        <Submit tone="danger" icon={Trash2} disabled={Boolean(impact.blocked)}>Delete permanently</Submit>
      </Actions>
    </Form>
  );
}
