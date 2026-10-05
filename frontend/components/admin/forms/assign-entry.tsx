"use client";

import { Link2 } from "lucide-react";
import { assignEntry } from "@/lib/admin/actions";
import { SERVICES } from "@/lib/services";
import { Actions, Field, Fields, Form, Hidden, Radios, Select, Submit } from "../form";
import { DialogButton } from "../dialog";

/**
 * Assign a form entry to a client and, if wanted, a project. Works on every
 * form with entries (a brief, an enquiry, a built form). The client is an
 * existing one or a new one made from the entry; the project is none, an
 * existing one of that client, or a new one. The server checks all of it
 * again (assignEntry in lib/admin/actions.ts).
 */
export function AssignEntry({
  formKey, entryId, clients, projects, needsService, current, suggestedClientId, label = "Assign",
}: {
  formKey: string;
  entryId: string;
  clients: { id: string; company: string }[];
  projects: { id: string; title: string; clientName: string }[];
  /** The form does not say which service a project would be for. */
  needsService: boolean;
  current?: { clientId: string; projectId: string | null } | null;
  /** A client already on the books with this email or phone. */
  suggestedClientId?: string;
  label?: string;
}) {
  const existing = current?.clientId ?? suggestedClientId ?? "";
  return (
    <DialogButton label={label} title="Assign this entry" icon={Link2} tone="plain">
      {() => (
        <Form action={assignEntry}>
          <Fields>
            <Hidden name="form" value={formKey} />
            <Hidden name="id" value={entryId} />
            <Radios
              name="clientMode" label="Client" defaultValue={existing ? "existing" : "new"}
              options={[
                { value: "existing", label: "A client already on the books" },
                { value: "new", label: "A new client", note: "Made from this entry's name, company, email and phone. If they match someone already on the books, that client is used." },
              ]}
            />
            <Select name="clientId" label="Which client" placeholder="Choose a client" defaultValue={existing}
              options={clients.map((c) => ({ value: c.id, label: c.company }))} hint="Used when you pick an existing client above." />
            <Radios
              name="projectMode" label="Project" defaultValue={current?.projectId ? "existing" : "none"}
              options={[
                { value: "none", label: "No project yet" },
                { value: "existing", label: "A project already open", note: "It must belong to the client above." },
                { value: "new", label: "A new project", note: "Opened at Onboarding for the client above." },
              ]}
            />
            <Select name="projectId" label="Which project" placeholder="Choose a project" defaultValue={current?.projectId ?? ""}
              options={projects.map((p) => ({ value: p.id, label: `${p.title} (${p.clientName})` }))} hint="Used when you pick an existing project." />
            <Field name="projectTitle" label="New project name" placeholder="Leave empty to name it after the client" hint="Used when you pick a new project." />
            {needsService ? (
              <Select name="service" label="Service for a new project" placeholder="Choose a service"
                options={SERVICES.map((s) => ({ value: s.slug, label: s.name }))} />
            ) : null}
          </Fields>
          <Actions>
            <Submit icon={Link2}>Assign</Submit>
          </Actions>
        </Form>
      )}
    </DialogButton>
  );
}
