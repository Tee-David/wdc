import Link from "next/link";
import { Bell, ListChecks } from "lucide-react";
import { requireWorkspaceUser } from "@/lib/workspace/access";
import { listWorkspaceNotifications, getWorkspaceNotificationPreferences } from "@/lib/workspace/notifications-store";
import { NOTIFICATION_CATEGORIES } from "@/lib/workspace/notifications-policy";
import { getProject } from "@/lib/admin/store";
import { dateWords, nowMs, whenWords } from "@/lib/admin/when";
import { PageHead } from "@/components/admin/page-head";
import { RailCard, RailHead, StatTiles, Workbench } from "@/components/admin/workbench";
import { RailRows } from "@/components/admin/rail-list";
import { Deck, type DeckItem } from "@/components/admin/deck";
import { Chips } from "@/components/admin/chips";
import { UrlSearch } from "@/components/admin/url-search";
import { ClickRow } from "@/components/admin/click-row";
import { Pager, readPer } from "@/components/admin/pager";
import { Empty, Panel } from "@/components/admin/bits";
import { CATEGORY_LABEL, MarkAllRead, NoticeChores, NoticeSheet } from "./notice-parts";

const MODE: Record<string, string> = { immediate: "Email when it happens", digest: "In my summary", off: "In the app only" };
type SP = { q?: string; kind?: string; page?: string; per?: string; open?: string };

/**
 * THE NOTIFICATIONS PAGE for the studio, staff and clients alike: what needs you first (a deck), the rest as a list
 * with kind chips and a pager, the pulse and your own email choices in the rail. Reading a notice never completes
 * the work: the record it points to does. `base` is the page's own address so a link keeps the person where they are.
 */
