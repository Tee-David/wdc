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
