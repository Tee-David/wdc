import { after, NextRequest, NextResponse } from "next/server";
import { callerKey, rateLimit } from "@/lib/rate-limit";
import { refusedEmail } from "@/lib/email-domains";
import { adminRole } from "@/lib/admin/guard";
import { supportCookiePresent } from "@/lib/users/support";
import { getAdminRequest } from "@/lib/admin/session";
import { cal, CalError, webhookReady, type Slots, type MeetingType, type Schedule } from "@/lib/meetings/cal";
import { config, commandStatus, enqueue, execute, guestBooking, meetingList, nextMeeting, recover } from "@/lib/meetings/store";
import { futureStart, hash, sameOrigin, validZone, validSchedule } from "@/lib/meetings/policy";

export const maxDuration = 60;
const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers });
const clean = (value: unknown, length = 300) => typeof value === "string" ? value.trim().slice(0, length) : "";

export async function GET(request: NextRequest) {
  // This process-local limiter is abuse control, not a cross-instance quota.
  if (!rateLimit(callerKey(request, "meeting-read"), 100, 60000).ok) return json({ error: "Please wait before trying again." }, 429);
  const q = request.nextUrl.searchParams;
  try {
    const c = await config();
    if (q.get("view") === "config") return json({ enabled: c.enabled && !!c.event_type_id, duration: c.settings.lengthInMinutes || 30 });
    if (q.get("view") === "admin") {
      if (await adminRole()!=="owner") return json({ error: "Only the owner can view studio meetings until scoped staff delegation is configured." }, 403);
      const start = q.get("start") || new Date().toISOString();
      const end = q.get("end") || new Date(Date.now() + 31 * 86400000).toISOString();
      if (!Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end)) || Date.parse(end) - Date.parse(start) > 366 * 86400000 || Date.parse(end) <= Date.parse(start)) return json({ error: "Choose a valid date range." }, 422);
      after(()=>recover());
      const [meetings,next]=await Promise.all([meetingList(start,end),nextMeeting()]);
      return json({meetings,next,config:c});
    }
    if (q.get("view") === "setup") {
      if (await adminRole() !== "owner") return json({ error: "Only the owner can configure scheduling." }, 403);
      const [types,schedules,calendars,conferencing,registeredWebhook]=await Promise.all([
        cal<MeetingType[]>("/event-types"),cal<Schedule[]>("/schedules"),
        cal<{connectedCalendars:unknown[];destinationCalendar:unknown}>("/calendars"),
        cal<{appId:string;invalid?:boolean}[]>("/conferencing"),webhookReady()
      ]);
      return json({ config: c, types, schedules, calendarConnected:calendars.connectedCalendars.length>0&&!!calendars.destinationCalendar, googleMeetConnected:conferencing.some(app=>app.appId==="google-meet"&&!app.invalid), webhookConfigured: registeredWebhook, reminders: { available: false, reason: "Optional reminders remain off until recipient opt-out and workflow policy are verified. Cal.com manages calendar notices." } });
    }
    if (!c.enabled || !c.event_type_id) return json({ error: "Meeting booking is being configured. Please use the contact form." }, 503);
    const start = clean(q.get("start"), 10), end = clean(q.get("end"), 10), timeZone = clean(q.get("timeZone"), 100);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || !validZone(timeZone) || Date.parse(end) - Date.parse(start) > 32 * 86400000 || Date.parse(end) < Date.parse(start)) return json({ error: "Choose a valid month and time zone." }, 422);
    const slots = await cal<Slots>(`/slots?${new URLSearchParams({ eventTypeId: String(c.event_type_id), start, end, timeZone })}`);
    return json({ slots });
  } catch (error) { return json({ error: error instanceof CalError ? error.message : "Scheduling could not be loaded. Check setup or try again." }, 503); }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request.headers.get("origin"), request.nextUrl.origin)) return json({ error: "This request could not be verified." }, 403);
  if (Number(request.headers.get("content-length")) > 12000) return json({ error: "Request too large." }, 413);
  let body: Record<string, unknown>;
  try { const raw=await request.text();if(raw.length>12000)return json({error:"Request too large."},413);body=JSON.parse(raw);if(!body||typeof body!=="object"||Array.isArray(body))return json({error:"Invalid request."},400); } catch { return json({ error: "Invalid request." }, 400); }
  const action = clean(body.action, 30), token = clean(body.token, 64), id = clean(body.id, 36);
  if(await supportCookiePresent())return json({error:"Exit the read-only support view before managing meetings."},403);
  const role = await adminRole();
  const { session } = await getAdminRequest();
  const actor = role ? session!.user.id : "guest";
  try {
    if (action === "status") {
      if (!/^[\w-]{36}$/.test(id)) return json({ error: "Invalid request." }, 422);
      const status = await commandStatus(id, role ? actor : "", /^[a-f0-9]{64}$/.test(token) ? hash(token) : undefined);
      if(status?.state==="pending")after(()=>execute(id));
      if(status?.state==="uncertain")after(()=>recover());
      return status ? json(status) : json({ error: "Request not found." }, 404);
    }
    if (action === "manage") {
      const booking = await guestBooking(token);
      return booking ? json({ booking }) : json({ error: "This meeting link has expired or is unavailable. Contact the studio for help." }, 404);
    }
    if (!rateLimit(callerKey(request, `meeting-${action}`), action === "book" ? 5 : 20, 600000).ok) return json({ error: "Please wait before making another change." }, 429);
    if (!/^[a-f0-9-]{36}$/i.test(id)) return json({ error: "A request identifier is required." }, 422);
    let payload: Record<string, unknown>, uid: string | undefined;
    if(action==="sync"){
      if(role!=="owner")return json({error:"Only the owner can refresh the studio calendar."},403);
      payload={};
    } else if (action === "book") {
      const email = clean(body.email, 320).toLowerCase(), name = clean(body.name, 120), zone = clean(body.timeZone, 100);
      if (!name || !/^\S+@\S+\.\S+$/.test(email) || refusedEmail(email) || !validZone(zone) || !futureStart(body.start) || !/^[a-f0-9]{64}$/.test(token)) return json({ error: "Complete your name, a valid email address, time zone and available time." }, 422);
      const c = await config();
      if (!c.enabled || !c.event_type_id) return json({ error: "Booking is not available yet. Please use the contact form." }, 503);
      payload = { start: body.start, attendee: { name, email, timeZone: zone, language: "en" }, context: clean(body.context, 2000), tokenHash: hash(token) };
    } else if (["cancel", "reschedule", "confirm", "decline"].includes(action)) {
      const operationalOwner=role==="owner";
      const guest = operationalOwner ? null : await guestBooking(token);
      uid = operationalOwner ? clean(body.uid, 100) : guest?.uid;
      if (!uid || !operationalOwner && !guest || !operationalOwner && ["confirm", "decline"].includes(action)) return json({ error: "You do not have access to change this meeting." }, 403);
      if (action === "reschedule" && !futureStart(body.start)) return json({ error: "Choose a future available time." }, 422);
      payload = { reason: clean(body.reason, 500), ...(action === "reschedule" ? { start: body.start } : {}), ...(!operationalOwner ? { tokenHash: hash(token) } : {}) };
    } else if (action === "setup") {
      if (role !== "owner") return json({ error: "Only the owner can configure scheduling." }, 403);
      payload = {};
    } else if (action === "availability") {
      if(role!=="owner")return json({error:"Only the owner can configure availability."},403);
      const schedule=body.schedule as Schedule|undefined;
      if(!validSchedule(schedule))return json({error:"Check dates, time zones and ranges. Ranges must not overlap and must end after they start."},422);
      payload={schedule:{timeZone:schedule!.timeZone,availability:schedule!.availability.map(row=>({days:row.days,startTime:row.startTime,endTime:row.endTime})),overrides:schedule!.overrides.map(row=>({date:row.date,startTime:row.startTime,endTime:row.endTime}))}};
    } else if (action === "settings") {
      if (role !== "owner") return json({ error: "Only the owner can configure scheduling." }, 403);
      const duration = Number(body.duration), notice = Number(body.notice), buffer = Number(body.buffer);
      if (![15,30,45,60].includes(duration) || !Number.isInteger(notice) || notice < 60 || notice > 43200 || !Number.isInteger(buffer) || buffer < 0 || buffer > 120) return json({ error: "Check duration, notice and buffers." }, 422);
      if(body.enabled===true){
        const [ready,calendars,apps]=await Promise.all([webhookReady(),cal<{connectedCalendars:unknown[];destinationCalendar:unknown}>("/calendars"),cal<{appId:string;invalid?:boolean}[]>("/conferencing")]);
        if(!ready)return json({error:"Register and verify the signed production webhook before publishing booking."},422);
        if(!calendars.connectedCalendars.length||!calendars.destinationCalendar||!apps.some(app=>app.appId==="google-meet"&&!app.invalid))return json({error:"Connect a destination calendar and Google Meet before publishing."},422);
      }
      payload = { enabled: body.enabled === true, provider: { lengthInMinutes: duration, minimumBookingNotice: notice, beforeEventBuffer: buffer, afterEventBuffer: buffer, hidden: body.enabled !== true } };
    } else return json({ error: "Unknown action." }, 422);
    const command = await enqueue(id, action, actor, payload, uid);
    after(() => execute(id));
    return json({ id: command.id, state: command.state, result: command.result, error: command.error }, 202);
  } catch (error) { return json({ error: error instanceof CalError ? error.message : "The request could not be saved. Please check setup and retry." }, 503); }
}
