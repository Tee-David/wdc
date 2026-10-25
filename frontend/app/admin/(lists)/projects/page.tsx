import Link from "next/link";
import { CalendarDays, FolderKanban, Hourglass, KanbanSquare, List as ListIcon, GanttChart } from "lucide-react";
import { SERVICES } from "@/lib/services";
import { getBoard, getClients, getInvoices } from "@/lib/admin/store";
import { HEALTH, STAGES, invoiceStatus, invoiceTotals, naira, type Stage } from "@/lib/admin/types";
import { adminRole } from "@/lib/admin/guard";
import { inScope, staffScope } from "@/lib/admin/staff-scope";
import { can } from "@/lib/admin/permissions";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import { buildProjectRows, type ProjectRow } from "@/lib/admin/project-signals";
import { meetingList } from "@/lib/meetings/store";
import { dateWords, nowMs } from "@/lib/admin/when";
import { initials, avTone } from "@/lib/admin/client-mark";
import { studioStamp } from "@/components/admin/calendar/studio-time";
import type { CalEvent } from "@/components/admin/calendar/types";
import { Calendar } from "@/components/admin/calendar/calendar";
import { PageHead } from "@/components/admin/page-head";
import { StatTiles } from "@/components/admin/workbench";
import { Chips } from "@/components/admin/chips";
import { Tabs } from "@/components/admin/tabs";
import { UrlSearch } from "@/components/admin/url-search";
import { ClickRow } from "@/components/admin/click-row";
import { Pager, readPer } from "@/components/admin/pager";
import { BulkBar, PickAll, RowPick } from "@/components/admin/bulk";
import { AddProject } from "@/components/admin/project-forms";
import { ProjectMenu } from "@/components/admin/row-actions";
import { ProjectBoard, type BoardCard } from "@/components/admin/project-board";
import { ProjectTimeline } from "@/components/admin/project-timeline";
import { ProjectFilters, ProjectsChores } from "@/components/admin/projects-parts";
import { AttentionPills, Empty, StagePill } from "@/components/admin/bits";
import { ExampleNote } from "@/components/admin/example-note";
import "@/components/admin/projects.css";

export const metadata = { title: "Projects" };

/**
 * PROJECTS: the work in four pictures of the same set (list, board, timeline, calendar), the service as a
 * chip row, three figures above. Everything is derived by lib/admin/project-signals.ts, and the address bar
 * holds the view, the grouping, the tab, the chip, the search, the facets and the page, so a filtered view is
 * a link and the back button undoes a filter. The board is draggable between stages (its own component);
 * grouped by service or lead it is read only, because those are not places a project moves to. Staff see
 * the work and payment chips, never an amount.
 */
type Q = {
  view?: string; group?: string; tab?: string; service?: string; q?: string; stage?: string; health?: string; owner?: string;
  page?: string; per?: string;
};

