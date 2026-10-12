import Link from "next/link";
import { Check, CheckCircle2, Clock, FolderKanban, Hourglass, Inbox, MessageSquare } from "lucide-react";
import { getClient, getDeliverablesFor, getProjects, getTasks, getTickets } from "@/lib/admin/store";
import { taskIsWaiting, type Task } from "@/lib/admin/types";
import { buildProjectRows } from "@/lib/admin/project-signals";
import { markTaskDone } from "@/lib/admin/staff-day-actions";
import { toggleTask } from "@/lib/admin/actions";
import { dateWords, nowMs } from "@/lib/admin/when";
import { studioStamp } from "@/components/admin/calendar/studio-time";
import { PageHead } from "@/components/admin/page-head";
import { MiniBar, RailCard, RailHead, StatTiles, Workbench } from "@/components/admin/workbench";
import { Deck, type DeckItem } from "@/components/admin/deck";
import { Tabs } from "@/components/admin/tabs";
import { UrlSearch } from "@/components/admin/url-search";
import { Pager, readPer } from "@/components/admin/pager";
import { Empty } from "@/components/admin/bits";
import { Form, Hidden } from "@/components/admin/form";
import { FirstWeek } from "@/components/admin/first-week";

/**
 * MY DAY, a member of staff's front page: the tasks that are theirs first (a deck), the rest as a list, the shape
 * of their week and their projects in the rail. A task is theirs when it names them, or when it sits on a project
 * they are answerable for and names nobody. Staff never see amounts: a project shows its payment as a chip.
 */
