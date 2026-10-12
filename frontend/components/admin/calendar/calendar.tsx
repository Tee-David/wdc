"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Check, ChevronLeft, ChevronRight, Download, Plus } from "lucide-react";
import type { CalAdd, CalCalendar, CalEvent } from "./types";
import "./calendar.css";

/**
 * THE CALENDAR ENGINE: one component for every calendar in the product (projects, the content
 * calendar, meetings, marketing). Day, week and month on one set of events: a mini month with the
 * shown week highlighted, a list of calendars that switch on and off, a time grid of outlined cards
 * with today's column marked, a line for now with an add button, and a month grid of chips.
 *
 * The page hands it plain events and calendars. Nothing here fetches. Days are studio days
 * (UTC+1), as "YYYY-MM-DD" strings, so no browser time zone can move an item to another day.
 * Items without a clock time sit in an "All day" row above the grid.
 */
type View = "day" | "week" | "month";

const MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const SH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DF = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/* Days are handled as UTC midnights so adding a day is always 24 hours. */
const parse = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
const mins = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const pad = (n: number) => String(n).padStart(2, "0");

function studioNow() {
  const d = new Date(Date.now() + 3_600_000).toISOString();
  return { today: d.slice(0, 10), time: d.slice(11, 16) };
}

const phoneQuery = "(max-width: 640px)";
const subscribePhone = (cb: () => void) => { const m = window.matchMedia(phoneQuery); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); };
const phoneNow = () => window.matchMedia(phoneQuery).matches;

type Placed = CalEvent & { s: number; e: number; lane: number; lanes: number };

function lay(list: CalEvent[]): Placed[] {
  const rows: Placed[] = list
    .map((e) => { const s = mins(e.start ?? "09:00"); const en = e.end ? mins(e.end) : s + 60; return { ...e, s, e: Math.max(en, s + 30), lane: 0, lanes: 1 }; })
    .sort((a, b) => a.s - b.s || a.e - b.e);
  let from = 0, groupEnd = -1, ends: number[] = [];
  const close = (to: number) => { let n = 1; for (let q = from; q < to; q++) n = Math.max(n, rows[q].lane + 1); for (let r = from; r < to; r++) rows[r].lanes = n; };
  rows.forEach((e, i) => {
    if (i > from && e.s >= groupEnd) { close(i); from = i; ends = []; }
    let l = 0; while (ends[l] > e.s) l++;
    ends[l] = e.e; e.lane = l; groupEnd = Math.max(groupEnd, e.e);
  });
  close(rows.length);
  return rows;
}

function icsText(events: CalEvent[], name: string) {
  const esc = (s: string) => s.replace(/[\;,]/g, (c) => `\\${c}`).replace(/\r?\n/g, "\\n");
  const stamp = (date: string, time: string) => {
    const t = Date.parse(`${date}T${time}:00.000Z`) - 3_600_000;
    return new Date(t).toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  };
  const out = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//We Dig Creativity//Studio//EN", `X-WR-CALNAME:${esc(name)}`];
  for (const e of events) {
    out.push("BEGIN:VEVENT", `UID:${e.id}@studio`, `DTSTAMP:${stamp(e.date, "00:00")}`);
    if (e.start) {
      out.push(`DTSTART:${stamp(e.date, e.start)}`, `DTEND:${stamp(e.date, e.end ?? hhmm(mins(e.start) + 60))}`);
    } else {
      out.push(`DTSTART;VALUE=DATE:${e.date.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${iso(addDays(parse(e.date), 1)).replace(/-/g, "")}`);
    }
    out.push(`SUMMARY:${esc(e.title)}`);
    if (e.sub || e.note) out.push(`DESCRIPTION:${esc([e.sub, e.note].filter(Boolean).join("\n"))}`);
    out.push("END:VEVENT");
  }
  out.push("END:VCALENDAR");
  return out.join("\r\n");
}

