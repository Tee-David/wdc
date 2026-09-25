import Link from "next/link";
import { BulkBar, PickAll, RowPick } from "@/components/admin/bulk";
import { adminRole } from "@/lib/admin/guard";
import { SERVICES } from "@/lib/services";
import {
  getBoard, getClient, getClients, getProjects, getTasks,
} from "@/lib/admin/store";
import { HEALTH, STAGES, projectAttention, type Project } from "@/lib/admin/types";
import {
  AttentionPills, Empty, HealthPill, Panel, StagePill, when,
} from "@/components/admin/bits";
import { AddProject } from "@/components/admin/project-forms";
import { ProjectMenu } from "@/components/admin/row-actions";
import { ProjectBoard, type BoardCard } from "@/components/admin/project-board";
import PageTourButton from "@/components/admin/tour/page-tour-button";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import { ExampleNote } from "@/components/admin/example-note";

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
  stage?: string; service?: string; owner?: string; health?: string; view?: string; q?: string;
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
  await syncStore();
  persistSoon();
  const isOwner = (await adminRole()) === "owner";
  const q = await searchParams;

  /* Every one of these is checked against the closed set it belongs to rather
     than used as typed. A query string is user input on a page that renders
     whatever it is given. */
  const stage = STAGES.find((s) => s === q.stage);
  const service = SERVICES.find((s) => s.slug === q.service);
  const health = HEALTH.find((h) => h === q.health);
  /* LIST IS THE DEFAULT, and `?view=board` is the one that has to be asked
     for. A board is the better picture of a pipeline and the worse way to find
     a project, and finding one is what somebody opening this page is nearly
     always doing -- especially on a phone, where six columns of cards are six
     screens of sideways scrolling. The parameter is inverted rather than
     renamed so an existing `?view=list` link still lands on the list. */
  const board = q.view === "board";

  const projects = getProjects();
  const tasks = getTasks();

  /* Owners come from the projects themselves rather than a list somewhere:
     there is no user table yet, and offering names nobody is using would be
     inventing staff. */
  const owners = [...new Set(projects.map((p) => p.owner).filter(Boolean))].sort();
  const owner = owners.find((o) => o === q.owner);

  /* Words, matched against the title, the client and the owner. */
  const needle = String(q.q ?? "").trim().slice(0, 80).toLocaleLowerCase();
  const match = (p: Project) =>
    (!needle || `${p.title} ${getClient(p.clientId)?.company ?? ""} ${p.owner}`.toLocaleLowerCase().includes(needle)) &&
    (!stage || p.stage === stage) &&
    (!service || p.service === service.slug) &&
    (!health || p.health === health) &&
    (!owner || p.owner === owner);

  const all = projects.filter(match);
  const filtered = !!(needle || stage || service || health || owner);
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
          <span className="ad__switch" data-tour="projects-switch">
            {/* The default sits on the left, which is the order somebody
                reads them in and the order they are in the URL. */}
            <Link href={withQuery(q, { view: "" })} aria-current={!board}>List</Link>
            <Link href={withQuery(q, { view: "board" })} aria-current={board}>Board</Link>
          </span>
          <PageTourButton />
          <AddProject clients={getClients()} dataTour="projects-add" />
        </div>
      </div>

      <ExampleNote />

      <Panel title="Narrow it down">
        {/* GET, so submitting navigates rather than posting. `view` rides
            along as a hidden field or changing a filter would throw the board
            or list choice away. */}
        <form method="get" action="/admin/projects" className="ad__filters" style={{ padding: ".9rem 1rem" }}>
          {/* The filter form is a GET, so anything not carried here is dropped
              when it submits -- which would bounce a reader off the board and
              back to the list every time they narrowed something down. */}
          {board ? <input type="hidden" name="view" value="board" /> : null}
          <label className="ad__filterSearch">
            Search
            <input type="search" name="q" defaultValue={needle} placeholder="A project, client or owner" />
          </label>
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
        /* THE BOARD (the mockups' Projects board): a column per stage, a card
           per project. The card is a link and the menu is a button, so they
           cannot be nested -- a button inside an anchor is invalid and
           behaves differently in every browser. They are siblings. */
        <ProjectBoard
          key={JSON.stringify([...getBoard()].map(([st, l]) => [st, l.map((p) => p.id)]))}
          columns={(stage ? [stage] : STAGES).map((st) => ({
            stage: st, dot: STAGES.indexOf(st), ids: (getBoard().get(st) ?? []).filter(match).map((p) => p.id),
          }))}
          cards={Object.fromEntries(all.map((p) => {
            const client = getClient(p.clientId);
            return [p.id, {
              project: p, clientName: client?.company, clientInitials: client ? initialsOf(client.company) : undefined,
              service: SERVICES.find((x) => x.slug === p.service)?.short, attention: projectAttention(p, tasks),
              due: p.due ? when(p.due) : "No date yet", ownerInitials: p.owner ? initialsOf(p.owner) : undefined,
            } satisfies BoardCard];
          }))}
        />
      ) : (
        <div style={{ marginTop: ".9rem" }}>
          <Panel title={filtered ? "Matching projects" : "All projects"}>
            {all.length ? (
              <>
              {/* Stage moves go through moveStage row by row, so each keeps
                  its history line and the client's email; archiving is the
                  owner's, as it is from a project's own menu. */}
              <BulkBar target="projects-table" noun="projects"
                actions={isOwner ? [{ kind: "projects:archive", label: "Archive", icon: "archive", danger: true, confirm: "Archive {n} projects? Their invoices, updates and approvals stay; you can bring them back." }] : []}
                more={STAGES.map((st) => ({ kind: `projects:stage:${st}`, label: `Move to ${st}`, confirm: `Move {n} projects to ${st}? Each client who gets updates is emailed.` }))} />
              <div className="ad__scroll" id="projects-table">
                <table className="ad__t">
                  <thead>
                    <tr>
                      <th><span className="ad__pickRow"><PickAll label="Select every project" />Project</span></th><th>Client</th><th>Owner</th><th>Service</th>
                      <th>Stage</th><th>Health</th><th>Due</th>
                      <th className="ad__rmH"><span className="ad__sr">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {all.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <span className="ad__pickRow"><RowPick id={p.id} label={p.title} /><Link href={`/admin/projects/${p.id}`}><b>{p.title}</b></Link></span>
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
              </>
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

function initialsOf(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}
