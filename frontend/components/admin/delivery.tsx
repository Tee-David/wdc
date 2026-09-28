"use client";

import { useRef, useState } from "react";
import { IconPicker } from "./icon-picker";
import { Check, FilePlus2, ListPlus, Loader2, Plus, Send, Trash2, Upload, X } from "lucide-react";
import {
  APPROVALS, CHANNELS, HEALTH, PRIORITIES, naira, taskIsWaiting,
  type Deliverable, type Project, type Task, type Update,
} from "@/lib/admin/types";
import {
  addDeliverableVersion, createDeliverable, createTask, moveApproval,
  postUpdate, removeTask, saveProjectDetails, toggleTask,
} from "@/lib/admin/actions";
import { Actions, Area, Field, Fields, Form, Hidden, Select, Submit, useFieldError } from "./form";
import { useAdminRole } from "./shell";
import { can } from "@/lib/admin/permissions";
import { DialogButton } from "./dialog";
import { ApprovalPill, Empty, HealthPill, Panel, when } from "./bits";
import { uploadToMedia } from "./media-upload";
import { MEDIA_ACCEPT } from "@/lib/media-validate";

/**
 * The delivery half of a project: what is left, what we have said, and what we
 * have handed over.
 *
 * ONE CLIENT FILE FOR THE WHOLE WORKSPACE rather than a component per panel.
 * These three panels share the same option lists, the same form kit and the
 * same idea of what a project is, and splitting them across three files bought
 * nothing except three sets of the same imports. The page that renders them is
 * still a server component; this is the only boundary it crosses.
 */

const HEALTH_OPTIONS = HEALTH.map((h) => ({ value: h, label: h }));
const CHANNEL_OPTIONS = CHANNELS.map((c) => ({ value: c, label: c }));
const PRIORITY_OPTIONS = PRIORITIES.map((p) => ({ value: p, label: p }));
/* "Not sent" is a state the system sets when a version is added, never an
   outcome somebody reports, so it is not offered here. */
const APPROVAL_OPTIONS = APPROVALS.filter((a) => a !== "Not sent").map((a) => ({ value: a, label: a }));

/* ------------------------------------------------------------------ tasks */

