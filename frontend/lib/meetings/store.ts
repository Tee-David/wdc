import "server-only";
import { db } from "@/lib/db/pool";
import { cal, CalError, type Booking, type MeetingType, type Schedule } from "./cal";
import { hash } from "./policy";

export type Config = { event_type_id: number | null; schedule_id: number | null; host_id: number | null; enabled: boolean; settings: Record<string, unknown> };

/** The config row could not be read. `meetingCode` tells the page which fix to offer. */
export class MeetingConfigError extends Error {
  constructor(public readonly meetingCode: "migration_missing" | "database_unavailable", message: string) {
    super(message);
  }
}

export async function config(): Promise<Config> {
  let rows: Config[];
  try {
    ({ rows } = await db.query("SELECT event_type_id, schedule_id, host_id, enabled, settings FROM wdc_meeting_config WHERE id='studio'"));
  } catch (error) {
    // 42P01 is Postgres' "undefined_table": the migration has not been applied.
    const missing = (error as { code?: string }).code === "42P01" || /wdc_meeting_config.*does not exist/i.test(String((error as Error)?.message));
    throw missing
      ? new MeetingConfigError("migration_missing", "Apply the Meetings migration from Settings, System before setup.")
      : new MeetingConfigError("database_unavailable", "The database could not be reached.");
  }
  if (!rows[0]) throw new MeetingConfigError("migration_missing", "Apply the Meetings migration from Settings, System before setup.");
  return rows[0];
}
export async function project(booking: Booking, tokenHash?: string) {
  if (!booking.uid || !booking.start || !booking.status) throw new Error("Invalid provider booking.");
  await db.query(`INSERT INTO wdc_meetings (uid,booking,start_at,status,management_hash,management_expires_at)
    VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (uid) DO UPDATE SET
    revision=wdc_meetings.revision + CASE WHEN wdc_meetings.booking IS DISTINCT FROM excluded.booking THEN 1 ELSE 0 END,
    booking=excluded.booking,start_at=excluded.start_at,status=excluded.status,
    management_hash=COALESCE(excluded.management_hash,wdc_meetings.management_hash),
    management_expires_at=COALESCE(excluded.management_expires_at,wdc_meetings.management_expires_at),updated_at=now()`,
    [booking.uid, JSON.stringify(booking), booking.start, booking.status, tokenHash || null, tokenHash ? new Date(Date.parse(booking.start) + 30 * 86400000) : null]);
}
export async function guestBooking(token: string): Promise<Booking | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const { rows } = await db.query("SELECT booking FROM wdc_meetings WHERE management_hash=$1 AND management_expires_at>now()", [hash(token)]);
  return rows[0]?.booking || null;
}
export async function meetingList(start: string, end: string): Promise<Booking[]> {
  const { rows } = await db.query("SELECT booking FROM wdc_meetings WHERE start_at >= $1 AND start_at < $2 ORDER BY start_at LIMIT 500", [start, end]);
  return rows.map(row => row.booking);
}
export async function nextMeeting():Promise<Booking|null>{
  const {rows}=await db.query("SELECT booking FROM wdc_meetings WHERE start_at>now() AND lower(status) IN ('accepted','confirmed') ORDER BY start_at LIMIT 1");
  return rows[0]?.booking||null;
}
export async function refresh(uid: string) {
  const booking = await cal<Booking>(`/bookings/${encodeURIComponent(uid)}`);
  await project(booking);
  return booking;
}
type Command = { id: string; kind: string; payload: Record<string, unknown>; actor: string; booking_uid?: string; state: string; result?: unknown; error?: string };
export async function enqueue(id: string, kind: string, actor: string, payload: Record<string, unknown>, uid?: string) {
  const fingerprint = hash(JSON.stringify({ kind, actor, payload, uid }));
  const { rows } = await db.query(`INSERT INTO wdc_meeting_commands (id,fingerprint,kind,actor,payload,booking_uid)
    VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO UPDATE SET id=excluded.id RETURNING *`, [id, fingerprint, kind, actor, JSON.stringify(payload), uid || null]);
  if (rows[0].fingerprint !== fingerprint) throw new Error("This request was already used for a different change.");
  return rows[0] as Command;
}
export async function commandStatus(id: string, actor: string, tokenHash?: string) {
  const { rows } = await db.query("SELECT state,result,error FROM wdc_meeting_commands WHERE id=$1 AND (actor=$2 OR payload->>'tokenHash'=$3)", [id, actor, tokenHash || ""]);
  return rows[0] || null;
}
export async function event(uid: string | null, kind: string, actor: string, details: unknown = {}) {
  await db.query("INSERT INTO wdc_meeting_events (booking_uid,kind,actor,details) VALUES ($1,$2,$3,$4)", [uid, kind, actor, JSON.stringify(details)]);
}
/** The body Cal.com expects for each booking change. */
function providerBody(kind: string, p: Record<string, unknown>) {
  if (kind === "reschedule") return { start: p.start, reschedulingReason: p.reason };
  if (kind === "cancel") return { cancellationReason: p.reason };
  if (kind === "decline") return { reason: p.reason };
  return {};
}

