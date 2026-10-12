import { naira, nairaShort } from "@/lib/admin/types";

/** For a tile: the short form only when it loses nothing worth reading. Under ₦100,000 the whole figure shows ("₦21,850", not "₦22k"). */
export function nairaTile(kobo: number) {
  return Math.abs(kobo) < 10_000_000 ? naira(kobo) : nairaShort(kobo);
}
