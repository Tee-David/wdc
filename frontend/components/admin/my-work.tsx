import Link from "next/link";
import { Check, FolderKanban, Inbox } from "lucide-react";
import { getClient, getProjects, getTasks } from "@/lib/admin/store";
import { toggleTask } from "@/lib/admin/actions";
import { Form, Hidden } from "./form";
import { Empty, Panel, StagePill, when } from "./bits";

/**
 * MY WORK: what this person is answerable for, not the studio's whole board.
 *
 * Projects match by team account (`ownerIds`), or, for older records that only
 * carry a name, by that name. Tasks match by name (the assignee is still text).
 * Ticking is the same form the project page uses, so it works without script.
 */
export function MyWork({ me, unread, quietWhenEmpty = false }: { me: { id: string; name: string }; unread?: number; quietWhenEmpty?: boolean }) {
  const name = me.name.trim().toLowerCase();
  const names = (s: string) => s.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  const projects = getProjects().filter((p) =>
    p.stage !== "Delivered" && (p.ownerIds?.length ? p.ownerIds.includes(me.id) : names(p.owner).includes(name)));
  const mine = new Set(projects.map((p) => p.id));
  const projectTitle = new Map(getProjects().map((p) => [p.id, p.title]));
  const tasks = getTasks()
    .filter((t) => !t.done && (t.assignee.trim().toLowerCase() === name || (mine.has(t.projectId) && !t.assignee)))
    .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"))
    .slice(0, 6);

  /* The owner sees the studio's whole picture below; this row appears for them only when something is theirs. */
  if (quietWhenEmpty && !projects.length && !tasks.length) return null;

  return (
    <div className="adDash__row" data-tour="dash-mywork">
      <Panel title="My projects" action={<Link href="/admin/projects">All projects</Link>}>
        {projects.length ? (
          <ul className="adDash__list">
            {projects.slice(0, 6).map((p) => (
              <li key={p.id}>
                <Link href={`/admin/projects/${p.id}`}><b>{p.title}</b></Link>
                <small>{getClient(p.clientId)?.company ?? "Unknown client"} · {p.due ? `due ${when(p.due)}` : "no date yet"}</small>
                <StagePill stage={p.stage} />
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="Nothing is yours yet" icon={FolderKanban}>Projects where you are named as answerable show here.</Empty>
        )}
      </Panel>
      <Panel title="My tasks" action={unread ? <Link href="/admin/forms">{unread} unread {unread === 1 ? "entry" : "entries"}</Link> : undefined}>
        {tasks.length ? (
          <ul className="adDash__list">
            {tasks.map((t) => (
              <li key={t.id} style={{ display: "flex", gap: ".6rem", alignItems: "center" }}>
                <Form action={toggleTask}>
                  <Hidden name="id" value={t.id} />
                  <button type="submit" className="ad__tick" aria-label={`Tick off ${t.title}`}><Check aria-hidden="true" /></button>
                </Form>
                <span style={{ minWidth: 0 }}>
                  <b>{t.title}</b>
                  <small style={{ display: "block" }}>{projectTitle.get(t.projectId) ?? "A project"}{t.due ? ` · due ${when(t.due)}` : ""}</small>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="No tasks waiting" icon={Inbox}>Tasks assigned to you, or open on your projects with no one yet, show here.</Empty>
        )}
      </Panel>
    </div>
  );
}
