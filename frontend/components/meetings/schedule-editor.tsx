"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Row, useDirtyPing } from "@/components/admin/settings/kit";
import { Pick, DateInput } from "@/components/admin/pick";
import { scheduleProblem } from "@/lib/meetings/schedule-check";
import type { Schedule } from "@/lib/meetings/cal";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TIMES = Array.from({ length: 96 }, (_, i) => {
  const value = `${String(Math.floor(i / 4)).padStart(2, "0")}:${String((i % 4) * 15).padStart(2, "0")}`;
  return { value, label: value };
});
/** Every zone the browser knows, and the schedule's own even if it is not one of them. */
const zones = (current: string) => Array.from(new Set([current, ...Intl.supportedValuesOf("timeZone"), "UTC"]));

type Range = Schedule["availability"][number];
type Exception = Schedule["overrides"][number];

/** A time from the quarter-hour list; a time Cal.com holds that is not on it is kept, not lost. */
function TimePick({ value, label, onChange }: { value: string; label: string; onChange: (value: string) => void }) {
  const options = TIMES.some((t) => t.value === value) ? TIMES : [{ value, label: value }, ...TIMES];
  return <Pick value={value} label={label} search options={options} onChange={onChange} />;
}

/** One hour after `time`, capped at the end of the day. */
function plusHour(time: string) {
  const hour = Number(time.slice(0, 2)) + 1;
  return hour > 23 ? "23:45" : `${String(hour).padStart(2, "0")}${time.slice(2)}`;
}

/** The range a new "+" adds: 09:00 to 17:00 on an empty day, otherwise straight after the last one so it never overlaps. */
function nextRange(day: string, ranges: Range[]): Range {
  const ends = ranges.filter((r) => r.days.includes(day)).map((r) => r.endTime).sort();
  const last = ends[ends.length - 1];
  if (!last || last >= "23:00") return { days: [day], startTime: "09:00", endTime: "17:00" };
  return { days: [day], startTime: last, endTime: plusHour(last) };
}

function DayRow({ day, ranges, onChange }: { day: string; ranges: Range[]; onChange: (next: Range[]) => void }) {
  const mine = ranges.map((range, index) => ({ range, index })).filter(({ range }) => range.days.includes(day));
  const setTime = (index: number, key: "startTime" | "endTime", time: string) =>
    onChange(ranges.map((r, i) => (i === index ? { ...r, [key]: time } : r)));
  // A range shared by several days loses only this day; a range for this day alone goes.
  const remove = (index: number) =>
    onChange(ranges.flatMap((row, n) => (n !== index ? [row] : row.days.length > 1 ? [{ ...row, days: row.days.filter((d) => d !== day) }] : [])));
  return (
    <div className="meetHours">
      <strong>{day}</strong>
      <div className="meetHoursRanges">
        {mine.map(({ range, index }) => (
          <div className="meetHoursRange" key={index}>
            <TimePick value={range.startTime} label={`${day} start`} onChange={(time) => setTime(index, "startTime", time)} />
            <span>to</span>
            <TimePick value={range.endTime} label={`${day} end`} onChange={(time) => setTime(index, "endTime", time)} />
            <button type="button" className="ad__iconButton" aria-label={`Remove ${day} time range`} onClick={() => remove(index)}>
              <Trash2 aria-hidden="true" />
            </button>
          </div>
        ))}
        {!mine.length ? <span>Unavailable</span> : null}
      </div>
      <button type="button" className="ad__iconButton" aria-label={`Add ${day} time range`} onClick={() => onChange([...ranges, nextRange(day, ranges)])}>
        <Plus aria-hidden="true" />
      </button>
    </div>
  );
}

function ExceptionRow({ row, onChange, onRemove }: { row: Exception; onChange: (next: Exception) => void; onRemove: () => void }) {
  return (
    <div className="meetOverride">
      <DateInput value={row.date} label="Exception date" onChange={(date) => onChange({ ...row, date })} />
      <TimePick value={row.startTime} label="Exception start" onChange={(startTime) => onChange({ ...row, startTime })} />
      <span>to</span>
      <TimePick value={row.endTime} label="Exception end" onChange={(endTime) => onChange({ ...row, endTime })} />
      <button type="button" className="ad__iconButton" aria-label={`Remove exception ${row.date}`} onClick={onRemove}>
        <Trash2 aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * The weekly hours and date exceptions, posted as one hidden `schedule` field
 * inside the Settings form (its save bar and Discard both work). Each day keeps
 * its own ranges, so removing Tuesday from a Monday-to-Friday range leaves the rest.
 */
export function ScheduleEditor({ schedule }: { schedule: Schedule }) {
  const ping = useDirtyPing();
  const root = useRef<HTMLDivElement>(null);
  const independent = useCallback(
    () => ({ ...schedule, availability: schedule.availability.flatMap((row) => row.days.map((day) => ({ ...row, days: [day] }))) }),
    [schedule],
  );
  const [value, setValue] = useState(independent);

  // Discard resets the form; the editor is state, so it listens for that.
  useEffect(() => {
    const form = root.current?.closest("form");
    const reset = () => setValue(independent());
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, [schedule, independent]);

  function update(next: Schedule) {
    setValue(next);
    ping();
  }
  const problem = scheduleProblem(value);
  const posted = JSON.stringify({ timeZone: value.timeZone, availability: value.availability, overrides: value.overrides });

  return (
    <div ref={root}>
      <input type="hidden" name="schedule" value={posted} />
      <Row label="Schedule time zone" labelId="meet-zone">
        <Pick value={value.timeZone} labelledBy="meet-zone" search options={zones(value.timeZone).map((z) => ({ value: z, label: z }))} onChange={(timeZone) => update({ ...value, timeZone })} />
      </Row>
      <p className="meetHint">Multiple ranges per day are supported. Set your weekly hours here; date exceptions replace that day’s regular hours.</p>
      {DAYS.map((day) => (
        <DayRow key={day} day={day} ranges={value.availability} onChange={(availability) => update({ ...value, availability })} />
      ))}
      <h3>Date exceptions</h3>
      {value.overrides.map((row, i) => (
        <ExceptionRow
          key={i}
          row={row}
          onChange={(next) => update({ ...value, overrides: value.overrides.map((r, n) => (n === i ? next : r)) })}
          onRemove={() => update({ ...value, overrides: value.overrides.filter((_, n) => n !== i) })}
        />
      ))}
      <button
        type="button"
        className="ad__btn ad__btn--plain"
        onClick={() => update({ ...value, overrides: [...value.overrides, { date: new Date().toISOString().slice(0, 10), startTime: "09:00", endTime: "17:00" }] })}
      >
        <Plus aria-hidden="true" /> Add a date exception
      </button>
      {problem ? <p className="meetProblem" role="alert">{problem}</p> : null}
      <p className="meetHint">To block a longer time away, use Cal.com’s Out of Office controls. Existing calendar conflicts are also excluded automatically.</p>
      <a className="meetLink" href="https://app.cal.com/settings/my-account/out-of-office" target="_blank" rel="noopener noreferrer">Manage time away</a>
    </div>
  );
}
