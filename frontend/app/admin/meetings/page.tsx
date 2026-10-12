import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarCheck, CalendarClock, Hourglass, PhoneOff, Plus } from "lucide-react";
import { adminRole } from "@/lib/admin/guard";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import { meetingList } from "@/lib/meetings/store";
import type { Booking } from "@/lib/meetings/cal";
import { safeJoinUrl } from "@/components/meetings/links";
import { dateTimeWords, dateWords, nowMs } from "@/lib/admin/when";
import { studioStamp } from "@/components/admin/calendar/studio-time";
import type { CalEvent } from "@/components/admin/calendar/types";
import { Calendar } from "@/components/admin/calendar/calendar";
import { Deck, type DeckItem } from "@/components/admin/deck";
import { PageHead } from "@/components/admin/page-head";
import { RailCard, RailHead, StatTiles, Workbench } from "@/components/admin/workbench";
import { RailRows } from "@/components/admin/rail-list";
import { Tabs } from "@/components/admin/tabs";
import { UrlSearch } from "@/components/admin/url-search";
import { ClickRow } from "@/components/admin/click-row";
import { Pager, readPer } from "@/components/admin/pager";
import { PickAll, RowPick } from "@/components/admin/bulk";
import { Empty } from "@/components/admin/bits";
import { MeetingSheet, MeetingsBulk, MeetingsChores } from "@/components/meetings/meetings-parts";

export const metadata = { title: "Meetings" };

/**
 * MEETINGS: what needs you this week (a deck of requests to answer and the next conversations), then every meeting
 * as a list with a Calendar tab, with the pulse of the diary in the rail. Bookings are the studio's own persisted
 * copy of what Cal.com holds; the address bar keeps the tab, the search and the page, and `?open=` shows one meeting
 * in a sheet where it can be approved, declined, rescheduled or cancelled. Admin only, as before: staff are told
 * to ask Admin until scoped access exists.
 */
type Q = { tab?: string; q?: string; page?: string; per?: string; open?: string };
const TABS = [["coming", "Coming up"], ["requests", "Requests"], ["past", "Past"], ["calendar", "Calendar"]] as const;
type Tab = (typeof TABS)[number][0];
const DAY = 86_400_000;
const st = (b: Booking) => b.status.toLowerCase();
const dead = (b: Booking) => ["cancelled", "rejected"].includes(st(b));
const who = (b: Booking) => b.attendees?.[0]?.name || "Meeting attendee";
const mins = (b: Booking) => Math.max(0, Math.round((Date.parse(b.end) - Date.parse(b.start)) / 60_000));

