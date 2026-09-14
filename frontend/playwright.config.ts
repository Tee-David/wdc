import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "@playwright/test";

/**
 * ONE WORKER, AND IT IS THE STORE'S FAULT RATHER THAN THE TESTS'.
 *
 * The admin's data lives in module-level arrays in lib/admin/store.ts, which
 * means every test in the run shares one mutable set of books. With two
 * workers, a spec that records a payment or edits a setting is changing the
 * figures another spec is in the middle of asserting on, and the failure lands
 * on whichever one happened to read second. That was measured, not guessed:
 * "/admin/projects offers actions on its rows" failed in a full parallel run
 * and passed on its own, twice.
 *
 * A flaky suite is worse than a slow one, because the first thing anybody
 * learns from it is to re-run it. `fullyParallel` stays on so files still
 * interleave logically, and the worker count is what comes off the day the
 * store is a database and each run can have its own rows.
 */

/**
 * THE ENVIRONMENT LIVES ONE DIRECTORY UP, and the test runner has to read it
 * too.
 *
 * next.config.ts already does this for the app -- the repository root holds
 * `.env` and the project is in `frontend/`, so Next never finds it on its own.
 * The specs need the same file for a different reason: auth-flow.spec.ts talks
 * to the database directly to seed and then delete its own throwaway account,
 * and without the connection string it would skip on a machine where the app
 * beside it is working perfectly.
 *
 * The same three rules apply, and for the same reasons: an already-set
 * variable wins so a real shell export is never overridden, a missing file is
 * not an error, and the BOM is stripped because this file has one and it would
 * otherwise become part of the first variable's name.
 */
function loadRepoRootEnv() {
  const file = join(process.cwd(), "..", ".env");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").replace(/^\ufeff/, "").split(/\r?\n/)) {
    const text = line.trim();
    if (!text || text.startsWith("#")) continue;
    const at = text.indexOf("=");
    if (at < 1) continue;
    const key = text.slice(0, at).trim();
    if (process.env[key] !== undefined) continue;
    process.env[key] = text.slice(at + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
  }
}
loadRepoRootEnv();

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  fullyParallel: true,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: process.env.WDC_E2E_BASE_URL || "http://localhost:3100",
    /* REAL CHROME WHERE THERE IS ONE, AND A NAMED BINARY WHERE THERE IS NOT.
       The suite is written against Chrome because that is what most of this
       audience browses with, and `channel` asks for the installed one rather
       than Playwright's bundled build. A container that has a Chromium but no
       Chrome cannot satisfy that, and the failure is a launch error on every
       test at once, which reads like the suite is broken. Pointing
       WDC_E2E_CHROME at a binary swaps to it; nothing set keeps the old
       behaviour exactly. */
    ...(process.env.WDC_E2E_CHROME
      ? { launchOptions: { executablePath: process.env.WDC_E2E_CHROME } }
      : { channel: "chrome" as const }),
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