export function Tasks({ project, tasks }: { project: Project; tasks: Task[] }) {
  const open = tasks.filter((t) => !t.done).length;
  return (
    <Panel
      title={`What is left${open ? ` (${open})` : ""}`}
      dataTour="proj-tasks"
      action={
        <DialogButton label="Add a task" title="Add a task" icon={ListPlus} tone="plain">
          {(close) => (
            <Form action={createTask} onDone={close} resetOnDone>
              <Hidden name="projectId" value={project.id} />
              <Fields>
                <Field name="title" label="What needs doing" required
                       placeholder="Chase Tobi for a pick" />
                <Field name="assignee" label="Who has it" half
                       placeholder="Babatope"
                       hint="A name, not an account. There is no user table yet and pretending otherwise would be fiction." />
                <Field name="due" label="By when" type="date" half />
                <Select name="priority" label="Priority" half defaultValue="Normal"
                        options={PRIORITY_OPTIONS} />
                {/* Only OPEN tasks can be depended on: pointing at something
                    already finished describes a wait that is already over. */}
                <Select
                  name="blockedBy" label="Waits for" half placeholder="Nothing"
                  options={tasks.filter((t) => !t.done).map((t) => ({ value: t.id, label: t.title }))}
                  hint="Pick a task that has to finish first."
                />
              </Fields>
              <Actions><Submit>Add it</Submit></Actions>
            </Form>
          )}
        </DialogButton>
      }
    >
      {tasks.length ? (
        <ul className="ad__tasks">
          {tasks.map((t) => {
            const waiting = taskIsWaiting(t, tasks);
            const late = !t.done && t.due && new Date(t.due) < new Date();
            return (
              <li key={t.id} className={`ad__task${t.done ? " is-done" : ""}`}>
                {/* A REAL FORM, not a checkbox with an onChange. The tick is a
                    write: it appends to the project's history. A form means it
                    works before hydration, announces its pending state, and
                    cannot fire twice from one press. */}
                <Form action={toggleTask}>
                  <Hidden name="id" value={t.id} />
                  <button
                    type="submit"
                    className={`ad__tick${t.done ? " is-on" : ""}`}
                    aria-label={t.done ? `Reopen ${t.title}` : `Tick off ${t.title}`}
                  >
                    <Check aria-hidden="true" />
                  </button>
                </Form>

                <span className="ad__taskT">
                  <b>{t.title}</b>
                  <small>
                    {t.assignee ? <span>{t.assignee}</span> : <span className="ad__dim">Nobody yet</span>}
                    {t.due ? (
                      <span style={late ? { color: "var(--ad-bad, #d63333)", fontWeight: 600 } : undefined}>
                        {late ? "Overdue " : "Due "}{when(t.due)}
                      </span>
                    ) : null}
                    {t.priority !== "Normal" ? <span>{t.priority} priority</span> : null}
                    {waiting ? (
                      <span>Waits for &ldquo;{tasks.find((x) => x.id === t.blockedBy)?.title}&rdquo;</span>
                    ) : null}
                  </small>
                </span>

                <Form action={removeTask} confirm={`Remove "${t.title}"? This one is not kept.`}>
                  <Hidden name="id" value={t.id} />
                  <button type="submit" className="ad__iconButton" aria-label={`Remove ${t.title}`}>
                    <Trash2 aria-hidden="true" />
                  </button>
                </Form>
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty title="Nothing on the list">
          Tasks here are the short answer to &ldquo;what is left&rdquo;. Add the
          next thing somebody has to do.
        </Empty>
      )}
    </Panel>
  );
}

/* ---------------------------------------------------------------- updates */

export function Updates({ project, updates }: { project: Project; updates: Update[] }) {
  return (
    <Panel
      title="Updates"
      dataTour="proj-updates"
      action={
        <DialogButton label="Post an update" title="Post an update" icon={Send} tone="plain" wide>
          {(close) => (
            <Form action={postUpdate} onDone={close} resetOnDone>
              <Hidden name="projectId" value={project.id} />
              <Fields>
                <Field name="author" label="From" half placeholder="Babatope" />
                {/* Health is set HERE and nowhere else on this screen, so the
                    badge and the words can never disagree. See addUpdate(). */}
                <Select name="health" label="How is it going" half required
                        defaultValue={project.health} options={HEALTH_OPTIONS} />
                <Area name="progress" label="What moved" required rows={2}
                      placeholder="Three identity routes sent, each with the reasoning." />
                <Area name="blockers" label="What is in the way" rows={2}
                      placeholder="Leave this empty if nothing is."
                      hint="Empty is a real answer and the commonest one." />
                <Area name="next" label="What happens next" rows={2}
                      placeholder="Tobi picks a route. We build it out the same week." />
              </Fields>
              {/* NOT a Checks group: one box, and the label has to carry the
                  consequence rather than just the setting. */}
              <label className="ad__check ad__check--long">
                <input type="checkbox" name="clientVisible" value="yes" defaultChecked />
                <span>
                  The client can read this
                  <small>
                    Leave it unticked for a note that stays between us. Internal
                    notes never reach the portal.
                  </small>
                </span>
              </label>
              <Actions><Submit>Post it</Submit></Actions>
            </Form>
          )}
        </DialogButton>
      }
    >
      {updates.length ? (
        <ul className="ad__ups">
          {updates.map((u) => (
            <li key={u.id} className="ad__up">
              <div className="ad__upH">
                <HealthPill health={u.health} />
                <b>{u.author}</b>
                <time dateTime={u.at}>{when(u.at)}</time>
                <span className={`ad__pill ${u.clientVisible ? "ad__pill--good" : "ad__pill--flat"}`}>
                  {u.clientVisible ? "Client can see this" : "Internal"}
                </span>
              </div>
              <div className="ad__upB">
                <div><b>Progress</b><span>{u.progress}</span></div>
                {u.blockers ? <div><b>In the way</b><span>{u.blockers}</span></div> : null}
                {u.next ? <div><b>Next</b><span>{u.next}</span></div> : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Empty title="No updates yet">
          An update records what moved, what is stuck and what happens next, and
          says whether the client can read it.
        </Empty>
      )}
    </Panel>
  );
}

/* ----------------------------------------------------------- deliverables */

export function Deliverables({
  project, items, fileLinks = {},
}: {
  project: Project;
  items: Deliverable[];
  fileLinks?: Record<string, { open: string | null; download: string | null }>;
}) {
  return (
    <Panel
      title="Deliverables"
      dataTour="proj-deliverables"
      action={
        <DialogButton label="Add a deliverable" title="Add a deliverable" icon={FilePlus2} tone="plain">
          {(close) => <DeliverableForm projectId={project.id} onDone={close} />}
        </DialogButton>
      }
    >
      {items.length ? (
        <ul className="ad__dels">
          {items.map((d) => (
            <li key={d.id} className="ad__del">
              <div className="ad__delH">
                <b>{d.name}</b>
                <ApprovalPill approval={d.approval} />
                <span className="ad__dim" style={{ fontSize: ".8rem" }}>
                  v{d.versions[d.versions.length - 1]?.v ?? 1}
                </span>
              </div>

              <ol className="ad__vers">
                {d.versions.map((v) => (
                  <li key={v.v} className="ad__ver">
                    <b>v{v.v}</b>
                    <span>
                      {v.note}
                      {" "}
                      <span className="ad__dim">· {when(v.at)}</span>
                      {v.url ? (
                        <>
                          {" "}
                          {/* A LINK, NEVER AN `<img>` OR AN INLINE EMBED. A
                              deliverable can be an uploaded SVG, which is a
                              document format that can carry a `<script>`; a
                              link opens it on the storage domain, where it
                              cannot touch our origin. See the note beside
                              `svg` in `app/api/onboarding/upload/route.ts`. */}
                          <a href={v.url} target="_blank" rel="noopener noreferrer">Open</a>
                        </>
                      ) : null}
                      {v.files?.map((file) => {
                        const links = fileLinks[deliverableFileId(d.id, v.v, file.key)];
                        return (
                          <span className="adDelFile" key={file.key}>
                            <b>{file.name}</b>
                            {links?.open ? <a href={links.open} target="_blank" rel="noopener noreferrer">Open</a> : <span className="ad__dim">Unavailable</span>}
                            {links?.download ? <a href={links.download}>Download</a> : null}
                          </span>
                        );
                      })}
                    </span>
                  </li>
                ))}
              </ol>

              {d.approvalNote ? (
                <p className="ad__dim" style={{ margin: "0 0 .6rem", fontSize: ".86rem" }}>
                  They asked for: {d.approvalNote}
                </p>
              ) : null}

              <div className="ad__row">
                <DialogButton label="New version" title={`New version of ${d.name}`} icon={Plus} tone="plain">
                  {(close) => <DeliverableForm id={d.id} onDone={close} previousVersion={d.versions[d.versions.length - 1]?.v} />}
                </DialogButton>

                <DialogButton label="Record a response" title={`${d.name}: what happened`} tone="plain">
                  {(close) => (
                    <Form action={moveApproval} onDone={close}>
                      <Hidden name="id" value={d.id} />
                      <Fields>
                        <Select name="approval" label="What happened" required
                                placeholder="Pick one" options={APPROVAL_OPTIONS} />
                        <Area name="note" label="What they asked for" rows={2}
                              hint="Needed for a revision. A revision with no reason is not something anybody can act on." />
                      </Fields>
                      <Actions><Submit>Record it</Submit></Actions>
                    </Form>
                  )}
                </DialogButton>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Empty title="Nothing handed over yet">
          A deliverable keeps every version it has had, so the question
          &ldquo;which one did they approve&rdquo; still has an answer months
          later.
        </Empty>
      )}
    </Panel>
  );
}

const deliverableFileId = (deliverableId: string, version: number, key: string) => `${deliverableId}:${version}:${key}`;

function DeliverableForm({ projectId, id, onDone, previousVersion }: { projectId?: string; id?: string; onDone: () => void; previousVersion?: number }) {
  const [uploading, setUploading] = useState(false);
  const fresh = Boolean(projectId);
  return (
    <Form action={fresh ? createDeliverable : addDeliverableVersion} onDone={onDone} resetOnDone={fresh}>
      {projectId ? <Hidden name="projectId" value={projectId} /> : null}
      {id ? <Hidden name="id" value={id} /> : null}
      <Fields>
        {fresh ? <Field name="name" label="What it is" required placeholder="Identity routes" /> : null}
        <Area name="note" label={fresh ? "What this first version is" : "What changed"} required rows={2}
              placeholder={fresh ? "Three routes, each with rationale." : undefined} />
        <DeliverableUpload onBusyChange={setUploading} />
        <Field name="url" label="Add a link" placeholder="https://…"
               hint="Optional. Upload files, add a link, or do both." />
      </Fields>
      {!fresh ? <p className="ad__dim" style={{ fontSize: ".86rem" }}>
        A new version supersedes whatever the last one was told: an approval given for v{previousVersion} is not an approval of the next one, so this resets to &ldquo;not sent&rdquo;.
      </p> : null}
      <Actions><Submit disabled={uploading}>{uploading ? "Uploading files…" : fresh ? "Add it" : "Add the version"}</Submit></Actions>
    </Form>
  );
}

function DeliverableUpload({ onBusyChange }: { onBusyChange: (busy: boolean) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<{ name: string; key: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fieldError = useFieldError("files");

  const upload = async (picked: FileList | null) => {
    if (!picked?.length) return;
    const incoming = Array.from(picked).slice(0, Math.max(0, 10 - files.length));
    if (!incoming.length) { setError("A deliverable can have up to 10 uploaded files."); return; }
    setBusy(true); onBusyChange(true); setError("");
    const added: { name: string; key: string }[] = [];
    for (const file of incoming) {
      const done = await uploadToMedia(file);
      if (!done.ok) { setError(done.error); break; }
      added.push({ name: done.name, key: done.key });
    }
    if (added.length) setFiles((current) => [...current, ...added]);
    setBusy(false); onBusyChange(false);
    if (input.current) input.current.value = "";
  };

  return (
    <div className={`ad__f adDelUpload${fieldError || error ? " is-bad" : ""}`}>
      <span className="ad__fl">Upload file(s)</span>
      <input type="hidden" name="files" value={JSON.stringify(files)} />
      <label className="ad__btn adDelUpload__pick">
        {busy ? <Loader2 className="ad__spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
        {busy ? "Uploading" : "Choose files"}
        <input ref={input} type="file" accept={MEDIA_ACCEPT} multiple disabled={busy || files.length >= 10}
               onChange={(event) => { void upload(event.target.files); }} />
      </label>
      <small className="ad__fh">PNG, JPEG, WebP, AVIF, GIF, PDF, MP4 or WebM. Up to 10 files.</small>
      {files.length ? <ul className="adDelUpload__list">
        {files.map((file) => <li key={file.key}><span>{file.name}</span><button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((x) => x.key !== file.key))}><X aria-hidden="true" /></button></li>)}
      </ul> : null}
      {error || fieldError ? <small className="ad__fe" role="alert">{error || fieldError}</small> : null}
    </div>
  );
}

/* -------------------------------------------------------- the project card */

export function ProjectDetails({ project }: { project: Project }) {
  /* The budget is money: staff do not see it, and the action ignores it from them. */
  const money = can(useAdminRole(), "money");
  return (
    <DialogButton label="Edit details" title="Project details" wide>
      {(close) => (
        <Form action={saveProjectDetails} onDone={close}>
          <Hidden name="id" value={project.id} />
          <Fields>
            <Field name="owner" label="Who is answerable" half
                   defaultValue={project.owner} placeholder="Babatope" />
            <Select name="health" label="How is it going" half required
                    defaultValue={project.health} options={HEALTH_OPTIONS} />
            <Select name="channel" label="Where updates go" half required
                    defaultValue={project.channel} options={CHANNEL_OPTIONS}
                    hint="The route agreed with this client, so nobody has to guess where to post." />
            {money ? (
              <Field
                name="budget" label="Agreed budget" half inputMode="decimal"
                defaultValue={project.budget === null ? "" : String(project.budget / 100)}
                placeholder="630000"
                hint="Naira. Leave it empty when no figure has been agreed; empty is not the same as zero."
              />
            ) : null}
            <Area name="scope" label="What was bought" rows={2} defaultValue={project.scope ?? ""}
                  placeholder="Logo, palette, type scale and a short guideline set."
                  hint="In words the client would recognise, because this is what an argument gets settled against." />
            <IconPicker defaultValue={project.icon} />
          </Fields>
          <Actions><Submit>Save</Submit></Actions>
        </Form>
      )}
    </DialogButton>
  );
}

/** Read by the workspace header, kept here so the naira formatting is not
    duplicated into a server component that would import the whole kit. */
export function budgetLabel(project: Project) {
  return project.budget === null ? "No figure agreed" : naira(project.budget);
}
