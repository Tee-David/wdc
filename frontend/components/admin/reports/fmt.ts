import { money } from "@/lib/money/currency";
import { nairaShort } from "@/lib/admin/types";

/** Full amount in the report's currency. */
export const full = (kobo: number, cur: string) => money(kobo, cur);

/** Tile-size amount: ₦1.2m in naira, $1.2K or similar in the others. Kobo in, text out. */
export function short(kobo: number, cur: string) {
  if (cur === "NGN") return nairaShort(kobo);
  const n = kobo / 100;
  const sym = new Intl.NumberFormat("en", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(0).replace(/[\d\s.,]/g, "");
  const abs = Math.abs(n);
  const body = abs >= 1_000_000 ? `${(abs / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}m` : abs >= 1_000 ? `${(abs / 1_000).toFixed(1).replace(/\.0$/, "")}k` : abs.toFixed(0);
  return `${n < 0 ? "-" : ""}${sym}${body}`;
}

export const percent = (x: number | null, digits = 0) => (x == null ? "None yet" : `${(x * 100).toFixed(digits)}%`);
export const days = (x: number | null) => (x == null ? "None yet" : `${x < 10 ? x.toFixed(1).replace(/\.0$/, "") : Math.round(x)} days`);
export const hours = (x: number | null) => (x == null ? "None yet" : x < 1 ? `${Math.max(1, Math.round(x * 60))} min` : x < 48 ? `${x.toFixed(1).replace(/\.0$/, "")} h` : `${Math.round(x / 24)} days`);
