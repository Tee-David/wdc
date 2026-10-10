"use client";

import { CalendarDays, MessageSquarePlus, Plus } from "lucide-react";
import { SERVICES } from "@/lib/services";
import { CHANNELS, STAGES, type Project } from "@/lib/admin/types";
import { addNote, createProject, moveStage, setDue } from "@/lib/admin/actions";
import { useState } from "react";
import { Actions, Area, Field, Fields, Form, Hidden, Select, Submit, Wrap } from "./form";
import { RemotePick } from "./remote-pick";
import { useAdminRole } from "./shell";
import { can } from "@/lib/admin/permissions";
import { DialogButton } from "./dialog";
import { NoClientsYet } from "./no-clients";
import { IconPicker } from "./icon-picker";
import { OwnerField } from "./owner-field";
import { confirmClick } from "./confirm";

const SERVICE_OPTIONS = SERVICES.map((s) => ({ value: s.slug, label: s.short }));
const STAGE_OPTIONS = STAGES.map((s) => ({ value: s, label: s }));
const CHANNEL_OPTIONS = CHANNELS.map((c) => ({ value: c, label: c }));

export function AddProject({
  hasClients = true, clientId, dataTour,
}: {
  /** Whether there is anyone to open a project for. The clients themselves are searched on the server as the person types. */
  hasClients?: boolean;
  /** Fixed when opened from a client's own page, chosen otherwise. */
  clientId?: string;
  dataTour?: string;
}) {
  const money = can(useAdminRole(), "money");
  const [who, setWho] = useState("");
  return (
    <DialogButton label="New project" title="Open a project" icon={Plus} wide dataTour={dataTour}>
      {/* createProject redirects to the project it opened. */}
      {() => (!clientId && !hasClients ? <NoClientsYet what="project" /> :
        <Form action={createProject}>
          <Fields>
            {clientId ? (
              <Hidden name="clientId" value={clientId} />
            ) : (
              <>
                <Hidden name="clientId" value={who} />
                <Wrap name="clientId" label="For" required>
                  {(id) => (
                    <RemotePick id={id} kind="clients" value={who} onChange={setWho} placeholder="Pick a client" label="For"
                      lead={[{ value: "__new", label: "+ Add a new client" }]} />
                  )}
                </Wrap>
                {who === "__new" ? (
                  <>
                    <Field name="newClientCompany" label="New client: company or name" required half placeholder="Hesed Wisdom LLC" />
                    <Field name="newClientName" label="Contact person" half placeholder="Ada Obi" />
                    <Field name="newClientEmail" label="Email" half type="email" hint="If they are already a client by this email, that client is used." />
                    <Field name="newClientPhone" label="Phone" half />
                  </>
                ) : null}
              </>
            )}
            <Field name="title" label="What it is" required half
                   placeholder="Identity system" />
            <Select name="service" label="Service" required half placeholder="Pick one"
                    options={SERVICE_OPTIONS} />
            <Select name="stage" label="Starting at" half defaultValue="Onboarding"
                    options={STAGE_OPTIONS}
                    hint="Most work starts at Onboarding, while the form is still out." />
            <Field name="due" label="Due" type="date" half
                   hint="Leave it empty until a date is actually agreed." />
            {/* ASKED AT THE START, BECAUSE NOBODY COMES BACK TO FILL THEM IN.
                An owner, a budget and a channel set on the day a project opens
                are three questions nobody has to chase a week later, and the
                attention queue is only as good as the owner field behind it.
                All optional: a project opened before the figure is agreed is a
                real case, and forcing a number here would mean somebody typing
                a guess that later reads as an agreement. */}
            <OwnerField half />
            <Select name="channel" label="Where updates go" half
                    defaultValue="Client portal" options={CHANNEL_OPTIONS}
                    hint="Change it once a route is agreed with the client." />
            {money ? (
              <Field name="budget" label="Agreed budget" half inputMode="decimal"
                     placeholder="630000"
                     hint="Naira. Leave it empty when nothing is agreed; empty is not zero." />
            ) : null}
            <Area name="scope" label="What was bought" rows={2}
                  placeholder="Logo, palette, type scale and a short guideline set."
                  hint="In words the client would recognise. This is what an argument gets settled against." />
            <IconPicker />
          </Fields>
          <Actions>
            <Submit icon={Plus}>Open it</Submit>
          </Actions>
        </Form>
      )}
    </DialogButton>
  );
}

/**
 * Moving a project along, as the row of stages it actually is.
 *
 * NOT A DROPDOWN. The stages are a short ordered path and the useful question
 * is "where is this and what is next", which a row answers at a glance and a
 * closed select hides behind a click. The current one is marked and cannot be
 * pressed, so the control never offers a move that does nothing.
 *
 * Each stage is its own single-button form, so the whole thing works with no
 * JavaScript at all: six forms posting to the same action with a different
 * hidden value.
 */
export function StageMover({ project }: { project: Project }) {
  const at = STAGES.indexOf(project.stage);

  return (
    <div className="ad__stages" role="group" aria-label="Move this project">
      {STAGES.map((s, i) => {
        const on = s === project.stage;
        const done = i < at;
        if (on) {
          return (
            <span key={s} className="ad__stageBtn is-on" aria-current="step">
              {s}
            </span>
          );
        }
        return (
          <Form key={s} action={moveStage} className="ad__stageF">
            <Hidden name="id" value={project.id} />
            <Hidden name="stage" value={s} />
            <StageButton label={s} done={done} project={project} />
          </Form>
        );
      })}
    </div>
  );
}

/* Its own component so useFormStatus reads the form it sits in rather than
   the page. That is the whole rule of that hook and the usual way it is got
   wrong. */
function StageButton({ label, done, project }: { label: string; done: boolean; project: Project }) {
  return (
    <button type="submit" className={`ad__stageBtn${done ? " is-done" : ""}`} onClick={event=>confirmClick(event,`Move project ${project.title} from ${project.stage} to ${label}? The stage will be saved and the people on this project may receive an update.`)}>
      {label}
    </button>
  );
}

export function AddNote({ project }: { project: Project }) {
  return (
    <Form action={addNote} resetOnDone>
      <Fields>
        <Hidden name="id" value={project.id} />
        <Area name="note" label="Add to the history" rows={2}
              placeholder="Sent the second round of routes." />
      </Fields>
      <Actions>
        <Submit tone="plain" icon={MessageSquarePlus}>Add it</Submit>
      </Actions>
    </Form>
  );
}

export function SetDue({ project }: { project: Project }) {
  return (
    <Form action={setDue}>
      <Fields>
        <Hidden name="id" value={project.id} />
        <Field name="due" label="Due date" type="date"
               defaultValue={project.due ? project.due.slice(0, 10) : ""}
               hint="Clear the field and save to remove it." />
      </Fields>
      <Actions>
        <Submit tone="plain" icon={CalendarDays}>Set it</Submit>
      </Actions>
    </Form>
  );
}
