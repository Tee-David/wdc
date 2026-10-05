"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Pick } from "@/components/admin/pick";
const MONTHS = Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat("en", { month: "long" }).format(new Date(2020, i, 1)));
export function CalendarPeriod({ value, onChange }: { value: string; onChange: (date: string) => void }) {
  const [year, month] = value.split("-").map(Number);
  function shift(step: number) { const d = new Date(year, month - 1 + step, 1); onChange(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`); }
  return <div className="meetPeriod">
    <button type="button" className="ad__iconButton" aria-label="Previous month" onClick={() => shift(-1)}><ChevronLeft aria-hidden="true" /></button>
    <Pick label="Month" value={String(month)} options={MONTHS.map((label,i)=>({ label, value:String(i+1) }))} onChange={m=>onChange(`${year}-${m.padStart(2,"0")}-01`)} />
    <Pick label="Year" value={String(year)} options={Array.from({length:21},(_,i)=>({label:String(year-10+i),value:String(year-10+i)}))} onChange={y=>onChange(`${y}-${String(month).padStart(2,"0")}-01`)} />
    <button type="button" className="ad__iconButton" aria-label="Next month" onClick={() => shift(1)}><ChevronRight aria-hidden="true" /></button>
  </div>;
}
export function MonthCalendar({ value, onChange, available, children }: { value:string;onChange:(date:string)=>void;available?:Set<string>;children?:(date:string)=>React.ReactNode }) {
  const [year, month] = value.split("-").map(Number);
  const count = new Date(year,month,0).getDate();
  const offset = (new Date(year,month-1,1).getDay()+6)%7;
  return <div className="meetMonth" role="group" aria-label="Meeting calendar">
    { ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(day=><div className="meetWeekday" key={day}><abbr title={day}>{day.slice(0,1)}</abbr></div>) }
    {Array.from({length:offset},(_,i)=><span key={`empty${i}`} />)}
    {Array.from({length:count},(_,i)=>{const date=`${year}-${String(month).padStart(2,"0")}-${String(i+1).padStart(2,"0")}`;return <div className={`meetDay${date===value?" is-selected":""}`} key={date}>
      <button type="button" aria-label={new Intl.DateTimeFormat("en",{dateStyle:"full"}).format(new Date(year,month-1,i+1))} aria-pressed={date===value} disabled={available&&!available.has(date)} onClick={()=>onChange(date)}>{i+1}{available?.has(date)?<span className="meetDot" aria-hidden="true" />:null}</button>
      {children?.(date)}
    </div>})}
  </div>;
}
