"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookingForm } from "./booking";
import { meetingCommand, meetingRequest } from "./client";
import { safeJoinUrl } from "./links";
import { ask, ConfirmHost } from "@/components/admin/confirm";
import type { Booking } from "@/lib/meetings/cal";
import "./meetings.css";

export function ManageMeeting({token}:{token:string}) {
  const [booking,setBooking]=useState<Booking|null>(null),[error,setError]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false),[reschedule,setReschedule]=useState(false);
  useEffect(()=>{let live=true;meetingRequest({action:"manage",token}).then(value=>{if(live)setBooking(value.booking)}).catch(e=>{if(live)setError(e.message)});return()=>{live=false}},[token]);
  async function cancel(){if(!await ask("Cancel this meeting? The time will be released and Cal.com will manage the cancellation notice.",{verb:"Cancel meeting"}))return;setBusy(true);setError("");try{const value=await meetingCommand({action:"cancel",token,reason:"Cancelled by attendee"},setMessage);setBooking(value.booking);setMessage(value.notices)}catch(e){setError(e instanceof Error?e.message:"The cancellation could not be completed.")}finally{setBusy(false)}}
  if(reschedule&&booking)return <><BookingForm managementToken={token} booking={booking}/><ConfirmHost/></>;
  return <div className="meetWrap meetPublic meetManage"><ConfirmHost/><h1>Your meeting</h1>{error?<p className="meetError" role="alert">{error}</p>:null}{message?<p role="status" className="meetHint">{message}</p>:null}{booking?<><h2>{booking.title}</h2><p>{new Intl.DateTimeFormat("en",{dateStyle:"full",timeStyle:"short",timeZone:booking.attendees?.[0]?.timeZone||"UTC"}).format(new Date(booking.start))}</p><p>Status: <strong>{booking.status}</strong></p>{safeJoinUrl(booking.meetingUrl)?<p><a className="ad__btn" href={safeJoinUrl(booking.meetingUrl)!} target="_blank" rel="noopener noreferrer">Join meeting</a></p>:<p className="meetHint">Video details appear here when the provider has confirmed them.</p>}{!['cancelled','rejected'].includes(booking.status.toLowerCase())?<div className="meetActions"><button className="ad__btn" disabled={busy} onClick={()=>setReschedule(true)}>Choose a new time</button><button className="ad__btn ad__btn--plain" disabled={busy} onClick={()=>void cancel()}>Cancel meeting</button></div>:null}<p className="meetHint">Calendar confirmations and important changes are managed by Cal.com. Optional timed reminders are off until the consent policy is configured.</p></>:!error?<p role="status">Loading your meeting…</p>:null}<p><Link href="/contact">Contact the studio for help</Link></p></div>;
}
