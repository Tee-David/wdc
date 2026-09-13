import Link from "next/link";
import { SERVICES } from "@/lib/services";
import {
  getBoard, getClient, getClients, getProjects, getTasks,
} from "@/lib/admin/store";
import { HEALTH, STAGES, projectAttention, type Project } from "@/lib/admin/types";
import {
  AttentionPills, DemoNote, Empty, HealthPill, Panel, StagePill, when,
} from "@/components/admin/bits";
import { AddProject } from "@/components/admin/project-forms";
import { ProjectMenu } from "@/components/admin/row-actions";

export const metadata = { title: "Projects" };

/**
 * Every project, as a board by stage or as a list.
 *
 * THE BOARD IS COLUMNS OF CARDS, not a drag-and-drop. Dragging is the first
 * thing people expect and the last thing they need: it needs a pointer, it
 * needs a server round trip per drop, and moving a stage here has to write an
 * event and email the client. A stage is changed on the project itself, where
 * the note that goes with it can be written at the same time.
 *
 * EVERY FILTER IS IN THE URL AND NOTHING HERE IS A CLIENT COMPONENT. The
 * controls are a plain GET form: choosing a value submits, the browser
 * navigates, and the server renders the filtered page. That buys three things
 * a `useState` version would not. A filtered view can be sent to somebody. The
 * back button undoes a filter, which is what everybody expects it to do. And
 * the whole screen ships no JavaScript for its own filtering, on a page whose
 * job is to be opened forty times a day.
 */

type Query = {
  stage?: string; service?: string; owner?: string; health?: string; view?: string;
};

