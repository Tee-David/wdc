"use client";

import { CircleDot, Eye, OctagonAlert, RotateCcw, Users, FolderKanban } from "lucide-react";
import { RowMenu, type RowMenuItem } from "./row-menu";
import { Actions, Area, Form, Hidden, Submit } from "./form";
import { setTaskState } from "@/lib/admin/actions";
import type { TaskState } from "@/lib/admin/types";

/** One press that moves a task, said in a sentence first (the row menu never fires on click). */
function Move({ id, state, verb, close, children }: { id: string; state: TaskState; verb: string; close: () => void; children: string }) {
  return (
    <Form action={setTaskState} onDone={() => close()}>
      <div className="ad__sure"><p>{children}</p></div>
      <Hidden name="id" value={id} /><Hidden name="state" value={state} />
      <Actions><button type="button" className="ad__btn" onClick={close}>Leave it</button><Submit>{verb}</Submit></Actions>
    </Form>
  );
}

/** My Day's row menu: move the task along, say what blocks it, hand it over or open its project. */
export function TaskRowMenu({ id, title, state, done, projectId }: { id: string; title: string; state: TaskState; done: boolean; projectId: string }) {
  const items: RowMenuItem[] = [
    ...(!done && state !== "doing" ? [{ kind: "dialog" as const, label: "Start it", icon: CircleDot, title: `Start "${title}"`,
      render: (close: () => void) => <Move id={id} state="doing" verb="Start it" close={close}>It shows as in progress to the team on the project.</Move> }] : []),
    ...(!done && state !== "review" ? [{ kind: "dialog" as const, label: "Send for review", icon: Eye, title: `Send "${title}" for review`,
      render: (close: () => void) => <Move id={id} state="review" verb="Send for review" close={close}>The project&apos;s leads are told it is ready for a look before it goes further.</Move> }] : []),
    ...(!done && state !== "blocked" ? [{ kind: "dialog" as const, label: "Mark blocked", icon: OctagonAlert, title: `What is "${title}" waiting on?`,
      render: (close: () => void) => (
        <Form action={setTaskState} onDone={() => close()}>
          <Hidden name="id" value={id} /><Hidden name="state" value="blocked" />
          <Area name="note" label="What it is waiting on" rows={3} required placeholder="Instagram access from the client" />
          <Actions><Submit>Mark blocked</Submit></Actions>
        </Form>
      ) }] : []),
    ...(!done && state !== "todo" ? [{ kind: "dialog" as const, label: "Back to To do", icon: RotateCcw, title: `Move "${title}" back to To do`,
      render: (close: () => void) => <Move id={id} state="todo" verb="Move it back" close={close}>It goes back to the list of things not started.</Move> }] : []),
    { kind: "link", label: "Hand over", href: `/admin/projects/${projectId}?tab=activity`, icon: Users },
    { kind: "link", label: "Open the project", href: `/admin/projects/${projectId}`, icon: FolderKanban },
  ];
  return <RowMenu items={items} label={title} />;
}
