import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export function hash(value: string) { return createHash("sha256").update(value).digest("hex"); }
export function validZone(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 100) return false;
  try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; }
}
export function validSignature(body: string, signature: string | null, secret: string | undefined) {
  if (!secret || !signature || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const wanted = createHmac("sha256", secret).update(body).digest();
  return timingSafeEqual(wanted, Buffer.from(signature, "hex"));
}
export function sameOrigin(origin: string | null, expected: string) {
  if (!origin) return false;
  try {
    const candidate=new URL(origin),target=new URL(expected);
    if(candidate.origin===target.origin)return true;
    const loopback=new Set(["localhost","127.0.0.1","[::1]"]);
    return loopback.has(candidate.hostname)&&loopback.has(target.hostname)&&candidate.protocol===target.protocol&&candidate.port===target.port;
  } catch { return false; }
}
export function futureStart(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) && Date.parse(value) > Date.now() && Date.parse(value) < Date.now() + 366 * 86400000;
}
export function safeJoinUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.href : null; } catch { return null; }
}

export function validSchedule(value: unknown): boolean {
  if(!value || typeof value!=="object")return false;
  const schedule=value as {timeZone?:unknown;availability?:unknown;overrides?:unknown};
  if(!validZone(schedule.timeZone)||!Array.isArray(schedule.availability)||schedule.availability.length>28||!Array.isArray(schedule.overrides)||schedule.overrides.length>366)return false;
  const days=new Set(["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]);
  const times=new Map<string,{start:string;end:string}[]>();
  const validTime=(time:unknown):time is string=>typeof time==="string"&&/^([01]\d|2[0-3]):[0-5]\d$/.test(time);
  for(const [rows,weekly] of [[schedule.availability,true],[schedule.overrides,false]] as const){
    for(const item of rows){
      if(!item||typeof item!=="object")return false;
      const row=item as {days?:unknown;date?:unknown;startTime?:unknown;endTime?:unknown};
      if(!validTime(row.startTime)||!validTime(row.endTime)||row.startTime>=row.endTime)return false;
      let keys:string[];
      if(weekly){if(!Array.isArray(row.days)||!row.days.length||row.days.some(day=>!days.has(day)))return false;keys=row.days;}
      else {if(typeof row.date!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||!Number.isFinite(Date.parse(row.date))||new Date(row.date).toISOString().slice(0,10)!==row.date)return false;keys=[row.date];}
      for(const key of keys){const ranges=times.get(key)||[];if(ranges.some(range=>row.startTime!<range.end&&row.endTime!>range.start))return false;ranges.push({start:row.startTime,end:row.endTime});times.set(key,ranges)}
    }
  }
  return true;
}
