import "server-only";

import type { PoolClient } from "pg";
import { db } from "@/lib/db/pool";

/**
 * Run `work` in one transaction on one connection. CockroachDB answers a
 * contended transaction with 40001 ("restart transaction"); that is retried
 * a couple of times, because the work is written to be safe to run again.
 */
export async function transaction<T>(work: (c: PoolClient) => Promise<T>, attempts = 3): Promise<T> {
  for (let n = 1; ; n++) {
    const c = await db.connect();
    try {
      await c.query("BEGIN");
      const out = await work(c);
      await c.query("COMMIT");
      return out;
    } catch (e) {
      await c.query("ROLLBACK").catch(() => {});
      if ((e as { code?: string }).code === "40001" && n < attempts) continue;
      throw e;
    } finally {
      c.release();
    }
  }
}
