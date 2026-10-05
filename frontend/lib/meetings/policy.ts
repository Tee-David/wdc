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
  try { return new URL(origin).origin === new URL(expected).origin; } catch { return false; }
}
export function futureStart(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) && Date.parse(value) > Date.now() && Date.parse(value) < Date.now() + 366 * 86400000;
}
export function safeJoinUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.href : null; } catch { return null; }
}
