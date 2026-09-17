import { expect, test } from "@playwright/test";

/**
 * A missing id on any of the four dynamic admin routes.
 *
 * BEFORE `app/admin/not-found.tsx` EXISTED, this fell all the way through to
 * the root `app/not-found.tsx` -- the public marketing 404, with the site's
 * own header and the "lost" illustration -- which threw an admin who followed
 * a stale link out of the dashboard entirely. What is pinned here is that the
 * admin shell survives: the nav is still there, `#main`'s public chrome is
 * not.
 *
 * See the same door used by `admin-actions.spec.ts` for why this needs
 * `BONEYARD_CAPTURE_TOKEN` on the server under test.
 */

const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;

test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
test.use({ extraHTTPHeaders: { "x-boneyard-capture": TOKEN ?? "" } });

test.beforeEach(async ({ page, baseURL }) => {
  await page.context().addCookies([
    { name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" },
  ]);
});

const ROUTES = [
  "/admin/clients/not-a-real-id",
  "/admin/projects/not-a-real-id",
  "/admin/money/not-a-real-id",
  "/admin/forms/not-a-real-id",
];

for (const path of ROUTES) {
  test(`${path} stays inside the admin shell`, async ({ page }) => {
    await page.goto(path, { waitUntil: "domcontentloaded" });

    /* The admin's own nav, not the public site's header. */
    await expect(page.locator(".ad__nav")).toBeVisible();
    const empty = page.locator(".ad__empty");
    await expect(empty).toContainText("That isn't here");
    /* The public 404's own section (`components/not-found/lost-sketch.tsx`)
       must never render inside the admin. */
    await expect(page.locator("section.nf")).toHaveCount(0);

    /* Every way back to real work, from a page that by definition cannot
       know which of the four the reader wanted. */
    await expect(empty.getByRole("link", { name: "Clients", exact: true })).toBeVisible();
    await expect(empty.getByRole("link", { name: "Projects", exact: true })).toBeVisible();
  });
}

test("a date field's echo does not trigger a hydration mismatch", async ({ page }) => {
  /* Regression pin for the fault where the server and the client formatted
     `toLocaleDateString("en-GB", ...)` differently -- Node's ICU and
     Chrome's disagree on the comma after the weekday for this exact pattern
     -- and React discarded and rebuilt the whole dialog on every date field. */
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/admin/money", { waitUntil: "networkidle" });
  await page.waitForTimeout(300);

  const hydrationErrors = errors.filter((e) => /hydration/i.test(e));
  expect(hydrationErrors, hydrationErrors.join("\n")).toHaveLength(0);
});
