"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
import { assignEntry } from "@/lib/admin/actions";
import { SERVICES } from "@/lib/services";
import { Actions, Field, Fields, Form, Hidden, Select, Submit, Wrap } from "../form";
import { Pick } from "../pick";
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
  projects: { id: string; title: string; clientName: string; clientId?: string }[];
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
      {() => <AssignBody {...{ formKey, entryId, clients, projects, needsService, current, existing }} />}
    </DialogButton>
  );
}

const NEW = "__new";
const NONE = "__none";

function AssignBody({ formKey, entryId, clients, projects, needsService, current, existing }: {
  formKey: string; entryId: string; clients: { id: string; company: string }[];
  projects: { id: string; title: string; clientName: string; clientId?: string }[];
  needsService: boolean; current?: { clientId: string; projectId: string | null } | null; existing: string;
}) {
  const [client, setClient] = useState(existing || NEW);
  const [project, setProject] = useState(current?.projectId ?? NONE);
  const isNewClient = client === NEW;
  /* Projects of the chosen client only; a new client has none yet. */
  const mine = isNewClient ? [] : projects.filter((p) => !p.clientId || p.clientId === client);
  const projectOk = project === NONE || project === NEW || mine.some((p) => p.id === project);
  const shownProject = projectOk ? project : NONE;
  return (
    <Form action={assignEntry}>
      <Fields>
        <Hidden name="form" value={formKey} />
        <Hidden name="id" value={entryId} />
        <Hidden name="clientMode" value={isNewClient ? "new" : "existing"} />
        <Hidden name="clientId" value={isNewClient ? "" : client} />
        <Hidden name="projectMode" value={shownProject === NONE ? "none" : shownProject === NEW ? "new" : "existing"} />
        <Hidden name="projectId" value={shownProject === NONE || shownProject === NEW ? "" : shownProject} />
        <Wrap name="clientId" label="Whose is this?" hint={isNewClient
          ? "A new client is made from this entry's name, company, email and phone. If they match someone already on the books, that client is used instead."
          : "Search the clients already on the books, or make a new one from this entry."}>
          {(id) => (
            <Pick id={id} search value={client} onChange={setClient} label="Client"
              options={[{ value: NEW, label: "+ A new client from this entry" }, ...clients.map((c) => ({ value: c.id, label: c.company }))]} />
          )}
        </Wrap>
        <Wrap name="projectId" label="Is there a project?" hint={isNewClient && shownProject === NONE ? "You can open one later from the client." : undefined}>
          {(id) => (
            <Pick id={id} value={shownProject} onChange={setProject} label="Project"
              options={[
                { value: NONE, label: "No project yet" },
                { value: NEW, label: "Open a new project (starts at Onboarding)" },
                ...mine.map((p) => ({ value: p.id, label: p.title })),
              ]} />
          )}
        </Wrap>
        {shownProject === NEW ? (
          <>
            <Field name="projectTitle" label="Project name" placeholder="Leave empty to name it after the client" />
            {needsService ? (
              <Select name="service" label="Which service is it for?" placeholder="Choose a service"
                options={SERVICES.map((s) => ({ value: s.slug, label: s.name }))} />
            ) : null}
          </>
        ) : null}
      </Fields>
      <Actions>
        <Submit icon={Link2}>Assign</Submit>
      </Actions>
    </Form>
  );
}
