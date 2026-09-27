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
    /* AND ANSWERS 404. It answered 200 for months, because the admin's
       loading boundary sat above every detail page and streamed the shell
       before `notFound()` ran. See app/admin/(lists)/loading.tsx. */
    const response = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(404);

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

test("a real record and every list still answer 200", async ({ request }) => {
  for (const path of ["/admin", "/admin/clients", "/admin/clients/c1", "/admin/projects", "/admin/money",
                      "/admin/money/i1", "/admin/forms", "/admin/settings", "/admin/money/reconciliation"]) {
    expect((await request.get(path, { headers: { cookie: "wdc.session_token=placeholder" } })).status(), path).toBe(200);
  }
});

test("a missing entry, post or question answers 404, and a new post does not", async ({ request }) => {
  const nobody = "00000000-0000-4000-8000-000000000000";
  for (const path of [`/admin/forms/contact/entries/${nobody}`, `/admin/blog/${nobody}`, "/admin/clients/support/not-a-real-id", `/admin/forms/${nobody}`]) {
    expect((await request.get(path, { headers: { cookie: "wdc.session_token=placeholder" } })).status(), path).toBe(404);
  }
  expect((await request.get("/admin/blog/new", { headers: { cookie: "wdc.session_token=placeholder" } })).status()).toBe(200);
});

test("a missing portal record answers 404 too", async ({ request }) => {
  for (const path of ["/portal/projects/not-a-real-id", "/portal/support/not-a-real-id"]) {
    expect((await request.get(path, { headers: { cookie: "wdc.session_token=placeholder" } })).status(), path).toBe(404);
  }
});

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