export function Calendar({
  id, cals, events, today, now, add, listTitle = "My calendars", startHour = 8, endHour = 20, rowHeight = 60,
  summaryNote, exportName = "Studio calendar", dataTour, emptyNote,
}: {
  id: string;
  cals: CalCalendar[];
  events: CalEvent[];
  /** The studio's today and the clock time at render, from the server. */
  today: string;
  now: string;
  add?: CalAdd;
  listTitle?: string;
  startHour?: number;
  endHour?: number;
  rowHeight?: number;
  /** A sentence after the count at the foot ("5 with the client"). */
  summaryNote?: string;
  exportName?: string;
  dataTour?: string;
  emptyNote?: string;
}) {
  const router = useRouter();
  const phone = useSyncExternalStore(subscribePhone, phoneNow, () => false);
  const [picked, setPicked] = useState<View | null>(null);
  const [date, setDate] = useState(today);
  const [off, setOff] = useState<Record<string, boolean>>({});
  const [clock, setClock] = useState({ today, time: now });
  useEffect(() => {
    const t = window.setInterval(() => setClock((c) => { const n = studioNow(); return n.today === c.today && n.time === c.time ? c : { today: n.today, time: n.time }; }), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const view: View = picked ?? (phone ? "day" : "week");
  const cur = parse(date);
  const todayD = parse(clock.today);
  const monday = addDays(cur, -((cur.getUTCDay() + 6) % 7));
  const colour = useMemo(() => Object.fromEntries(cals.map((c) => [c.id, c])), [cals]);

  const vis = useMemo(() => events.filter((e) => !off[e.cal] && e.date), [events, off]);
  const byDate = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    for (const e of vis) { const l = m.get(e.date) ?? []; l.push(e); m.set(e.date, l); }
    return m;
  }, [vis]);
  const timed = (d: string) => (byDate.get(d) ?? []).filter((e) => e.start);
  const allDay = (d: string) => (byDate.get(d) ?? []).filter((e) => !e.start);

  const go = (patch: { date?: string; view?: View }) => { if (patch.date) setDate(patch.date); if (patch.view) setPicked(patch.view); };
  const shiftMonth = (dir: number) => {
    const t = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + dir, 1));
    const dim = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
    setDate(iso(new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), Math.min(cur.getUTCDate(), dim)))));
  };
  const shift = (dir: number) => (view === "month" ? shiftMonth(dir) : setDate(iso(addDays(cur, dir * (view === "week" ? 7 : 1)))));

  const days = view === "day" ? [cur] : [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(monday, i));
  const timedInView = days.flatMap((d) => timed(iso(d)));
  const h0 = Math.min(startHour, ...timedInView.map((e) => Math.floor(mins(e.start!) / 60)));
  const h1 = Math.max(endHour, ...timedInView.map((e) => Math.ceil(mins(e.end ?? hhmm(mins(e.start!) + 60)) / 60)));
  const gridH = (h1 - h0) * rowHeight;
  const nowM = mins(clock.time);
  const nowShown = view !== "month" && days.some((d) => iso(d) === clock.today) && nowM >= h0 * 60 && nowM <= h1 * 60;
  const hasAllDay = days.some((d) => allDay(iso(d)).length);

  const addHref = (d: string, t: string | null) => add ? add.href.replace("{date}", d).replace("{time}", t ?? "09:00") : "";
  const slot = (e: React.MouseEvent<HTMLDivElement>, d: string) => {
    if (!add || (e.target as HTMLElement).closest("a")) return;
    const r = e.currentTarget.getBoundingClientRect();
    let m = Math.round(((e.clientY - r.top) / rowHeight * 60) / 30) * 30 + h0 * 60;
    m = Math.max(h0 * 60, Math.min(h1 * 60 - 30, m));
    router.push(addHref(d, hhmm(m)));
  };

  /* The mini month and the month grid use the same six-row-at-most layout. */
  const first = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const dim = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 1, 0)).getUTCDate();
  const rows = Math.ceil((lead + dim) / 7);
  const cells = Array.from({ length: rows * 7 }, (_, i) => addDays(first, i - lead));

  const inView = vis.filter((e) => {
    const p = parse(e.date);
    return view === "day" ? e.date === date : view === "week" ? p >= monday && p <= addDays(monday, 6) : p.getUTCMonth() === cur.getUTCMonth() && p.getUTCFullYear() === cur.getUTCFullYear();
  });
  const range = view === "day"
    ? `${DF[cur.getUTCDay()]} ${cur.getUTCDate()} ${MON[cur.getUTCMonth()]}`
    : view === "week"
      ? (() => { const e = addDays(monday, 6); return monday.getUTCMonth() === e.getUTCMonth() ? `${monday.getUTCDate()} to ${e.getUTCDate()} ${SH[e.getUTCMonth()]}` : `${monday.getUTCDate()} ${SH[monday.getUTCMonth()]} to ${e.getUTCDate()} ${SH[e.getUTCMonth()]}`; })()
      : `${inView.length} ${inView.length === 1 ? "item" : "items"}`;

  const download = () => {
    const blob = new Blob([icsText(inView, exportName)], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${id}-${date}.ics`; a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const label = (e: CalEvent, d: Date) => `${e.title}, ${DW[d.getUTCDay()]} ${d.getUTCDate()} ${SH[d.getUTCMonth()]}${e.start ? `, ${e.start}${e.end ? ` to ${e.end}` : ""}` : ", all day"}${colour[e.cal] ? `, ${colour[e.cal].label}` : ""}`;
  const chip = (e: CalEvent, d: Date, cls: string, text: string) => {
    const style = { "--c": colour[e.cal]?.color ?? "var(--cal-1)" } as React.CSSProperties;
    return e.href
      ? <Link key={e.id} href={e.href} className={cls} style={style} aria-label={label(e, d)}><span className="adCe__chipT">{text}</span></Link>
      : <span key={e.id} className={cls} style={style} aria-label={label(e, d)}><span className="adCe__chipT">{text}</span></span>;
  };

  return (
    <div className="adCe" data-tour={dataTour}>
      <aside className="adCe__side" aria-label="Calendar tools">
        {add ? <Link className="ad__btn ad__btn--primary adCe__add" href={addHref(date, null)}><Plus aria-hidden="true" />{add.label}</Link> : null}
        <div className="adCe__mini">
          <div className="adCe__miniHead">
            <strong className="adCe__miniTitle">{MON[cur.getUTCMonth()]} {cur.getUTCFullYear()}</strong>
            <span className="adCe__miniNav">
              <button type="button" className="adCe__miniBtn" aria-label="Previous month" onClick={() => shiftMonth(-1)}><ChevronLeft aria-hidden="true" /></button>
              <button type="button" className="adCe__miniBtn" aria-label="Next month" onClick={() => shiftMonth(1)}><ChevronRight aria-hidden="true" /></button>
            </span>
          </div>
          <div className="adCe__miniGrid" role="group" aria-label={`${MON[cur.getUTCMonth()]} ${cur.getUTCFullYear()}`}>
            {["M", "T", "W", "T", "F", "S", "S"].map((h, i) => <span key={i} className="adCe__miniH">{h}</span>)}
            {cells.map((d, i) => {
              const k = iso(d), list = byDate.get(k) ?? [];
              const inM = d.getUTCMonth() === cur.getUTCMonth();
              const inWeek = view === "week" && d >= monday && d <= addDays(monday, 6);
              const sel = k === date;
              return (
                <button key={k} type="button" aria-pressed={sel}
                  className={`adCe__miniD${inM ? "" : " out"}${k === clock.today ? " is-today" : ""}${sel ? " is-sel" : ""}${inWeek ? " is-week" : ""}${inWeek && i % 7 === 0 ? " wk-s" : ""}${inWeek && i % 7 === 6 ? " wk-e" : ""}`}
                  aria-label={`${DW[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}${list.length ? `, ${list.length} ${list.length === 1 ? "item" : "items"}` : ""}`}
                  onClick={() => setDate(k)}>
                  <span className="adCe__miniN">{d.getUTCDate()}</span>
                  <span className="adCe__miniDot" style={{ background: list.length ? colour[list[0].cal]?.color ?? "var(--cal-1)" : "transparent" }} />
                </button>
              );
            })}
          </div>
        </div>
        <section className="adCe__list" aria-label={listTitle}>
          <div className="adCe__listHead"><strong>{listTitle}</strong></div>
          {cals.map((c) => {
            const on = !off[c.id];
            return (
              <button key={c.id} type="button" role="checkbox" aria-checked={on} className="adCe__row" style={{ "--c": c.color } as React.CSSProperties}
                onClick={() => setOff((o) => { const n = { ...o }; if (on) n[c.id] = true; else delete n[c.id]; return n; })}>
                <span className="adCe__box"><Check aria-hidden="true" /></span>
                <span className="adCe__name">{c.label}</span>
                <span className="adCe__n">{events.filter((e) => e.cal === c.id).length}</span>
              </button>
            );
          })}
        </section>
      </aside>

      <div className="adCe__main">
        <header className="adCe__head">
          <div className="adCe__ttl"><h3>{MON[cur.getUTCMonth()]} {cur.getUTCFullYear()}</h3><span>{range}</span></div>
          <span className="adCe__nav">
            <button type="button" className="adCe__ib" aria-label="Previous" onClick={() => shift(-1)}><ChevronLeft aria-hidden="true" /></button>
            <button type="button" className="adCe__ib" aria-label="Next" onClick={() => shift(1)}><ChevronRight aria-hidden="true" /></button>
          </span>
          <button type="button" className="ad__btn" onClick={() => setDate(clock.today)}>Today</button>
          <span className="adCe__sp" />
          <div className="adCe__seg" role="group" aria-label="Calendar view" style={{ "--i": { day: 0, week: 1, month: 2 }[view] } as React.CSSProperties}>
            <span className="adCe__pill" aria-hidden="true" />
            {(["day", "week", "month"] as const).map((v) => (
              <button key={v} type="button" aria-pressed={view === v} className={view === v ? "on" : ""} onClick={() => setPicked(v)}>{v[0].toUpperCase() + v.slice(1)}</button>
            ))}
          </div>
          <button type="button" className="ad__btn adCe__exp" onClick={download} disabled={!inView.length}><Download aria-hidden="true" />Export</button>
        </header>

        <div className="adCe__strip" role="group" aria-label="Days this week">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => {
            const d = addDays(monday, i), k = iso(d), sel = k === date;
            return (
              <button key={k} type="button" aria-pressed={sel} className={`adCe__stripD${sel ? " is-sel" : ""}${k === clock.today ? " is-today" : ""}`}
                aria-label={`${DW[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}`} onClick={() => go({ date: k, view: view === "month" ? "day" : view })}>
                <span>{DW[d.getUTCDay()][0]}</span><span className="adCe__stripN">{d.getUTCDate()}</span>
              </button>
            );
          })}
        </div>

        {view !== "month" ? (
          <div className="adCe__wrap" tabIndex={0} role="region" aria-label="Schedule, scrolls sideways and down" data-lenis-prevent>
            <div className={`adCe__tg${view === "day" ? " is-day" : ""}`} style={{ "--cols": days.length, "--gh": `${gridH}px`, "--rh": `${rowHeight}px` } as React.CSSProperties}>
              <div className="adCe__tgHead">
                <span className="adCe__gmt">GMT +1</span>
                {days.map((d) => (
                  <span key={iso(d)} className={`adCe__day${iso(d) === clock.today ? " is-today" : ""}`}>
                    <span>{DW[d.getUTCDay()]}</span><span className="adCe__dayN">{d.getUTCDate()}</span>
                  </span>
                ))}
              </div>
              {hasAllDay ? (
                <div className="adCe__allday">
                  <span className="adCe__gmt">All day</span>
                  {days.map((d) => {
                    const list = allDay(iso(d));
                    return <div key={iso(d)} className="adCe__adCell">{list.slice(0, 3).map((e) => chip(e, d, "adCe__chip", e.title))}{list.length > 3 ? <button type="button" className="adCe__more" onClick={() => go({ date: iso(d), view: "day" })}>+{list.length - 3} more</button> : null}</div>;
                  })}
                </div>
              ) : null}
              <div className="adCe__tgBody">
                <div className="adCe__hours" aria-hidden="true">
                  {Array.from({ length: h1 - h0 }, (_, i) => <span key={i} className="adCe__hr" style={{ top: i * rowHeight }}>{pad(h0 + i)}:00</span>)}
                </div>
                {days.map((d) => (
                  // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
                  <div key={iso(d)} className={`adCe__col${iso(d) === clock.today ? " is-today" : ""}${add ? " can-add" : ""}`} onClick={(e) => slot(e, iso(d))}>
                    {lay(timed(iso(d))).map((e) => {
                      const top = Math.max(0, (e.s - h0 * 60) / 60 * rowHeight);
                      const h = Math.max(46, (e.e - e.s) / 60 * rowHeight) - 3;
                      const ppl = e.people ?? [];
                      const style = { top: top + 1, height: h, left: `calc(${e.lane * 100 / e.lanes}% + 3px)`, width: `calc(${100 / e.lanes}% - 6px)`, "--c": colour[e.cal]?.color ?? "var(--cal-1)" } as React.CSSProperties;
                      const body = (
                        <>
                          <span className="adCe__evTop">
                            {e.mark ? <span className="adCe__logo" style={{ background: e.mark.bg }} aria-hidden="true">{e.mark.text}</span> : null}
                            <strong className="adCe__evT">{e.title}</strong>
                          </span>
                          <span className="adCe__evTime">{hhmm(e.s)} to {hhmm(e.e)}</span>
                          {h >= 104 && e.sub ? <span className="adCe__evSub">{e.sub}</span> : null}
                          {h >= 76 && ppl.length ? (
                            <span className="adCe__people">
                              {ppl.slice(0, 3).map((a, i) => <span key={i} className="adCe__av" style={{ background: a.tone ?? "var(--ad-tone-brand)" }}>{a.initials}</span>)}
                              {ppl.length > 3 ? <span className="adCe__avMore">+{ppl.length - 3}</span> : null}
                            </span>
                          ) : null}
                          {h >= 86 && e.tag ? <span className={`ad__pill ad__pill--${e.tag.tone} adCe__tag`}>{e.tag.text}</span> : null}
                        </>
                      );
                      const cls = `adCe__ev${h < 56 ? " short" : ""}`;
                      return e.href
                        ? <Link key={e.id} href={e.href} className={cls} style={style} aria-label={label(e, d)}>{body}</Link>
                        : <div key={e.id} className={cls} style={style} aria-label={label(e, d)}>{body}</div>;
                    })}
                  </div>
                ))}
                {nowShown ? (
                  <div className="adCe__now" style={{ top: (nowM - h0 * 60) / 60 * rowHeight }}>
                    <span className="adCe__nowPill">{clock.time}</span>
                    {add ? <Link className="adCe__nowAdd" href={addHref(clock.today, hhmm(Math.ceil(nowM / 30) * 30))} aria-label={`${add.label} now`}><Plus aria-hidden="true" /></Link> : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="adCe__mWrap" tabIndex={0} role="region" aria-label="Month, scrolls sideways" data-lenis-prevent>
            <div className="adCe__mGrid" role="group" aria-label={`${MON[cur.getUTCMonth()]} ${cur.getUTCFullYear()}`}>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => <span key={w} className="adCe__mHead">{w}</span>)}
              {cells.map((d) => {
                const k = iso(d), list = byDate.get(k) ?? [];
                const inM = d.getUTCMonth() === cur.getUTCMonth();
                return (
                  <div key={k} className={`adCe__mCell${inM ? "" : " out"}${k === clock.today ? " is-today" : ""}`}>
                    <button type="button" className="adCe__mNum" aria-label={`Open ${DW[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}, ${list.length} ${list.length === 1 ? "item" : "items"}`} onClick={() => go({ date: k, view: "day" })}>{d.getUTCDate()}</button>
                    {list.slice(0, 3).map((e) => chip(e, d, "adCe__mEv", `${e.start ? `${e.start} ` : ""}${e.title}`))}
                    {list.length > 3 ? <button type="button" className="adCe__more" onClick={() => go({ date: k, view: "day" })}>+{list.length - 3} more</button> : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="adCe__sum" role="status">
          {inView.length
            ? `${inView.length} ${inView.length === 1 ? "item" : "items"} ${view === "day" ? (date === clock.today ? "today" : "on this day") : view === "week" ? "this week" : "this month"}${summaryNote ? `. ${summaryNote}` : "."}`
            : emptyNote ?? "Nothing is booked in this view. Pick another day or turn a calendar back on."}
        </p>
      </div>
    </div>
  );
}