export default async function MeetingsPage({ searchParams }: { searchParams: Promise<Q> }) {
  const role = await adminRole();
  if (!role) redirect("/login");
  if (role !== "owner") {
    return (
      <PageHead title="Meetings" lede="Studio meetings need scoped staff access. Ask Admin to arrange or change a meeting while delegation is being configured." />
    );
  }
  await syncStore();
  persistSoon();
  const q = await searchParams;
  const tab: Tab = TABS.find(([k]) => k === q.tab)?.[0] ?? "coming";
  const per = readPer(q.per);
  const needle = String(q.q ?? "").trim().slice(0, 80).toLocaleLowerCase();
  const now = nowMs();

  let all: Booking[] = [];
  let failed = false;
  try { all = await meetingList(new Date(now - 90 * DAY).toISOString(), new Date(now + 180 * DAY).toISOString()); } catch { failed = true; }
  const searched = all.filter((b) => !needle || [b.title, b.status, ...(b.attendees ?? []).flatMap((a) => [a.name, a.email])].join(" ").toLocaleLowerCase().includes(needle));

  const upcoming = searched.filter((b) => !dead(b) && Date.parse(b.end) >= now).sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const requests = upcoming.filter((b) => st(b) === "pending");
  const past = searched.filter((b) => dead(b) || Date.parse(b.end) < now).sort((a, b) => Date.parse(b.start) - Date.parse(a.start));
  const lists: Record<Tab, Booking[]> = { coming: upcoming, requests, past, calendar: [] };
  const list = lists[tab];

  const allUpcoming = all.filter((b) => !dead(b) && Date.parse(b.end) >= now).sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const allPending = allUpcoming.filter((b) => st(b) === "pending");
  const next = allUpcoming.find((b) => st(b) !== "pending") ?? allUpcoming[0];
  const held = all.filter((b) => !dead(b) && Date.parse(b.end) < now && Date.parse(b.end) >= now - 30 * DAY);
  const cancelled = all.filter((b) => dead(b) && Date.parse(b.start) >= now - 30 * DAY && Date.parse(b.start) <= now + 30 * DAY);

  const href = (patch: Partial<Record<keyof Q, string | undefined>>) => {
    const n = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...q, ...patch })) if (v) n.set(k, v);
    const s = n.toString();
    return `/admin/meetings${s ? `?${s}` : ""}`;
  };

  /* THE DECK: requests first (they wait on Admin), then this week's meetings, soonest first. */
  const week = allUpcoming.filter((b) => Date.parse(b.start) <= now + 7 * DAY);
  const deck: DeckItem[] = [
    ...allPending.map((b): DeckItem => ({
      id: `req-${b.uid}`, kind: "Request", urgency: dateTimeWords(b.start, now), tone: "warn", label: "Needs an answer",
      title: `${who(b)} asked for ${b.title}`,
      body: `They offered ${dateTimeWords(b.start, now)} for ${mins(b)} minutes. Approve it, decline it or suggest another time.`,
      facts: [{ k: "Attendee", v: who(b) }, { k: "Length", v: `${mins(b)} min` }, { k: "Offered", v: dateTimeWords(b.start, now) }],
      why: "Nobody has answered this request yet.",
      primary: { label: "Review the request", href: href({ open: b.uid }) },
      open: href({ open: b.uid }),
    })),
    ...week.filter((b) => st(b) !== "pending").map((b): DeckItem => {
      const hours = Math.max(0, Math.round((Date.parse(b.start) - now) / 3_600_000));
      const joinUrl = safeJoinUrl(b.meetingUrl);
      return {
        id: `meet-${b.uid}`, kind: "Meeting", urgency: hours < 24 ? (hours < 1 ? "Starting now" : `In ${hours} h`) : dateWords(b.start, now), tone: hours < 24 ? "live" : "brand", label: b.title,
        title: `${b.title} with ${who(b)}`,
        body: `${dateTimeWords(b.start, now)} for ${mins(b)} minutes. ${joinUrl ? "The meeting link is ready." : "The provider has not supplied a meeting link yet."}`,
        facts: [{ k: "Attendee", v: who(b) }, { k: "Length", v: `${mins(b)} min` }, { k: "Link", v: joinUrl ? "Ready" : "Not yet" }],
        why: "It starts within the week.",
        primary: { label: "Open the meeting", href: href({ open: b.uid }) },
        ...(joinUrl ? { secondary: { label: "Join meeting", href: joinUrl } } : {}),
        open: href({ open: b.uid }),
      };
    }),
  ].slice(0, 8);

  const lede = failed
    ? "Meetings could not be read just now. Try again in a moment."
    : <>{allUpcoming.length} coming up, {allPending.length} waiting for an answer. <strong>{next ? `Next is ${dateTimeWords(next.start, now)}.` : "Nothing is booked."}</strong></>;

  const tabItems = TABS.map(([key, label]) => ({
    key, label, href: href({ tab: key === "coming" ? undefined : key, page: undefined, open: undefined }),
    count: key === "calendar" ? undefined : lists[key as Tab].length,
    tone: key === "requests" && requests.length ? ("warn" as const) : undefined,
  }));

  /* Calendar events: confirmed and awaiting, one calendar each. */
  const events: CalEvent[] = (tab === "calendar" ? searched : []).filter((b) => !dead(b)).map((b) => {
    const s = studioStamp(b.start), e = studioStamp(b.end);
    return {
      id: b.uid, date: s.date, start: s.time, end: e.date === s.date ? e.time : undefined, title: b.title, sub: who(b), cal: st(b) === "pending" ? "pending" : "confirmed",
      href: href({ open: b.uid }),
      tag: st(b) === "pending" ? { text: "Awaiting confirmation", tone: "warn" as const } : undefined,
    };
  });

  const pageCount = Math.max(1, Math.ceil(list.length / per));
  const page = Math.min(pageCount, Math.max(1, Number.parseInt(q.page ?? "1", 10) || 1));
  const rows = list.slice((page - 1) * per, page * per);
  const stamp = studioStamp(now);

  return (
    <>
      <PageHead
        title="Meetings" lede={lede}
        action={<Link className="ad__btn ad__btn--primary" href="/meet"><Plus aria-hidden="true" />Book a meeting</Link>}
        chores={<MeetingsChores owner />}
      />
      {failed ? (
        <Empty title="Meetings could not be loaded" action={<Link className="ad__btn" href={href({})}>Try again</Link>}>
          The booking records could not be read. If this keeps happening, check migrations and system health in Settings, System.
        </Empty>
      ) : (
        <Workbench
          railLabel="Meeting pulse"
          rail={<>
            <RailHead title="Meeting pulse" />
            <StatTiles items={[
              { label: "Coming up", value: String(allUpcoming.length), note: next ? `Next: ${dateWords(next.start, now)}` : "Nothing booked", icon: CalendarClock, tone: "brand", href: href({ tab: undefined, page: undefined }) },
              { label: "Waiting for an answer", value: String(allPending.length), note: allPending.length ? "Time not confirmed" : "No open requests", noteTone: allPending.length ? "accent" : undefined, icon: Hourglass, tone: "warn", href: href({ tab: "requests", page: undefined }) },
              { label: "Held, 30 days", value: String(held.length), note: held.length ? "Meetings that took place" : "None in that time", icon: CalendarCheck, tone: "good", href: href({ tab: "past", page: undefined }) },
              { label: "Cancelled", value: String(cancelled.length), note: "Within 30 days either side", icon: PhoneOff, tone: "neutral" },
            ]} />
            <RailCard title="Next up" aside="Soonest first">
              <RailRows
                empty="Nothing is booked. Share the booking link and people can ask for a time."
                rows={allUpcoming.slice(0, 3).map((b) => ({
                  key: b.uid, title: who(b), sub: `${b.title} · ${dateTimeWords(b.start, now)}`, icon: CalendarClock, tone: "neutral" as const,
                  href: href({ open: b.uid }), tag: st(b) === "pending" ? { text: "Waiting", tone: "warn" as const } : undefined,
                }))}
              />
            </RailCard>
          </>}
        >
          <Deck
            id="meetings" title="Meetings this week" items={deck}
            emptyTitle="Nothing needs you this week." emptyBody="No request is waiting and no meeting starts in the next seven days."
            emptyNext={next ? { label: "Open the next meeting", href: href({ open: next.uid }) } : { label: "Book a meeting", href: "/meet" }}
          />

          <section className="adList" aria-label="All meetings" data-tour="meetings-list">
            <div className="adList__hd">
              <h2>All meetings</h2><span className="adList__n">{all.filter((b) => !dead(b)).length}</span><span className="adList__sp" />
              <UrlSearch label="Search meetings" placeholder="Name, title or email" />
            </div>
            <Tabs label="Meeting views" items={tabItems} current={tab} />
            {tab === "calendar" ? (
              events.length || !needle ? (
                <Calendar
                  id="meetings" today={stamp.date} now={stamp.time} events={events} dataTour="meetings-calendar"
                  cals={[{ id: "confirmed", label: "Confirmed", color: "var(--cal-3)" }, { id: "pending", label: "Awaiting confirmation", color: "var(--cal-5)" }]}
                  add={{ label: "Book a meeting", href: "/meet" }} exportName="Studio meetings"
                  emptyNote="No meeting is booked in this view. Pick another day or turn a calendar back on."
                />
              ) : <Empty title={`No meeting matches “${q.q?.trim()}”`} action={<Link className="ad__btn" href={href({ q: undefined })}>Clear search</Link>}>Search by attendee name, email or meeting title.</Empty>
            ) : rows.length ? (
              <>
                <MeetingsBulk target="meetings-table" labels={Object.fromEntries(all.map((b) => [b.uid, b.title]))} />
                <div className="ad__scroll" id="meetings-table" tabIndex={0} role="region" aria-label="Meetings table, scrolls sideways" data-lenis-prevent>
                  <table className="ad__t">
                    <thead>
                      <tr>
                        <th><span className="ad__pickRow"><PickAll label="Select every meeting" />Meeting</span></th>
                        <th>When</th><th>Length</th><th>State</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((b) => (
                        <ClickRow key={b.uid} href={href({ open: b.uid })} scroll={false} label={`${b.title} with ${who(b)}, ${dateTimeWords(b.start, now)}. Press Enter to open.`}>
                          <td>
                            <span className="ad__who">
                              <RowPick id={b.uid} label={b.title} />
                              <span><Link href={href({ open: b.uid })} scroll={false}><b>{b.title}</b></Link><small>{who(b)}</small></span>
                            </span>
                          </td>
                          <td className="num">{dateTimeWords(b.start, now)}</td>
                          <td className="num">{mins(b)} min</td>
                          <td><span className={`ad__pill ad__pill--${st(b) === "pending" ? "warn" : dead(b) ? "flat" : Date.parse(b.end) < now ? "flat" : "good"}`}>{st(b) === "pending" ? "Awaiting confirmation" : dead(b) ? b.status : Date.parse(b.end) < now ? "Held" : "Confirmed"}</span></td>
                        </ClickRow>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pager label="Meeting pages" total={list.length} page={page} per={per} noun={list.length === 1 ? "meeting" : "meetings"}
                  href={(patch) => href({ page: patch.page && patch.page > 1 ? String(patch.page) : undefined, per: patch.per ? String(patch.per) : q.per, open: undefined })} />
              </>
            ) : (
              <Empty
                title={needle ? `No meeting matches “${q.q?.trim()}”` : tab === "requests" ? "No requests are waiting" : tab === "past" ? "No past meetings yet" : "No meetings are coming up"}
                action={needle ? <Link className="ad__btn" href={href({ q: undefined })}>Clear search</Link> : <Link className="ad__btn" href="/meet">Book a meeting</Link>}
              >
                {needle ? "Search by attendee name, email or meeting title." : tab === "requests" ? "A request appears here when someone asks for a time that needs your approval." : tab === "past" ? "Meetings that took place or were cancelled are kept here." : "Share the booking link and people can ask for a time."}
              </Empty>
            )}
          </section>
        </Workbench>
      )}
      <MeetingSheet meetings={all} />
    </>
  );
}
