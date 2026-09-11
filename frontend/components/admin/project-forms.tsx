"use client";

import { CalendarDays, MessageSquarePlus, Plus } from "lucide-react";
import { SERVICES } from "@/lib/services";
import { STAGES, type Client, type Project } from "@/lib/admin/types";
import { addNote, createProject, moveStage, setDue } from "@/lib/admin/actions";
import { Actions, Area, Field, Fields, Form, Hidden, Select, Submit } from "./form";
import { DialogButton } from "./dialog";

const SERVICE_OPTIONS = SERVICES.map((s) => ({ value: s.slug, label: s.short }));
const STAGE_OPTIONS = STAGES.map((s) => ({ value: s, label: s }));

export function AddProject({
  clients, clientId,
}: {
  clients: Pick<Client, "id" | "company">[];
  /** Fixed when opened from a client's own page, chosen otherwise. */
  clientId?: string;
}) {
  return (
    <DialogButton label="New project" title="Open a project" icon={Plus} wide>
      {/* createProject redirects to the project it opened. */}
      {() => (
        <Form action={createProject}>
          <Fields>
            {clientId ? (
              <Hidden name="clientId" value={clientId} />
            ) : (
              <Select
                name="clientId" label="For" required placeholder="Pick a client"
                options={clients.map((c) => ({ value: c.id, label: c.company }))}
              />
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
            <StageButton label={s} done={done} />
          </Form>
        );
      })}
    </div>
  );
}

/* Its own component so useFormStatus reads the form it sits in rather than
   the page. That is the whole rule of that hook and the usual way it is got
   wrong. */
function StageButton({ label, done }: { label: string; done: boolean }) {
  return (
    <button type="submit" className={`ad__stageBtn${done ? " is-done" : ""}`}>
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
