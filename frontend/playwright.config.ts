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
export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  fullyParallel: true,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: process.env.WDC_E2E_BASE_URL || "http://localhost:3100",
    channel: "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