const VIEWS = [["list", "List", ListIcon], ["board", "Board", KanbanSquare], ["timeline", "Timeline", GanttChart], ["calendar", "Calendar", CalendarDays]] as const;
type View = (typeof VIEWS)[number][0];
const GROUPS = [["stage", "Stage"], ["service", "Service"], ["lead", "Lead"]] as const;
type Group = (typeof GROUPS)[number][0];
const TABS = [["live", "Live"], ["waiting", "Waiting on client"], ["done", "Done"]] as const;
type Tab = (typeof TABS)[number][0];
const DAY = 86_400_000;

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<Q> }) {
  await syncStore();
  persistSoon();
  const q = await searchParams;
  const role = await adminRole();
  const isOwner = role === "owner";
  const money = can(role, "money");
  const exportable = can(role, "exports");

  const view: View = VIEWS.find(([k]) => k === q.view)?.[0] ?? "list";
  const group: Group = GROUPS.find(([k]) => k === q.group)?.[0] ?? "stage";
  const tab: Tab = TABS.find(([k]) => k === q.tab)?.[0] ?? "live";
  const stage = STAGES.find((s) => s === q.stage);
  const health = HEALTH.find((h) => h === q.health);
  const service = SERVICES.find((s) => s.slug === q.service)?.slug;
  const needle = String(q.q ?? "").trim().slice(0, 80).toLocaleLowerCase();
  const per = readPer(q.per);

  /* Staff see the projects in their scope; the owner sees every one. */
  const scope = await staffScope(role);
  const all = buildProjectRows({ money }).filter((r) => inScope(scope, "projects", r.project.id));
  const owners = [...new Set(all.map((r) => r.project.owner).filter(Boolean))].sort();
  const owner = owners.find((o) => o === q.owner);

  const href = (patch: Partial<Record<keyof Q, string | undefined>>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...q, ...patch })) if (v) next.set(k, v);
    const s = next.toString();
    return `/admin/projects${s ? `?${s}` : ""}`;
  };

  /* ONE FILTER, APPLIED WITH ONE FACET LEFT OUT, so each tab and chip counts what pressing it would show. */
  const matches = (r: ProjectRow, skip: "tab" | "service" | null) => {
    const p = r.project;
    if (needle && !`${p.title} ${r.client?.company ?? ""} ${p.owner}`.toLocaleLowerCase().includes(needle)) return false;
    if (skip !== "service" && service && p.service !== service) return false;
    if (skip !== "tab" && view === "list" && (tab === "live" ? r.state === "done" : r.state !== tab)) return false;
    if (stage && p.stage !== stage) return false;
    if (health && p.health !== health) return false;
    if (owner && p.owner !== owner) return false;
    return true;
  };
  const shown = all.filter((r) => matches(r, null));
  const facetN = [stage, health, owner].filter(Boolean).length;
  const filtered = !!(needle || service || facetN || (view === "list" && tab !== "live"));

  /* THE FIGURES. */
  const today = studioStamp(nowMs()).date;
  const nowStamp = studioStamp(nowMs());
  const live = all.filter((r) => r.state !== "done");
  const waiting = all.filter((r) => r.state === "waiting");
  const week = nowMs() + 7 * DAY;
  const dueSoon = live.filter((r) => r.project.due && Date.parse(r.project.due) <= week);
  const usedServices = new Set(live.map((r) => r.project.service)).size;
  const invoices = money ? getInvoices().filter((i) => !i.voided && i.status !== "Draft" && invoiceStatus(i) !== "Paid") : [];
  const paymentsSoon = invoices.filter((i) => Date.parse(i.due) <= week && Date.parse(i.due) >= nowMs() - DAY);

  /* Meetings come from the persisted bookings: a week ahead for the figure's note, a wider window for the calendar. */
  const meetingsOn = isOwner;
  let meetings: Awaited<ReturnType<typeof meetingList>> = [];
  let meetingsFailed = false;
  if (meetingsOn) {
    const from = view === "calendar" ? nowMs() - 60 * DAY : nowMs() - DAY;
    const to = view === "calendar" ? nowMs() + 150 * DAY : week;
    try { meetings = await meetingList(new Date(from).toISOString(), new Date(to).toISOString()); } catch { meetingsFailed = true; }
  }
  const liveMeetings = meetings.filter((b) => !["cancelled", "rejected"].includes(b.status.toLowerCase()));
  const meetingsSoon = liveMeetings.filter((b) => Date.parse(b.start) >= nowMs() && Date.parse(b.start) <= week).length;

  const dueNote = [
    meetingsOn && !meetingsFailed ? `${meetingsSoon} ${meetingsSoon === 1 ? "meeting" : "meetings"}` : "",
    money ? `${paymentsSoon.length} ${paymentsSoon.length === 1 ? "payment" : "payments"}` : "",
  ].filter(Boolean).join(", ");

  const lede = <>
    {live.length} live {live.length === 1 ? "project" : "projects"} {scope ? "in your work" : <>across {usedServices} {usedServices === 1 ? "service" : "services"}</>}.{" "}
    <strong>{waiting.length ? `${waiting.length} ${waiting.length === 1 ? "waits" : "wait"} on clients.` : "Nobody is waiting on a client."}</strong>
  </>;

  /* Chips and tabs. */
  const chipItems = [
    { key: "", label: "All services", href: href({ service: undefined, page: undefined }), count: all.filter((r) => matches(r, "service")).length },
    ...SERVICES.map((s) => ({ key: s.slug, label: s.short, href: href({ service: s.slug, page: undefined }), count: all.filter((r) => matches(r, "service") && r.project.service === s.slug).length })),
  ];
  const tabItems = TABS.map(([key, label]) => ({
    key, label, href: href({ tab: key === "live" ? undefined : key, page: undefined }),
    count: all.filter((r) => matches(r, "tab") && (key === "live" ? r.state !== "done" : r.state === key)).length,
    tone: key === "waiting" ? ("warn" as const) : undefined,
  }));

  const exportParams = new URLSearchParams();
  for (const k of ["q", "stage", "service", "health", "owner"] as const) if (q[k]) exportParams.set(k, q[k]!);
  const exportHref = exportable ? `/admin/projects/export${exportParams.size ? `?${exportParams}` : ""}` : undefined;
  const hasClients = getClients().length > 0;

  const empty = !all.length;
  const filteredEmpty = (
    <Empty title="Nothing matches those filters" action={<Link className="ad__btn" href={href({ q: undefined, service: undefined, stage: undefined, health: undefined, owner: undefined, tab: undefined, page: undefined })}>Clear filters</Link>}>
      Try another service, tab or search, or clear the filters.
    </Empty>
  );
  const noneYet = <Empty title="No projects yet" action={<AddProject hasClients={hasClients} />}>Projects keep delivery, deadlines, files and client updates together.</Empty>;

  /* ---------------------------------------------------------------- views */
  let body: React.ReactNode;
  if (view === "list") {
    const pageCount = Math.max(1, Math.ceil(shown.length / per));
    const page = Math.min(pageCount, Math.max(1, Number.parseInt(q.page ?? "1", 10) || 1));
    const rows = shown.slice((page - 1) * per, page * per);
    body = (
      <>
        <Tabs label="Project status" items={tabItems} current={tab} />
        <div className="adList__tools">
          <ProjectFilters
            keep={{ view: undefined, tab: tab === "live" ? undefined : tab, service, q: q.q, per: q.per }}
            stage={stage ?? ""} health={health ?? ""} owner={owner ?? ""} active={facetN}
            stages={STAGES.map((s) => ({ value: s, label: s }))} healths={HEALTH.map((h) => ({ value: h, label: h }))} owners={owners.map((o) => ({ value: o, label: o }))}
          />
          <span className="adSp" />
          {filtered ? <Link className="ad__btn" href={href({ q: undefined, service: undefined, stage: undefined, health: undefined, owner: undefined, tab: undefined, page: undefined })}>Clear filters</Link> : null}
          {exportHref ? <a className="ad__btn" href={exportHref}>Export</a> : null}
        </div>
        {shown.length ? (
          <>
            <BulkBar target="projects-table" noun="projects"
              actions={isOwner ? [{ kind: "projects:archive", label: "Archive", icon: "archive", danger: true, confirm: "Archive {n} projects? Their invoices, updates and approvals stay; you can bring them back." }] : []}
              more={STAGES.map((st) => ({ kind: `projects:stage:${st}`, label: `Move to ${st}`, confirm: `Move {n} projects to ${st}? Each client who gets updates is emailed.` }))} />
            <div className="ad__scroll" id="projects-table" tabIndex={0} role="region" aria-label="Projects table, scrolls sideways" data-lenis-prevent>
              <table className="ad__t">
                <thead>
                  <tr>
                    <th><span className="ad__pickRow"><PickAll label="Select every project" />Project</span></th>
                    <th>Service</th><th>Stage</th><th>Lead</th><th>Due</th><th>Payment</th>
                    <th className="ad__rmH"><span className="ad__sr">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const p = r.project;
                    return (
                      <ClickRow key={p.id} href={`/admin/projects/${p.id}`} label={`${p.title}, ${r.client?.company ?? "unknown client"}. ${p.stage}. Press Enter to open.`}>
                        <td>
                          <span className="ad__who">
                            <RowPick id={p.id} label={p.title} />
                            <span>
                              <Link href={`/admin/projects/${p.id}`}><b>{p.title}</b></Link>
                              <small>{r.client?.company ?? "Unknown client"}</small>
                            </span>
                          </span>
                        </td>
                        <td><span className="ad__pill ad__pill--flat">{r.service?.short}</span></td>
                        <td>
                          <span className="adT__stack adPl__stage">
                            <span className="adT__row">
                              {p.health !== "On track" ? <span className={`ad__pill ${p.health === "Blocked" ? "ad__pill--bad" : "ad__pill--warn"}`}>{p.health === "Waiting on client" ? `Waiting on client` : p.health}</span> : <StagePill stage={p.stage} />}
                              <small className="ad__dim">{r.stageIndex + 1} of {STAGES.length}</small>
                            </span>
                            <span className="adBar" aria-hidden="true"><span style={{ "--w": r.progress } as React.CSSProperties} /></span>
                            {p.health !== "On track" ? <small className="ad__dim">{p.stage}</small> : <AttentionPills items={r.attention} except={p.health} />}
                          </span>
                        </td>
                        <td>
                          {p.owner ? <span className="ad__who"><span className={`adMk adMk--sm adMk--round adMk--${avTone(p.owner)}`} aria-hidden="true">{initials(p.owner)}</span><span>{p.owner}</span></span> : <span className="ad__dim">No lead yet</span>}
                        </td>
                        <td className={`num${r.due && r.due < today && r.state !== "done" ? " adPl__late" : ""}`}>{r.due ? dateWords(p.due!, nowMs()) : <span className="ad__dim">Not set</span>}</td>
                        <td>
                          <span className="adT__stack">
                            {money && r.payment.invoiced ? <b className="ad__num">{naira(r.payment.invoiced)}</b> : null}
                            <span className={`adPl__pay adPl__pay--${r.payment.tone}`}>{r.payment.text}{money && r.payment.paidShare !== undefined && r.payment.text !== "Paid" ? ` · ${r.payment.paidShare}% paid` : ""}</span>
                          </span>
                        </td>
                        <td className="ad__rmC"><ProjectMenu project={p} clientName={r.client?.company} /></td>
                      </ClickRow>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pager label="Project pages" total={shown.length} page={page} per={per} noun={shown.length === 1 ? "project" : "projects"}
              href={(patch) => href({ page: patch.page && patch.page > 1 ? String(patch.page) : undefined, per: patch.per ? String(patch.per) : q.per })} />
          </>
        ) : empty ? noneYet : filteredEmpty}
      </>
    );
  } else if (view === "board") {
    const order = getBoard();
    const byId = new Map(shown.map((r) => [r.project.id, r]));
    const cards = Object.fromEntries(shown.map((r) => {
      const p = r.project;
      return [p.id, {
        project: money ? p : { ...p, budget: null }, /* the budget is money: it must not reach a staff browser */
        clientName: r.client?.company, clientInitials: r.client ? initials(r.client.company) : undefined,
        service: r.service?.short, attention: r.attention, due: r.due ? dateWords(p.due!, nowMs()) : "No date yet",
        ownerInitials: p.owner ? initials(p.owner) : undefined,
        stageNo: r.stageIndex + 1, stageCount: STAGES.length, progress: r.progress,
        tasks: { done: r.tasksDone, total: r.tasksTotal }, late: !!r.due && r.due < today && r.state !== "done",
      } satisfies BoardCard];
    }));
    const columns = group === "stage"
      ? (stage ? [stage] : [...STAGES]).map((st: Stage) => ({ stage: st, dot: STAGES.indexOf(st), ids: (order.get(st) ?? []).filter((p) => byId.has(p.id)).map((p) => p.id) }))
      : group === "service"
        ? SERVICES.map((s, i) => ({ stage: s.slug, label: s.short, dot: i, ids: shown.filter((r) => r.project.service === s.slug).map((r) => r.project.id) })).filter((c) => c.ids.length || !service)
        : [...new Set([...owners, ""])].map((o, i) => ({ stage: o || "none", label: o || "No lead yet", dot: i, ids: shown.filter((r) => r.project.owner === o).map((r) => r.project.id) })).filter((c) => c.ids.length);
    body = (
      <>
        <div className="adPl__bar">
          <span className="adPl__barL">Group by</span>
          <span className="ad__switch" role="group" aria-label="Group the board by">
            {GROUPS.map(([k, label]) => <Link key={k} href={href({ group: k === "stage" ? undefined : k })} scroll={false} aria-current={group === k}>{label}</Link>)}
          </span>
          <span className="adSp" />
          <ProjectFilters
            keep={{ view: "board", group: group === "stage" ? undefined : group, service, q: q.q }}
            stage={stage ?? ""} health={health ?? ""} owner={owner ?? ""} active={facetN}
            stages={STAGES.map((s) => ({ value: s, label: s }))} healths={HEALTH.map((h) => ({ value: h, label: h }))} owners={owners.map((o) => ({ value: o, label: o }))}
          />
          <span className="adPl__barN">{shown.length} {shown.length === 1 ? "project" : "projects"}</span>
          <span className="adPl__barTip">{group === "stage" ? "Drag a card to move it to another stage." : "Grouped for reading. Group by stage to move cards."}</span>
        </div>
        {shown.length ? (
          <ProjectBoard
            key={JSON.stringify([group, columns.map((c) => [c.stage, c.ids])])}
            columns={columns} cards={cards} locked={group !== "stage"}
          />
        ) : empty ? noneYet : filteredEmpty}
      </>
    );
  } else if (view === "timeline") {
    const rows = shown.filter((r) => r.state !== "done").sort((a, b) => (a.due || "9").localeCompare(b.due || "9"));
    body = rows.length ? <ProjectTimeline rows={rows} today={today} /> : empty ? noneYet : filteredEmpty;
  } else {
    const events: CalEvent[] = [];
    for (const r of shown) {
      const p = r.project;
      if (!r.due || r.state === "done") continue;
      events.push({
        id: `due-${p.id}`, date: r.due, title: `${p.title} due`, sub: r.client?.company, cal: "deadlines", href: `/admin/projects/${p.id}`,
        people: p.owner ? [{ initials: initials(p.owner) }] : undefined,
        tag: p.health !== "On track" ? { text: p.health, tone: p.health === "Blocked" ? "bad" : "warn" } : undefined,
      });
    }
    const shownIds = new Set(shown.map((r) => r.project.id));
    if (money) {
      for (const i of invoices) {
        if (i.projectId && !shownIds.has(i.projectId)) continue;
        if (!i.projectId && (service || needle || facetN)) continue;
        const r = all.find((x) => x.project.id === i.projectId);
        events.push({ id: `pay-${i.id}`, date: i.due.slice(0, 10), title: `${i.number} due`, sub: `${r?.client?.company ?? "Invoice"} · ${naira(invoiceTotals(i).due)}`, cal: "payments", href: `/admin/money/${i.id}` });
      }
    }
    if (meetingsOn && !service && !facetN) {
      for (const b of liveMeetings) {
        const s = studioStamp(b.start), e = studioStamp(b.end);
        if (needle && !`${b.title} ${b.attendees?.[0]?.name ?? ""}`.toLocaleLowerCase().includes(needle)) continue;
        events.push({
          id: `meet-${b.uid}`, date: s.date, start: s.time, end: e.date === s.date ? e.time : undefined, title: b.title, sub: b.attendees?.[0]?.name, cal: "meetings", href: "/admin/meetings",
          tag: b.status.toLowerCase() === "pending" ? { text: "Awaiting confirmation", tone: "warn" } : undefined,
        });
      }
    }
    const cals = [
      ...(meetingsOn ? [{ id: "meetings", label: "Meetings", color: "var(--cal-1)" }] : []),
      { id: "deadlines", label: "Deadlines", color: "var(--cal-2)" },
      ...(money ? [{ id: "payments", label: "Payments due", color: "var(--cal-3)" }] : []),
    ];
    body = (
      <>
        {meetingsFailed ? <p className="adPl__note" role="status">Meetings could not be read just now, so they are left out. Deadlines{money ? " and payments" : ""} are shown.</p> : null}
        <Calendar
          id="projects" cals={cals} events={events} today={nowStamp.date} now={nowStamp.time}
          add={meetingsOn ? { label: "Book a meeting", href: "/meet" } : undefined}
          exportName="Studio projects" dataTour="projects-calendar"
          emptyNote="Nothing is due in this view. Pick another day or turn a calendar back on."
        />
      </>
    );
  }

  return (
    <>
      <PageHead
        title="Projects" lede={lede}
        action={<AddProject hasClients={hasClients} dataTour="projects-add" />}
        chores={<ProjectsChores exportHref={exportHref} meetings={isOwner} />}
      />
      <ExampleNote />
      <div className="adPl__tiles" data-tour="figures">
        <StatTiles items={[
          { label: "Live projects", value: String(live.length), note: `${usedServices} ${usedServices === 1 ? "service" : "services"}`, icon: FolderKanban, tone: "brand", href: href({ view: undefined, tab: undefined, page: undefined }) },
          { label: "Waiting on clients", value: String(waiting.length), note: waiting.length ? waiting.slice(0, 2).map((r) => r.project.title).join(", ") : "Nobody is waiting", noteTone: waiting.length ? "accent" : undefined, icon: Hourglass, tone: "warn", href: href({ view: undefined, tab: "waiting", page: undefined }) },
          { label: "Due next 7 days", value: String(dueSoon.length), note: dueNote || (dueSoon.length ? "Projects with a date this week" : "Nothing is due this week"), icon: CalendarDays, tone: "live", href: href({ view: "calendar", page: undefined }) },
        ]} />
      </div>
      <section className="adList adPl" aria-label="All projects" data-tour="projects-switch">
        <div className="adList__hd adPl__hd">
          <nav className="ad__switch" aria-label="Project views">
            {VIEWS.map(([k, label, Icon]) => <Link key={k} href={href({ view: k === "list" ? undefined : k, page: undefined })} scroll={false} aria-current={view === k}><Icon aria-hidden="true" />{label}</Link>)}
          </nav>
          <span className="adList__sp" />
          <UrlSearch label="Search projects" placeholder="Project or client" />
        </div>
        <div className="adList__pad"><Chips label="Service" grows items={chipItems} current={service ?? ""} /></div>
        {body}
      </section>
    </>
  );
}