/** Order-independent form of a schedule, for comparing what we sent with what Cal.com holds. */
function normalizedSchedule(schedule: Schedule) {
  return JSON.stringify({
    zone: schedule.timeZone,
    weekly: schedule.availability.flatMap(row => row.days.map(day => `${day}:${row.startTime}-${row.endTime}`)).sort(),
    exceptions: schedule.overrides.map(row => `${row.date}:${row.startTime}-${row.endTime}`).sort(),
  });
}

/**
 * Cal.com gave a rescheduled booking a new UID. The guest's private management
 * link must follow it, and must never end up on both rows or on neither, so
 * the old row is cleared and the new one written in ONE transaction.
 */
async function moveManagement(oldUid: string, booking: Booking) {
  const previous = await db.query("SELECT management_hash,management_expires_at FROM wdc_meetings WHERE uid=$1", [oldUid]);
  const kept = previous.rows[0];
  const connection = await db.connect();
  try {
    await connection.query("BEGIN");
    await connection.query("UPDATE wdc_meetings SET management_hash=NULL,management_expires_at=NULL WHERE uid=$1", [oldUid]);
    await connection.query(
      `INSERT INTO wdc_meetings (uid,booking,start_at,status,management_hash,management_expires_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT(uid) DO UPDATE SET
         booking=excluded.booking,start_at=excluded.start_at,status=excluded.status,
         management_hash=excluded.management_hash,management_expires_at=excluded.management_expires_at,updated_at=now()`,
      [booking.uid, JSON.stringify(booking), booking.start, booking.status, kept?.management_hash || null, kept?.management_expires_at || null],
    );
    await connection.query("COMMIT");
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  } finally {
    connection.release();
  }
}

const MEETING_SLUG = "wdc-project-conversation";

/**
 * Create the private meeting type, or reuse the one that is already there,
 * and say which. Only the Cal.com account the owner expects may be linked:
 * `hostEmails` is captured from the signed-in owner (and the studio inbox
 * setting) when the request is enqueued, because this can run later from a
 * recovery pass that has no session. An empty list refuses (fails closed).
 */