/** A link that keeps every filter except the one it is changing. */
function withQuery(q: Query, patch: Query) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...q, ...patch })) {
    if (v) next.set(k, v);
  }
  const s = next.toString();
  return `/admin/projects${s ? `?${s}` : ""}`;
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const q = await searchParams;

  /* Every one of these is checked against the closed set it belongs to rather
     than used as typed. A query string is user input on a page that renders
     whatever it is given. */
  const stage = STAGES.find((s) => s === q.stage);
  const service = SERVICES.find((s) => s.slug === q.service);
  const health = HEALTH.find((h) => h === q.health);
  const board = q.view !== "list";

  const projects = getProjects();
  const tasks = getTasks();

  /* Owners come from the projects themselves rather than a list somewhere:
     there is no user table yet, and offering names nobody is using would be
     inventing staff. */
  const owners = [...new Set(projects.map((p) => p.owner).filter(Boolean))].sort();
  const owner = owners.find((o) => o === q.owner);

  const match = (p: Project) =>
    (!stage || p.stage === stage) &&
    (!service || p.service === service.slug) &&
    (!health || p.health === health) &&
    (!owner || p.owner === owner);

  const all = projects.filter(match);
  const filtered = !!(stage || service || health || owner);
  const live = all.filter((p) => p.stage !== "Delivered").length;

  return (
    <>
      <div className="ad__head">
        <div>
          <h1>Projects</h1>
          <p>
            {filtered
              ? `${all.length} of ${projects.length} shown.`
              : `${live} live, ${projects.length} in total.`}
          </p>
        </div>
        <div className="ad__row">
          {/* Two links styled as one control. Server-rendered from the URL, so
              the choice survives a reload and can be linked to. */}
          <span className="ad__switch">
            <Link href={withQuery(q, { view: "" })} aria-current={board}>Board</Link>
            <Link href={withQuery(q, { view: "list" })} aria-current={!board}>List</Link>
          </span>
          <AddProject clients={getClients()} />
        </div>
      </div>

      <DemoNote>
        Opening a project and moving its stage are live. A stage change writes
        an event onto the project&apos;s history now, and will email the client
        from the same line in <code>moveStage()</code> once SMTP is in.
      </DemoNote>

      <Panel title="Narrow it down">
        {/* GET, so submitting navigates rather than posting. `view` rides
            along as a hidden field or changing a filter would throw the board
            or list choice away. */}
        <form method="get" action="/admin/projects" className="ad__filters" style={{ padding: ".9rem 1rem" }}>
          {q.view === "list" ? <input type="hidden" name="view" value="list" /> : null}
          <label>
            Stage
            <select name="stage" defaultValue={stage ?? ""}>
              <option value="">Any</option>
              {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label>
            Service
            <select name="service" defaultValue={service?.slug ?? ""}>
              <option value="">Any</option>
              {SERVICES.map((s) => <option key={s.slug} value={s.slug}>{s.short}</option>)}
            </select>
          </label>
          <label>
            How it is going
            <select name="health" defaultValue={health ?? ""}>
              <option value="">Any</option>
              {HEALTH.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </label>
          {owners.length ? (
            <label>
              Owner
              <select name="owner" defaultValue={owner ?? ""}>
                <option value="">Anyone</option>
                {owners.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
          ) : null}
          <span className="ad__row">
            <button type="submit" className="ad__btn">Apply</button>
            {filtered ? (
              <Link className="ad__btn ad__btn--plain" href={withQuery({}, { view: q.view })}>
                Clear
              </Link>
            ) : null}
          </span>
        </form>
      </Panel>

      {board ? (
        <div className="ad__scroll" style={{ margin: ".9rem 0" }}>
          <div style={{ display: "grid", gridAutoFlow: "column", gridAutoColumns: "minmax(210px, 1fr)", gap: ".7rem" }}>
            {(stage ? [stage] : STAGES).map((st) => {
              const list = (getBoard().get(st) ?? []).filter(match);
              return (
                <section key={st} className="ad__panel">
                  <div className="ad__panelH">
                    <StagePill stage={st} />
                    <b className="ad__num ad__dim">{list.length}</b>
                  </div>
                  <div style={{ padding: ".5rem" }}>
                    {list.length ? list.map((p) => (
                      /* The card is a link and the menu is a button, so they
                         cannot be nested -- a button inside an anchor is
                         invalid and behaves differently in every browser. They
                         are siblings in one bordered row instead. */
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
                          <AttentionPills items={projectAttention(p, tasks)} />
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
      ) : (
        <div style={{ marginTop: ".9rem" }}>
          <Panel title={filtered ? "Matching projects" : "All projects"}>
            {all.length ? (
              <div className="ad__scroll">
                <table className="ad__t">
                  <thead>
                    <tr>
                      <th>Project</th><th>Client</th><th>Owner</th><th>Service</th>
                      <th>Stage</th><th>Health</th><th>Due</th>
                      <th className="ad__rmH"><span className="ad__sr">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {all.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <Link href={`/admin/projects/${p.id}`}><b>{p.title}</b></Link>
                          <AttentionPills items={projectAttention(p, tasks)} except={p.health} />
                        </td>
                        <td>{getClient(p.clientId)?.company ?? "Unknown"}</td>
                        <td>{p.owner || <span className="ad__dim">Nobody</span>}</td>
                        <td>{SERVICES.find((x) => x.slug === p.service)?.short}</td>
                        <td><StagePill stage={p.stage} /></td>
                        <td><HealthPill health={p.health} /></td>
                        <td className="num">{when(p.due)}</td>
                        <td className="ad__rmC">
                          <ProjectMenu project={p} clientName={getClient(p.clientId)?.company} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : filtered ? (
              /* A FILTERED-EMPTY IS NOT AN EMPTY. There is data; this
                 combination just has none of it, and the way out is to widen
                 the filter rather than to create something. */
              <Empty
                title="Nothing matches those filters"
                action={<Link className="ad__btn" href={withQuery({}, { view: q.view })}>Clear the filters</Link>}
              >
                Try a different stage, service, owner or health.
              </Empty>
            ) : (
              <Empty title="No projects yet" action={<AddProject clients={getClients()} />}>
                Projects keep delivery, deadlines, files, and client updates together.
              </Empty>
            )}
          </Panel>
        </div>
      )}
    </>
  );
}
