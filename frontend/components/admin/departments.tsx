"use client";

import { Pencil, Plus, Save, Trash2 } from "lucide-react";
import { addDepartment, editDepartment, removeDepartment, saveDepartmentMembers, saveClientDepartments } from "@/lib/admin/department-actions";
import { Actions, Checks, Field, Fields, Form, Hidden, Submit } from "./form";
import { RemoteChecks } from "./remote-pick";
import { DialogButton } from "./dialog";

export function AddDepartment() {
  return (
    <DialogButton label="New department" title="New department" icon={Plus}>
      {(close) => (
        <Form action={addDepartment} onDone={close}>
          <Fields><Field name="name" label="Name" required placeholder="Branding" hint="One word or two: Branding, SEO, Web, Social." /></Fields>
          <Actions><Submit icon={Plus}>Add department</Submit></Actions>
        </Form>
      )}
    </DialogButton>
  );
}

/** One department: who is in it, rename, remove. */
export function DepartmentBody({ id, name, members, clients }: {
  id: string; name: string;
  members: { id: string; name: string; active: boolean }[];
  /** Clients this department looks after. */
  clients: { id: string; company: string }[];
}) {
  /* The team is searched on the server, not listed: nobody is cut off past a fixed number. A person who left the studio stays in the chips, marked, so removing them is a choice. */
  const labels = Object.fromEntries(members.map((m) => [m.id, m.active ? m.name : `${m.name} (deactivated)`]));
  return (
    <div className="ad__stack" style={{ padding: "1rem 1.25rem" }}>
      {!members.some((m) => m.active) ? (
        <p role="note" className="ad__note"><b>Nobody active is in {name}.</b>{clients.length ? ` ${clients.length} client${clients.length === 1 ? " has" : "s have"} no one looking after them here.` : " Add someone below."}</p>
      ) : null}
      <Form action={saveDepartmentMembers}>
        <Hidden name="id" value={id} />
        <Fields>
          <RemoteChecks name="members" label="People in this department" kind="staff" placeholder="Search the team" addLabel="Add another person"
            defaultValue={members.map((m) => m.id)} defaultLabels={labels} hint="A person can be in more than one department." />
        </Fields>
        <Actions><Submit icon={Save}>Save people</Submit></Actions>
      </Form>
      <p className="ad__dim" style={{ margin: 0 }}>
        {clients.length ? <>Looks after: {clients.slice(0, 6).map((c) => c.company).join(", ")}{clients.length > 6 ? ` and ${clients.length - 6} more` : ""}.</> : "No clients assigned yet. Do that from a client's page."}
      </p>
      <div className="ad__row">
        <DialogButton label="Rename" title={`Rename ${name}`} icon={Pencil} tone="plain">
          {(close) => (
            <Form action={editDepartment} onDone={close}>
              <Hidden name="id" value={id} />
              <Fields><Field name="name" label="Name" required defaultValue={name} /></Fields>
              <Actions><Submit icon={Save}>Save name</Submit></Actions>
            </Form>
          )}
        </DialogButton>
        <Form action={removeDepartment} confirm={`Remove the ${name} department? Its people keep their accounts and only the grouping goes. This cannot be undone.`}>
          <Hidden name="id" value={id} />
          <Submit tone="danger" icon={Trash2}>Remove department</Submit>
        </Form>
      </div>
    </div>
  );
}

/** On a client's page: which departments look after them. */
export function ClientDepartments({ clientId, all, current }: { clientId: string; all: { id: string; name: string }[]; current: string[] }) {
  if (!all.length) return null;
  return (
    <Form action={saveClientDepartments}>
      <Hidden name="id" value={clientId} />
      <Fields><Checks name="departments" label="Departments looking after them" options={all.map((d) => ({ value: d.id, label: d.name }))} defaultValue={current} /></Fields>
      <Actions><Submit icon={Save}>Save</Submit></Actions>
    </Form>
  );
}
