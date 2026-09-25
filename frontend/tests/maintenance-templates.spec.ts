import { expect, test, type Page } from "@playwright/test";

/**
 * THE MAINTENANCE TEMPLATES, EACH ONE DRAWN.
 *
 * The page visitors get in maintenance is one of eleven scenes chosen in
 * Settings, Site. Each is drawn here through the admin preview route at the
 * sizes that have bitten this site before (a 320px phone, a landscape phone,
 * a desktop), and must: throw nothing, keep the lockup's heading, the
 * countdown and the notify-me capsule on screen and uncovered, and never be
 * wider than the screen. The preview route itself must stay closed to
 * anybody without the settings permission.
 */

const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
const IDS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11"];
const SIZES = [
  { name: "phone", width: 320, height: 640 },
  { name: "landscape phone", width: 844, height: 390 },
  { name: "desktop", width: 1280, height: 800 },
];

test.describe.configure({ timeout: 120_000 });
test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN.");

test("the preview is refused to visitors and to staff", async ({ playwright, baseURL }) => {
  const anon = await playwright.request.newContext({ baseURL });
  expect((await anon.get("/api/maintenance/preview?template=01")).status()).toBe(404);
  await anon.dispose();
  const staff = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { "x-boneyard-capture": TOKEN!, "x-boneyard-capture-role": "staff" } });
  expect((await staff.get("/api/maintenance/preview?template=01")).status()).toBe(404);
  await staff.dispose();
});

test("the notify-me box refuses a request from another site", async ({ playwright, baseURL }) => {
  const r = await playwright.request.newContext({ baseURL });
  const res = await r.post("/api/maintenance/notify", { data: { email: "someone@example.com" }, headers: { origin: "https://elsewhere.example" } });
  expect(res.status()).toBe(403);
  const none = await r.post("/api/maintenance/notify", { data: { email: "someone@example.com" } });
  expect(none.status()).toBe(403);
  await r.dispose();
});

async function check(page: Page) {
  return page.evaluate(() => {
    const problems: string[] = [];
    const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    if (document.documentElement.scrollWidth > vw) problems.push(`page is ${document.documentElement.scrollWidth}px wide in ${vw}px`);
    for (const sel of ["#wdc-h1", "#wdc-email", "#wdc-form button[type=submit]"]) {
      const el = document.querySelector<HTMLElement>(sel);
      if (!el) { problems.push(`${sel} is missing`); continue; }
      const r = el.getBoundingClientRect();
      if (r.left < 0 || r.right > vw + 1 || r.top < 0 || r.bottom > vh + 1) problems.push(`${sel} is off screen`);
      /* nothing from the scene may sit on top of the lockup */
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (hit && !hit.closest("#wdc-lock")) problems.push(`${sel} is covered by ${hit.className || hit.tagName}`);
    }
    return problems;
  });
}

for (const size of SIZES) {
  test.describe(size.name, () => {
    test.use({ viewport: { width: size.width, height: size.height }, extraHTTPHeaders: { "x-boneyard-capture": TOKEN ?? "" } });
    for (const id of IDS) {
      test(`template ${id} draws cleanly`, async ({ page }) => {
        const errors: string[] = [];
        page.on("pageerror", (e) => errors.push(e.message));
        const res = await page.goto(`/api/maintenance/preview?template=${id}`, { waitUntil: "load" });
        expect(res?.status()).toBe(200);
        await expect(page.locator("body")).toHaveAttribute("data-template", id);
        await page.waitForTimeout(2500);
        expect(errors).toEqual([]);
        expect(await check(page)).toEqual([]);
      });
    }
  });
}

test.describe("reduced motion", () => {
  test.use({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce", extraHTTPHeaders: { "x-boneyard-capture": TOKEN ?? "" } });
  for (const id of IDS) {
    test(`template ${id} has a still frame`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(`/api/maintenance/preview?template=${id}`, { waitUntil: "load" });
      await page.waitForTimeout(800);
      expect(errors).toEqual([]);
      expect(await check(page)).toEqual([]);
    });
  }
});