export async function PersonalInbox({ base, sp }: { base: string; sp: SP }) {
  const user = await requireWorkspaceUser();
  let data: { all: Awaited<ReturnType<typeof listWorkspaceNotifications>>; prefs: Awaited<ReturnType<typeof getWorkspaceNotificationPreferences>> } | null = null;
  try {
    const [all, prefs] = await Promise.all([listWorkspaceNotifications("all"), getWorkspaceNotificationPreferences()]);
    data = { all, prefs };
  } catch { /* An unavailable inbox is not an empty one. */ }
  if (!data) {
    return (
      <>
        <PageHead title="Notifications" lede="Your notifications could not be loaded." />
        <Panel title="Notifications unavailable"><p role="alert" style={{ padding: "0 1.25rem 1.25rem" }}>Your messages could not be loaded. Check the workspace migrations, then refresh. Your saved history has not been replaced.</p></Panel>
      </>
    );
  }
  const { all, prefs } = data;
  const now = nowMs();
  const per = readPer(sp.per);
  const needle = String(sp.q ?? "").trim().slice(0, 80).toLocaleLowerCase();
  const kind = sp.kind ?? "";
  const needs = (n: (typeof all)[number]) => !n.actionedAt && !n.cancelledAt && ["actions", "reminders", "support"].includes(n.category);
  const unread = all.filter((n) => !n.readAt && !n.cancelledAt);
  const needing = all.filter(needs);
  const match = (n: (typeof all)[number], k: string) => !k || (k === "unread" ? !n.readAt && !n.cancelledAt : k === "summaries" ? n.kind === "communication.summary" : n.category === k);
  const rows = all.filter((n) => match(n, kind) && (!needle || `${n.title} ${n.summary} ${n.actorName}`.toLocaleLowerCase().includes(needle)));
  const pageCount = Math.max(1, Math.ceil(rows.length / per));
  const page = Math.min(pageCount, Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1));
  const shown = rows.slice((page - 1) * per, page * per);
  const href = (patch: Partial<SP>) => {
    const n = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) n.set(k, v);
    const s = n.toString();
    return `${base}${s ? `?${s}` : ""}`;
  };

  const deck: DeckItem[] = needing.slice(0, 8).map((n) => ({
    id: `n-${n.id}`, kind: CATEGORY_LABEL[n.category] ?? "Update",
    urgency: n.dueAt ? `Due ${dateWords(n.dueAt, now, false)}` : whenWords(n.createdAt, now), tone: n.category === "actions" ? "warn" : n.category === "reminders" ? "live" : "brand",
    label: getProject(n.projectId)?.title,
    title: n.title, body: n.summary.length > 220 ? `${n.summary.slice(0, 217)}...` : n.summary,
    facts: [{ k: "From", v: n.actorName }, { k: "When", v: whenWords(n.createdAt, now) }, ...(n.dueAt ? [{ k: "Due", v: dateWords(n.dueAt, now, false) }] : [])],
    why: "Reading this does not finish the work. The record does.",
    primary: { label: "Open the record", href: n.href },
    open: href({ open: n.id }),
  }));

  const present = NOTIFICATION_CATEGORIES.filter((c) => all.some((n) => n.category === c));
  const chipItems = [
    { key: "", label: "All", count: all.length },
    { key: "unread", label: "Unread", count: unread.length },
    ...present.map((c) => ({ key: c, label: CATEGORY_LABEL[c] ?? c, count: all.filter((n) => n.category === c).length })),
    ...(all.some((n) => n.kind === "communication.summary") ? [{ key: "summaries", label: "Summaries", count: all.filter((n) => n.kind === "communication.summary").length }] : []),
  ].map((c) => ({ ...c, href: href({ kind: c.key || undefined, page: undefined, open: undefined }) }));
  const newest = unread[0];

  return (
    <>
      <PageHead title="Notifications"
        lede={<>{unread.length} unread. <strong>{needing.length ? `${needing.length} ${needing.length === 1 ? "needs" : "need"} your action.` : "Nothing needs your action."}</strong></>}
        action={user.readOnly ? undefined : <MarkAllRead disabled={!unread.length} />}
        chores={<NoticeChores preferences={prefs} readOnly={user.readOnly} />} />
      <Workbench
        railLabel="Notice pulse"
        rail={<>
          <RailHead title="Notice pulse" />
          <StatTiles items={[
            { label: "Unread", value: String(unread.length), note: newest ? `Newest: ${whenWords(newest.createdAt, now)}` : "All caught up", noteTone: unread.length ? "accent" : undefined, icon: Bell, tone: "live", href: href({ kind: "unread", page: undefined }) },
            { label: "Needs you", value: String(needing.length), note: needing.length ? "Reviews, replies and deadlines" : "Nothing waiting", icon: ListChecks, tone: "brand" },
          ]} />
          <RailCard title="What reaches you" aside="By email and in the app">
            <RailRows empty="" rows={NOTIFICATION_CATEGORIES.map((c) => ({ key: c, title: CATEGORY_LABEL[c] ?? c, sub: MODE[prefs.modes[c]] ?? "In the app only", icon: Bell, tone: "neutral" as const }))} />
          </RailCard>
        </>}
      >
        <Deck id={`notices-${base.split("/")[1]}`} title="Read first" items={deck} emptyTitle="Nothing needs you." emptyBody="No review, reply or deadline is waiting on you." />
        <section className="adList" aria-label="All notifications" data-tour="workspace-notifications">
          <div className="adList__hd"><h2>Inbox</h2><span className="adList__n">{all.length}</span><span className="adList__sp" /><UrlSearch label="Search notifications" placeholder="Title or sender" /></div>
          <div className="adList__pad"><Chips label="Kind" current={kind} items={chipItems} /></div>
          {shown.length ? (
            <>
              <div className="ad__scroll" tabIndex={0} role="region" aria-label="Notifications table, scrolls sideways" data-lenis-prevent>
                <table className="ad__t">
                  <thead><tr><th>Notice</th><th>Kind</th><th>State</th><th>When</th></tr></thead>
                  <tbody>
                    {shown.map((n) => (
                      <ClickRow key={n.id} href={href({ open: n.id })} scroll={false} label={`${n.title}. ${n.readAt ? "Read" : "New"}. Press Enter to open.`}>
                        <td><span className="adT__stack" style={{ minWidth: "14rem" }}><Link href={href({ open: n.id })} scroll={false}><b>{n.title}</b></Link><small className="adT__clip ad__dim">{n.actorName}. {n.summary}</small></span></td>
                        <td>{CATEGORY_LABEL[n.category] ?? "Update"}</td>
                        <td><span className={`ad__pill ad__pill--${n.cancelledAt || n.actionedAt ? "flat" : n.readAt ? "flat" : "live"}`}>{n.cancelledAt ? "Done" : n.actionedAt ? "Done" : n.readAt ? "Read" : "New"}</span></td>
                        <td className="num">{whenWords(n.createdAt, now)}</td>
                      </ClickRow>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager label="Notification pages" total={rows.length} page={page} per={per} noun={rows.length === 1 ? "notice" : "notices"}
                href={(patch) => href({ page: patch.page && patch.page > 1 ? String(patch.page) : undefined, per: patch.per ? String(patch.per) : sp.per, open: undefined })} />
            </>
          ) : (needle || kind) ? (
            <Empty title="No notifications match" icon={Bell} action={<Link className="ad__btn" href={base}>Clear filters</Link>}>Try another kind, or clear the search.</Empty>
          ) : (
            <Empty title="No notifications yet" icon={Bell}>Assignments, decisions and important replies appear here when there is something for you.</Empty>
          )}
        </section>
      </Workbench>
      <NoticeSheet notices={all} readOnly={user.readOnly} />
    </>
  );
}
