"use client";

import { Archive, ArchiveRestore, Combine, Download, FilePlus2, Pencil, Trash2 } from "lucide-react";
import { useAdminRole } from "./shell";
import { can } from "@/lib/admin/permissions";
import type { Client } from "@/lib/admin/types";
import { archiveClient } from "@/lib/admin/actions";
import { Actions, Form, Hidden, Submit } from "./form";
import { RowMenu, type RowMenuItem } from "./row-menu";
import { EditClientBody, MergeBody } from "./client-form";
import { OpenProjectForm } from "./project-forms";
import { PermanentDelete } from "./permanent-delete";

/**
 * THE ⋮ IN A CLIENT'S HEAD: everything that is not the page's one action.
 * Edit, open a project, fold in a duplicate, archive or restore, and (from the
 * archive, owner only) delete for good. Each opens as a sheet. Archive says
 * what stays; restore says what comes back; nothing here is a one-press write.
 */
export function ClientChores({ client, likely, hasOthers }: {
  client: Client;
  likely: { id: string; company: string }[];
  hasOthers: boolean;
}) {
  const back = Boolean(client.archived);
  const owner = can(useAdminRole(), "settings");
  const items: RowMenuItem[] = [
    { kind: "dialog", label: "Edit details", icon: Pencil, wide: true, title: `Edit ${client.company}`, render: (close) => <EditClientBody client={client} close={close} /> },
    ...(!back ? [{ kind: "dialog" as const, area: "intake" as const, label: "New project", icon: FilePlus2, wide: true, title: `A project for ${client.company}`, render: () => <OpenProjectForm clientId={client.id} /> }] : []),
    ...(hasOthers && !client.mergedInto && !back ? [{
      kind: "dialog" as const, area: "destructive" as const, label: "Merge a duplicate", icon: Combine, title: `Fold a duplicate into ${client.company}`,
      render: (close: () => void) => <MergeBody keepId={client.id} keepName={client.company} likely={likely} close={close} />,
    }] : []),
    {
      kind: "dialog", area: "destructive", label: back ? "Put them back on the books" : "Archive them", icon: back ? ArchiveRestore : Archive, tone: back ? undefined : "danger",
      title: back ? `Restore ${client.company}` : `Archive ${client.company}`,
      render: (close) => (
        <Form action={archiveClient} onDone={() => close()}>
          <Hidden name="id" value={client.id} />
          {back ? <Hidden name="restore" value="1" /> : null}
          <p style={{ margin: 0 }}>
            {back
              ? `${client.company} goes back into the lists exactly as they were.`
              : `${client.company} drops out of the lists. Their projects, invoices and payments stay exactly as they are, because those are the record. Once archived, the owner can delete them for good.`}
          </p>
          <Actions>
            <button type="button" className="ad__btn" onClick={close}>Leave it</button>
            <Submit tone={back ? "primary" : "danger"} icon={back ? ArchiveRestore : Archive}>{back ? "Restore them" : "Archive them"}</Submit>
          </Actions>
        </Form>
      ),
    },
    ...(back ? [{
      kind: "dialog" as const, area: "settings" as const, label: "Delete permanently", icon: Trash2, tone: "danger" as const,
      title: `Delete ${client.company} permanently`, wide: true,
      render: (close: () => void) => <PermanentDelete kind="client" id={client.id} name={client.company} close={close} />,
    }] : []),
  ];
  /* Everything held about them, for a data request or a handover (the privacy export, logged). */
  if (owner) items.push(
    { kind: "link", label: "Export everything about them", href: `/admin/clients/${client.id}/export`, icon: Download },
    ...(client.email ? [{ kind: "link" as const, label: "Export forms and accounts (privacy)", href: `/admin/settings/privacy/export?email=${encodeURIComponent(client.email)}`, icon: Download }] : []),
  );
  return <RowMenu items={items} label={`${client.company}, more`} />;
}
