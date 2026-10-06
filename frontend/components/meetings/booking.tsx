"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Mail } from "lucide-react";
import { CalendarPeriod, MonthCalendar } from "./calendar";
import { ToastHost, toast } from "@/components/admin/toast";
import { Pick } from "@/components/admin/pick";
import { meetingCommand, guestToken } from "./client";
import type { Booking, Slots } from "@/lib/meetings/cal";
import "./meetings.css";

const localDate = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const zones = Intl.supportedValuesOf("timeZone");
const fallbackZones = ["Africa/Lagos","Europe/London","Europe/Paris","America/New_York","America/Chicago","America/Los_Angeles","Asia/Dubai","Asia/Kolkata","Australia/Sydney","UTC"];
export function BookingForm({ managementToken, booking }: { managementToken?:string;booking?:Booking }) {
  const [step,setStep]=useState(0), [date,setDate]=useState(localDate), [zone,setZone]=useState(()=>Intl.DateTimeFormat().resolvedOptions().timeZone), [slots,setSlots]=useState<Slots>({}), [time,setTime]=useState("");
  const [name,setName]=useState(booking?.attendees?.[0]?.name||""), [email,setEmail]=useState(booking?.attendees?.[0]?.email||""), [context,setContext]=useState("");
  const [busy,setBusy]=useState(false), [loading,setLoading]=useState(false), [error,setError]=useState(""), [notice,setNotice]=useState(""), [token,setToken]=useState(""), [result,setResult]=useState<Booking|null>(null);
  const [configuration,setConfiguration]=useState<{enabled:boolean;duration:number}|null>(null);
  useEffect(()=>{const controller=new AbortController();fetch("/api/meetings?view=config",{signal:controller.signal}).then(async response=>{const body=await response.json();if(!response.ok)throw new Error(body.error);setConfiguration(body)}).catch(error=>{if(!controller.signal.aborted)setError(error instanceof Error?error.message:"Scheduling setup is unavailable.")});return()=>controller.abort()},[]);
  const monthKey=date.slice(0,7);
  useEffect(()=>{
    if(step!==1) return;
    const controller=new AbortController();
    const [y,m]=monthKey.split("-").map(Number); const start=`${y}-${String(m).padStart(2,"0")}-01`, end=`${y}-${String(m).padStart(2,"0")}-${new Date(y,m,0).getDate()}`;
    Promise.resolve().then(()=>{setLoading(true);setError("");});
    fetch(`/api/meetings?${new URLSearchParams({ start,end,timeZone:zone })}`,{signal:controller.signal}).then(async response=>{
      const body=await response.json();if(!response.ok)throw new Error(body.error);setSlots(body.slots);
    }).catch(e=>{if(e.name!=="AbortError")setError(e.message||"Available times could not be loaded.");}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[step,monthKey,zone]);
  const available=new Set(Object.keys(slots).filter(day=>slots[day]?.length));
  const timeLabel=(start:string)=>new Intl.DateTimeFormat("en",{timeZone:zone,hour:"2-digit",minute:"2-digit"}).format(new Date(start));
  const dateLabel=(start:string)=>new Intl.DateTimeFormat("en",{timeZone:zone,dateStyle:"full"}).format(new Date(start));
  async function confirm() {
    setBusy(true);setError("");const access=managementToken||guestToken();setToken(access);
    try {
      const done=await meetingCommand(managementToken?{action:"reschedule",token:access,start:time,reason:context}:{action:"book",token:access,start:time,name,email,timeZone:zone,context},setNotice);
      setResult(done.booking);setNotice(done.notices);setStep(4);toast(managementToken?"Meeting updated":"Meeting saved");sessionStorage.removeItem("wdc:booking-token");
    } catch(e){setError(e instanceof Error?e.message:"Your request could not be completed.");toast("Meeting request needs attention","bad");}finally{setBusy(false);}
  }
  return <><ToastHost/><div className="meetWrap meetPublic">
    <ol className="meetSteps" aria-label="Booking progress">{["Meeting","Date and time","Your details","Review"].map((label,i)=><li key={label} aria-current={step===i?"step":undefined}>{i+1}. {label}</li>)}</ol>
    {error?<p className="meetError" role="alert">{error} <Link href="/contact">Contact the studio</Link></p>:null}
    {notice&&busy?<p role="status" className="meetHint">{notice}</p>:null}
    {step===0?<section className="meetIntro" aria-labelledby="meetIntroTitle">
      <header className="meetIntroHead">
        <h2 id="meetIntroTitle">{managementToken?"Choose a new time":"Project conversation"}</h2>
        <p className="meetHint">A focused conversation about what you want to build, improve or explore. No account is needed.</p>
      </header>
      <p className="meetIntroMeta"><CalendarDays aria-hidden="true" /> {configuration?.duration ?? 30} minutes · Video call</p>
      {configuration&&!configuration.enabled?<p className="meetHint meetIntroNotice">Online booking is currently paused. Send an enquiry and the studio will help arrange a time.</p>:null}
      <div className="meetActions"><button className="ad__btn" disabled={!configuration?.enabled} onClick={()=>setStep(1)}>Choose a time <ArrowRight aria-hidden="true" /></button><Link className="ad__btn ad__btn--plain" href="/start">Send a project enquiry</Link></div>
    </section>:null}
    {step===1?<><div className="meetField"><label id="meetZone">Times shown in</label><Pick labelledBy="meetZone" value={zone} onChange={value=>{setZone(value);setTime("");}} options={Array.from(new Set([zone,...zones,...fallbackZones])).map(z=>({value:z,label:z.replaceAll("_"," ")}))} search /></div><div className="meetSplit"><div><CalendarPeriod value={date} onChange={value=>{setDate(value);setTime("");}}/><div style={{marginTop:20}}>{loading?<p className="meetBusy" role="status">Checking available times…</p>:<MonthCalendar value={date} onChange={value=>{setDate(value);setTime("");}} available={available}/>}</div></div><div><h3>{new Intl.DateTimeFormat("en",{dateStyle:"long"}).format(new Date(`${date}T12:00:00`))}</h3>{!loading&&!slots[date]?.length?<div className="meetEmpty"><p>No times are available on this day. Choose another date or send us an enquiry.</p><Link href="/contact">Send an enquiry</Link></div>:<div className="meetTimes">{(slots[date]||[]).map(slot=><button key={slot.start} className="meetSlot" aria-pressed={time===slot.start} onClick={()=>setTime(slot.start)}>{timeLabel(slot.start)}</button>)}</div>}</div></div><div className="meetActions" style={{marginTop:28}}><button className="ad__btn ad__btn--plain" onClick={()=>setStep(0)}><ArrowLeft aria-hidden="true" /> Back</button><button className="ad__btn" disabled={!time||loading} onClick={()=>setStep(managementToken?3:2)}>Continue <ArrowRight aria-hidden="true" /></button></div></>:null}
    {step===2?<form onSubmit={event=>{event.preventDefault();setStep(3);}}><h2>Your details</h2><label className="meetField">Full name<input required value={name} onChange={e=>setName(e.target.value)} maxLength={120} autoComplete="name"/></label><label className="meetField">Email address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} maxLength={320} autoComplete="email"/></label><label className="meetField">What would you like to discuss? <span>Optional</span><textarea value={context} onChange={e=>setContext(e.target.value)} maxLength={2000} rows={4}/></label><p className="meetHint"><Mail aria-hidden="true"/> Your email receives the calendar confirmation and important meeting changes. Optional timed reminders are currently off.</p><div className="meetActions"><button type="button" className="ad__btn ad__btn--plain" onClick={()=>setStep(1)}>Back</button><button className="ad__btn">Review meeting</button></div></form>:null}
    {step===3?<><h2>Review your meeting</h2><p><strong>Project conversation</strong></p><p>{dateLabel(time)} · {timeLabel(time)} · {zone}</p><p>{name} · {email}</p>{context?<p>{context}</p>:null}<p className="meetHint">Availability is checked when you confirm. If this time has been taken, you can choose another without losing your details.</p><div className="meetActions"><button className="ad__btn ad__btn--plain" disabled={busy} onClick={()=>setStep(managementToken?1:2)}>Back</button><button className="ad__btn" disabled={busy} onClick={()=>void confirm()}>{busy?"Checking…":managementToken?"Confirm new time":"Confirm meeting"}</button></div></>:null}
    {step===4&&result?<><h2><Check aria-hidden="true"/> {result.status==="pending"?"Meeting requested":"Meeting booked"}</h2><p>{dateLabel(result.start)} · {timeLabel(result.start)} · {zone}</p><p className="meetHint">{notice}</p><p>Keep your private meeting link to check details, reschedule or cancel.</p><div className="meetActions"><Link className="ad__btn" href={`/meet/manage/${token}`}>Manage this meeting</Link><Link className="ad__btn ad__btn--plain" href="/">Back to the studio</Link></div></>:null}
  </div></>;
}
