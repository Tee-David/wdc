import Link from "next/link";
import { SERVICES } from "@/lib/services";
import { getBoard, getClient, getClients, getProjects } from "@/lib/admin/store";
import { STAGES } from "@/lib/admin/types";
import { DemoNote, Empty, Panel, StagePill, when } from "@/components/admin/bits";
import { AddProject } from "@/components/admin/project-forms";
import { ProjectMenu } from "@/components/admin/row-actions";

export const metadata = { title: "Projects" };

/**
 * Every project, as a board by stage and as a list.
 *
 * THE BOARD IS COLUMNS OF CARDS, not a drag-and-drop. Dragging is the first
 * thing people expect and the last thing they need: it needs a pointer, it
 * needs a server round trip per drop, and moving a stage here has to write an
 * event and email the client. A stage is changed on the project itself, where
 * the note that goes with it can be written at the same time.
 */
export default function ProjectsPage() {
  const board = getBoard();
  const all = getProjects();

  return (
    <>
      <div className="ad__head">
        <div>
          <h1>Projects</h1>
          <p>{all.filter((p) => p.stage !== "Delivered").length} live, {all.length} in total.</p>
        </div>
        <AddProject clients={getClients()} />
      </div>

      <DemoNote>
        Opening a project and moving its stage are live. A stage change writes
        an event onto the project&apos;s history now, and will email the client
        from the same line in <code>moveStage()</code> once SMTP is in.
      </DemoNote>

      <div className="ad__scroll" style={{ marginBottom: ".9rem" }}>
        <div style={{ display: "grid", gridAutoFlow: "column", gridAutoColumns: "minmax(210px, 1fr)", gap: ".7rem" }}>
          {STAGES.map((st) => {
            const list = board.get(st) ?? [];
            return (
              <section key={st} className="ad__panel">
                <div className="ad__panelH">
                  <StagePill stage={st} />
                  <b className="ad__num ad__dim">{list.length}</b>
                </div>
                <div style={{ padding: ".5rem" }}>
                  {list.length ? list.map((p) => (
                    /* The card is a link and the menu is a button, so they
                       cannot be nested -- a button inside an anchor is invalid
                       and behaves differently in every browser. They are
                       siblings in one bordered row instead. */
                    <div
                      key={p.id}
                      className="ad__cardTop"
                      style={{
                        padding: ".5rem .35rem .5rem .6rem", borderRadius: "9px",
                        border: "1px solid var(--ad-line)", marginBottom: ".4rem",
                      }}
                    >
                      <Link href={`/admin/projects/${p.id}`} style={{ display: "block" }}>
                        <b>{p.title}</b>
                        <small className="ad__dim">{getClient(p.clientId)?.company}</small>
                      </Link>
                      <ProjectMenu project={p} clientName={getClient(p.clientId)?.company} />
                    </div>
                  )) : <p className="ad__dim" style={{ padding: ".4rem .6rem", margin: 0 }}>Empty</p>}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <Panel title="All projects">
        {all.length ? (
          <div className="ad__scroll">
            <table className="ad__t">
              <thead><tr><th>Project</th><th>Client</th><th>Service</th><th>Stage</th><th>Due</th><th>Last moved</th><th className="ad__rmH"><span className="ad__sr">Actions</span></th></tr></thead>
              <tbody>
                {all.map((p) => {
                  const last = p.events[p.events.length - 1];
                  return (
                    <tr key={p.id}>
                      <td><Link href={`/admin/projects/${p.id}`}><b>{p.title}</b></Link></td>
                      <td>{getClient(p.clientId)?.company ?? "Unknown"}</td>
                      <td>{SERVICES.find((x) => x.slug === p.service)?.short}</td>
                      <td><StagePill stage={p.stage} /></td>
                      <td className="num">{when(p.due)}</td>
                      <td className="num">{last ? when(last.at) : <span className="ad__dim">Never</span>}</td>
                      <td className="ad__rmC">
                        <ProjectMenu project={p} clientName={getClient(p.clientId)?.company} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No projects yet" action={<AddProject clients={getClients()} />}>
            Projects keep delivery, deadlines, files, and client updates together.
          </Empty>
        )}
      </Panel>
    </>
  );
}