async function runSetup(p: Record<string, unknown>) {
  const [me, types, schedules] = await Promise.all([cal<{ id: number; email: string }>("/me"), cal<MeetingType[]>("/event-types"), cal<Schedule[]>("/schedules")]);
  const allowed = Array.isArray(p.hostEmails) ? p.hostEmails.filter((e): e is string => typeof e === "string").map(e => e.toLowerCase()) : [];
  if (!allowed.includes(me.email.toLowerCase())) {
    throw new Error(`The connected Cal.com account is ${me.email}, which is not one of the studio's addresses (${allowed.join(", ") || "none known"}). Use that account's API key, or set CAL_HOST_EMAIL.`);
  }
  let type = types.find(t => t.slug === MEETING_SLUG);
  const created = !type;
  if (!type) {
    type = await cal<MeetingType>("/event-types", "POST", {
      title: "Project conversation", slug: MEETING_SLUG, lengthInMinutes: 30,
      description: "A conversation about your project with We Dig Creativity.", hidden: true,
      scheduleId: schedules[0]?.id, locations: [{ type: "integration", integration: "google-meet" }],
      minimumBookingNotice: 1440, beforeEventBuffer: 15, afterEventBuffer: 15,
      bookingWindow: { value: 30, rolling: true, disabled: false },
    });
  }
  const readBack = await cal<MeetingType>(`/event-types/${type.id}`);
  const scheduleId = readBack.scheduleId ?? schedules[0]?.id ?? null;
  await db.query("UPDATE wdc_meeting_config SET host_id=$1,event_type_id=$2,schedule_id=$3,updated_at=now() WHERE id='studio'", [me.id, type.id, scheduleId]);
  const next = scheduleId
    ? "Review availability and calendar connections before publishing."
    : "No working-hours schedule was found in Cal.com. Create one there, then run setup again to link it.";
  return {
    eventTypeId: type.id, created, scheduleLinked: scheduleId !== null,
    message: created
      ? `Meeting type created privately. ${next}`
      : `Your existing WDC meeting type was found and linked; nothing new was created. ${next}`,
  };
}

