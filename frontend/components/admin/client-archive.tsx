"use client";

import { Archive, ArchiveRestore } from "lucide-react";
import type { Client } from "@/lib/admin/types";
import { archiveClient } from "@/lib/admin/actions";
import { Form, Hidden, Submit } from "./form";

/**
 * Archive a client, rather than delete one.
 *
 * Their projects, invoices and payments reference them, and those are the
 * financial record. Removing the row would orphan the lot and quietly break
 * the year's reporting, so the row stays and drops out of the lists. The
 * button says "archive" because that is what it does, and a button that says
 * "delete" and archives is a button nobody trusts twice.
 */
export function ArchiveClient({ client }: { client: Client }) {
  const back = Boolean(client.archived);
  return (
    <Form
      action={archiveClient}
      confirm={back
        ? `Put ${client.company} back on the books?`
        : `Archive ${client.company}? They drop out of the lists. Their projects, invoices and payments stay exactly as they are.`}
    >
      <Hidden name="id" value={client.id} />
      {back ? <Hidden name="restore" value="1" /> : null}
      <Submit tone={back ? "plain" : "danger"} icon={back ? ArchiveRestore : Archive}>
        {back ? "Restore" : "Archive"}
      </Submit>
    </Form>
  );
}