type Q = Record<string, string | string[] | undefined>;
const DAY = 86_400_000;
const TABS = [["open", "To do"], ["late", "Overdue"], ["waiting", "Waiting"], ["done", "Done"]] as const;
type Tab = (typeof TABS)[number][0];
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export async function StaffDay({ me, params, firstName }: { me: { id: string; name: string }; params: Q; firstName?: string }) {
  const now = nowMs();
  const stamp = studioStamp(now);
  const hour = Number(stamp.time.slice(0, 2));
  const name = me.name.trim().toLowerCase();
  const names = (s: string) => s.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  const rows = buildProjectRows({ money: false });
  const mineRows = rows.filter((r) => r.state !== "done" && (r.project.ownerIds?.length ? r.project.ownerIds.includes(me.id) : names(r.project.owner).includes(name)));
  const mineIds = new Set(mineRows.map((r) => r.project.id));
  const projectOf = new Map(getProjects().map((p) => [p.id, p]));
  const allTasks = getTasks();
  const isMine = (t: Task) => t.assignee.trim().toLowerCase() === name || (mineIds.has(t.projectId) && !t.assignee.trim());
  const mine = allTasks.filter(isMine);
  const open = mine.filter((t) => !t.done).sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
  const day = (t: Task) => (t.due ? t.due.slice(0, 10) : "");
  const late = open.filter((t) => day(t) && day(t) < stamp.date);
  const today = open.filter((t) => day(t) === stamp.date);
  const tomorrow = open.filter((t) => day(t) === studioStamp(now + DAY).date);
  const waiting = open.filter((t) => taskIsWaiting(t, allTasks));
  const doneWeek = mine.filter((t) => t.done && t.doneAt && Date.parse(t.doneAt) >= now - 7 * DAY);
  const doneBefore = mine.filter((t) => t.done && t.doneAt && Date.parse(t.doneAt) >= now - 14 * DAY && Date.parse(t.doneAt) < now - 7 * DAY).length;

  const withClients = mineRows.flatMap((r) => getDeliverablesFor(r.project.id).filter((d) => d.approval === "Awaiting client").map((d) => ({ d, r })));
  const clientIds = new Set(mineRows.map((r) => r.project.clientId));
  const replies = getTickets().filter((t) => t.status === "Open" && clientIds.has(t.clientId));

  const deck: DeckItem[] = open.slice(0, 8).map((t) => {
    const p = projectOf.get(t.projectId);
    const client = p ? getClient(p.clientId) : undefined;
    const days = day(t) ? Math.round((Date.parse(stamp.date) - Date.parse(day(t))) / DAY) : 0;
    const blocks = allTasks.filter((x) => !x.done && x.blockedBy === t.id);
    return {
      id: `task-${t.id}`, kind: "Task",
      urgency: !day(t) ? "No date" : days > 0 ? `${days} ${days === 1 ? "day" : "days"} late` : days === 0 ? "Due today" : `Due ${dateWords(t.due!, now, false)}`,
      tone: days > 0 ? "bad" : days === 0 && day(t) ? "warn" : "brand",
      label: p ? `${client?.company ?? "Client"} · ${p.title}` : undefined,
      title: t.title,
      body: `${p ? `On ${p.title}${client ? ` for ${client.company}` : ""}, in ${p.stage}.` : "A task on a project."}${blocks.length ? ` ${blocks.length === 1 ? "Another task waits" : `${blocks.length} tasks wait`} for this one.` : ""}`,
      facts: [{ k: "Project", v: p?.title ?? "Unknown" }, { k: "Due", v: t.due ? dateWords(t.due, now, false) : "Not set" }, { k: "Priority", v: t.priority }],
      why: blocks.length ? "Finishing it unblocks the next task." : t.priority === "High" ? "It is marked high priority." : "It is the next thing on your list.",
      primary: { label: "Mark done", run: markTaskDone.bind(null, t.id) },
      secondary: p ? { label: "Open project", href: `/admin/projects/${p.id}` } : undefined,
      open: p ? `/admin/projects/${p.id}?tab=tasks` : undefined,
    };
  });

  const tab: Tab = TABS.find(([k]) => k === one(params.t))?.[0] ?? "open";
  const lists: Record<Tab, Task[]> = { open, late, waiting, done: mine.filter((t) => t.done).sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? "")) };
  const needle = one(params.q).trim().slice(0, 80).toLowerCase();
  const find = (t: Task) => !needle || `${t.title} ${projectOf.get(t.projectId)?.title ?? ""} ${getClient(projectOf.get(t.projectId)?.clientId ?? "")?.company ?? ""}`.toLowerCase().includes(needle);
  const list = lists[tab].filter(find);
  const per = readPer(one(params.per));
  const pages = Math.max(1, Math.ceil(list.length / per));
  const page = Math.min(pages, Math.max(1, Number.parseInt(one(params.page) || "1", 10) || 1));
  const shown = list.slice((page - 1) * per, page * per);
  const href = (patch: Record<string, string | undefined>) => {
    const n = new URLSearchParams();
    for (const [k, v] of Object.entries({ t: tab === "open" ? "" : tab, q: one(params.q), per: one(params.per), ...patch })) if (v) n.set(k, v);
    const s = n.toString();
    return `/admin${s ? `?${s}` : ""}`;
  };
  const tabItems = TABS.map(([key, label]) => ({
    key, label, href: href({ t: key === "open" ? undefined : key, page: undefined }), count: lists[key].filter(find).length,
    tone: key === "late" && late.length ? ("bad" as const) : undefined,
  }));
  const greeting = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
  const upNext = deck.length;
  const dateLine = `${dateWords(new Date(now).toISOString(), now)}`;

  return (
    <>
      <PageHead
        title={`${greeting}${firstName ? `, ${firstName}` : ""}. ${upNext ? `${upNext} ${upNext === 1 ? "thing is" : "things are"} up next.` : "Nothing is up next."}`}
        lede={<>{dateLine}. <strong>{doneWeek.length ? `You finished ${doneWeek.length} this week.` : "Nothing finished yet this week."}</strong> Your tasks first, then what is waiting.</>}
      />
      <FirstWeek userId={me.id} />
      <Workbench
        railLabel="My week and my projects"
        rail={<>
          <RailHead title="My week" href="/admin/projects" link="View all" />
          <StatTiles items={[
            { label: "Due today", value: String(today.length), note: tomorrow.length ? `${tomorrow.length} more tomorrow` : late.length ? `${late.length} overdue` : "Nothing tomorrow", noteTone: late.length ? "bad" : tomorrow.length ? "accent" : undefined, icon: Clock, tone: "live", href: href({ t: "open", page: undefined }) },
            { label: "With clients", value: String(withClients.length), note: withClients.length ? `${withClients[0].d.name} and more waiting` : "Nothing waiting on a client", icon: Hourglass, tone: "brand" },
            { label: "Replies waiting", value: String(replies.length), note: replies.length ? "Questions from your clients" : "No question is open", noteTone: replies.length ? "accent" : undefined, icon: MessageSquare, tone: "warn", href: "/admin/clients/support" },
            { label: "Done this week", value: String(doneWeek.length), note: doneWeek.length > doneBefore ? `${doneWeek.length - doneBefore} more than last week` : doneBefore ? `${doneBefore} last week` : "Starts counting as you finish", icon: CheckCircle2, tone: "good", href: href({ t: "done", page: undefined }) },
          ]} />
          <RailCard title="My projects" aside={mineRows.length ? `${mineRows.length} live` : undefined} link={{ href: "/admin/projects", label: "View all" }}>
            {mineRows.length ? mineRows.slice(0, 3).map((r) => (
              <Link key={r.project.id} href={`/admin/projects/${r.project.id}`} className="adRc__row">
                <span className="adRc__line"><strong>{r.project.title}</strong><span className="ad__pill ad__pill--flat">{r.payment.text}</span></span>
                <span className="adRc__sub">{r.client?.company ?? "Unknown client"} · {r.project.stage}</span>
                <MiniBar share={r.progress} />
              </Link>
            )) : <p className="ad__dim" style={{ margin: 0, fontSize: ".85rem" }}>Projects where you are named as answerable show here. Ask Admin to name you on one.</p>}
          </RailCard>
        </>}
      >
        <Deck id={`myday-${me.id}`} title="Up next" items={deck} emptyTitle="You are clear." emptyBody="No task is waiting on you." emptyNext={{ label: "Open projects", href: "/admin/projects" }} />
        <section className="adList" aria-label="All my tasks" data-tour="dash-mywork">
          <div className="adList__hd"><h2>All my tasks</h2><span className="adList__n">{mine.length}</span><span className="adList__sp" /><UrlSearch label="Search tasks" placeholder="Task or client" /></div>
          <Tabs label="Task views" items={tabItems} current={tab} />
          {shown.length ? (
            <>
              <div className="ad__scroll" tabIndex={0} role="region" aria-label="Tasks table, scrolls sideways" data-lenis-prevent>
                <table className="ad__t">
                  <thead><tr><th>Task</th><th>Due</th><th>Project</th><th>Payment</th></tr></thead>
                  <tbody>
                    {shown.map((t) => {
                      const p = projectOf.get(t.projectId);
                      const r = rows.find((x) => x.project.id === t.projectId);
                      const overdue = !t.done && day(t) && day(t) < stamp.date;
                      return (
                        <tr key={t.id}>
                          <td>
                            <span className="ad__who">
                              <Form action={toggleTask}>
                                <Hidden name="id" value={t.id} /><Hidden name="expectedDone" value={String(t.done)} />
                                <button type="submit" className={`ad__tick${t.done ? " is-on" : ""}`} aria-label={t.done ? `Reopen ${t.title}` : `Tick off ${t.title}`}><Check aria-hidden="true" /></button>
                              </Form>
                              <span><b>{t.title}</b><small>{getClient(p?.clientId ?? "")?.company ?? "Unknown client"}{p ? ` · ${p.title}` : ""}</small></span>
                            </span>
                          </td>
                          <td className={`num${overdue ? " adPl__late" : ""}`}>{t.done ? (t.doneAt ? dateWords(t.doneAt, now, false) : "Done") : t.due ? dateWords(t.due, now) : <span className="ad__dim">Not set</span>}</td>
                          <td>{p ? <Link href={`/admin/projects/${p.id}`}>{p.title}</Link> : "Unknown"}</td>
                          <td>{r ? <span className="ad__pill ad__pill--flat">{r.payment.text}</span> : null}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pager label="Task pages" total={list.length} page={page} per={per} noun={list.length === 1 ? "task" : "tasks"}
                href={(patch) => href({ page: patch.page && patch.page > 1 ? String(patch.page) : undefined, per: patch.per ? String(patch.per) : one(params.per) })} />
            </>
          ) : (
            <Empty title={needle ? "No task matches" : tab === "done" ? "Nothing finished yet" : "No tasks here"} icon={needle ? Inbox : FolderKanban}
              action={needle ? <Link className="ad__btn" href={href({ q: undefined })}>Clear search</Link> : <Link className="ad__btn" href="/admin/projects">Open projects</Link>}>
              {needle ? "Search by task, project or client." : "Tasks assigned to you, or open on your projects with no one yet, show here."}
            </Empty>
          )}
        </section>
      </Workbench>
    </>
  );
}