/** Atomic claim prevents simultaneous runners. Interrupted POSTs are never blindly repeated. */
export async function execute(id: string) {
  const { rows } = await db.query("UPDATE wdc_meeting_commands SET state='executing',updated_at=now() WHERE id=$1 AND state='pending' RETURNING *", [id]);
  if (!rows[0]) return;
  const command = rows[0] as Command;
  const p = command.payload;
  let providerAccepted = false;
  try {
    let result: unknown;
    if(command.kind==="sync"){
      const bookings=await cal<Booking[]>("/bookings?take=100");
      for(const booking of bookings)await project(booking);
      result={message:`Calendar refreshed from ${bookings.length} provider bookings.`};
    } else if (command.kind === "book") {
      const c = await config();
      if (!c.enabled || !c.event_type_id) throw new Error("Meeting booking is not available yet. Please use the contact form.");
      const booking = await cal<Booking>("/bookings", "POST", { eventTypeId: Number(c.event_type_id), start: p.start, attendee: p.attendee, metadata: { wdcCommand: id, projectContext: String(p.context || "") } });
      providerAccepted = true;
      await project(booking, String(p.tokenHash));
      result = { uid: booking.uid, booking, notices: "Cal.com manages the calendar confirmation. Delivery is not yet verified." };
    } else if (["cancel", "reschedule", "confirm", "decline"].includes(command.kind) && command.booking_uid) {
      const booking = await cal<Booking>(
        `/bookings/${encodeURIComponent(command.booking_uid)}/${command.kind}`,
        "POST",
        providerBody(command.kind, p),
      );
      providerAccepted = true;
      if (booking.uid !== command.booking_uid) {
        // Cal.com issued a new UID for the rescheduled booking: private management moves with it.
        await moveManagement(command.booking_uid, booking);
      } else await project(booking);
      if (booking.uid !== command.booking_uid) await refresh(command.booking_uid);
      result = { uid: booking.uid, booking, notices: "The meeting was updated. Cal.com manages calendar change notices; delivery is not yet verified." };
    } else if (command.kind === "setup") {
      result = await runSetup(p);
      providerAccepted = true;
    } else if (command.kind === "settings") {
      const c = await config();
      if (!c.event_type_id) throw new Error("Create the meeting type first.");
      await cal(`/event-types/${c.event_type_id}`, "PATCH", p.provider);
      providerAccepted = true;
      const readBack = await cal<MeetingType>(`/event-types/${c.event_type_id}`);
      const mismatch = Object.entries(p.provider as Record<string, unknown>).some(([key, value]) => readBack[key as keyof MeetingType] !== value);
      if (mismatch) throw new Error("Provider settings did not match. Check Cal.com before saving again.");
      await db.query("UPDATE wdc_meeting_config SET enabled=$1,settings=$2,updated_at=now() WHERE id='studio'", [p.enabled === true, JSON.stringify(p.provider)]);
      result = { message: "Scheduling settings updated and checked with Cal.com." };
    } else if(command.kind === "availability") {
      const c=await config();
      if(!c.schedule_id)throw new Error("Create the meeting type and select a schedule first.");
      await cal(`/schedules/${c.schedule_id}`,"PATCH",p.schedule);
      providerAccepted=true;
      const readBack=await cal<Schedule>(`/schedules/${c.schedule_id}`);
      const wanted=p.schedule as Schedule;
      if (normalizedSchedule(readBack) !== normalizedSchedule(wanted)) throw new Error("Provider availability did not match. Check the schedule in Cal.com before saving again.");
      result={message:"Availability updated and checked with Cal.com."};
    } else throw new Error("Unknown meeting action.");
    await event(command.booking_uid || null, command.kind, command.actor, { commandId: id });
    await db.query("UPDATE wdc_meeting_commands SET state='completed',result=$2,error=NULL,updated_at=now() WHERE id=$1", [id, JSON.stringify(result)]);
  } catch (error) {
    const uncertain = providerAccepted || error instanceof CalError && error.uncertain;
    const safe = error instanceof CalError || error instanceof Error && !/database|sql|relation|column|certificate/i.test(error.message);
    const message = safe ? (error as Error).message.slice(0, 200) : "The change could not be stored. Check the integration status.";
    await db.query("UPDATE wdc_meeting_commands SET state=$2,error=$3,updated_at=now() WHERE id=$1", [id, uncertain ? "uncertain" : "failed", message]);
  }
}
export async function recover() {
  await db.query("UPDATE wdc_meeting_commands SET state='uncertain',error='The worker stopped. Check Cal.com before repeating this change.' WHERE state='executing' AND updated_at < now()-INTERVAL '5 minutes'");
  const { rows } = await db.query("SELECT id FROM wdc_meeting_commands WHERE state='pending' ORDER BY created_at LIMIT 10");
  for (const row of rows) await execute(row.id);
  const uncertain=await db.query("SELECT * FROM wdc_meeting_commands WHERE state='uncertain' AND kind='book' ORDER BY created_at DESC LIMIT 10");
  if(uncertain.rows.length){
    try {
      // ponytail: inspect the latest 100 bookings; older ambiguous changes require provider review, never a repeated POST.
      const bookings=await cal<Booking[]>("/bookings?take=100");
      for(const command of uncertain.rows){
        const matches=bookings.filter(booking=>booking.metadata?.wdcCommand===command.id);
        if(matches.length!==1)continue;
        const booking = matches[0];
        await project(booking, String(command.payload.tokenHash));
        const recovered = { uid: booking.uid, booking, notices: "The existing booking was recovered from Cal.com. Calendar notice delivery is not yet verified." };
        await db.query("UPDATE wdc_meeting_commands SET state='completed',result=$2,error=NULL,updated_at=now() WHERE id=$1 AND state='uncertain'", [command.id, JSON.stringify(recovered)]);
      }
    }catch{/* Preserve uncertain intent; an unavailable read never authorizes another booking. */}
  }
  const hooks = await db.query("SELECT digest,booking_uid FROM wdc_meeting_webhooks WHERE state='pending' ORDER BY received_at LIMIT 20");
  for (const row of hooks.rows) {
    try {
      await refresh(row.booking_uid);
      await db.query("UPDATE wdc_meeting_webhooks SET state='processed',processed_at=now() WHERE digest=$1", [row.digest]);
    } catch {
      /* Durable row remains available for the next recovery. */
    }
  }
}
