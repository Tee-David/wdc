import { expect, test } from "@playwright/test";
import { MOTION_PIECES } from "../lib/motion-work";

/**
 * Motion on the Works pages. Muted loops must stay off the critical path,
 * carry a real pause control, and never start for a visitor who asked for
 * reduced motion.
 */
test("every motion file and poster exists and is small", async ({ request }) => {
  for (const p of MOTION_PIECES) {
    const video = await request.get(p.src);
    expect(video.ok(), p.src).toBeTruthy();
    expect((await video.body()).length, `${p.src} stays under 600 KB`).toBeLessThan(600 * 1024);
    expect((await request.get(p.poster)).ok(), p.poster).toBeTruthy();
  }
});

for (const width of [320, 390, 768, 1280]) {
  for (const theme of ["light", "dark"]) {
    test(`/work/branding motion section at ${width}px in ${theme}: no overflow, 44px controls, lazy`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((t) => { try { localStorage.setItem("theme", t); } catch { /* private */ } }, theme);
      await page.goto("/work/branding", { waitUntil: "domcontentloaded" });
      const cards = page.locator(".wk-motion__card");
      await expect(cards).toHaveCount(MOTION_PIECES.length);
      /* Nothing is fetched before it is near the screen. */
      const preloads = await page.locator(".wk-motion video").evaluateAll((vs) => vs.map((v) => (v as HTMLVideoElement).getAttribute("preload")));
      expect(preloads.filter((x) => x === "none").length).toBeGreaterThanOrEqual(MOTION_PIECES.length - 2);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
      for (const b of await page.locator(".wk-motion__btn").all()) {
        const box = await b.boundingBox();
        expect(box!.width).toBeGreaterThanOrEqual(44);
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
    });
  }
}

test("a pause button stops a playing loop and a second press starts it again", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/work/branding", { waitUntil: "domcontentloaded" });
  const card = page.locator(".wk-motion__card").first();
  await card.scrollIntoViewIfNeeded();
  const video = card.locator("video");
  const btn = card.locator(".wk-motion__btn");
  /* Open-source Chromium ships without H.264, so it cannot play these files at
     all. Real Chrome, Edge and Safari can, and that is what visitors use. */
  const canPlay = await video.evaluate((v) => (v as HTMLVideoElement).canPlayType('video/mp4; codecs="avc1.42E01E"') !== "");
  test.skip(!canPlay, "this browser build has no H.264 decoder");
  await expect.poll(() => video.evaluate((v) => !(v as HTMLVideoElement).paused), { timeout: 15000 }).toBeTruthy();
  await btn.click();
  await expect.poll(() => video.evaluate((v) => (v as HTMLVideoElement).paused)).toBeTruthy();
  await btn.click();
  await expect.poll(() => video.evaluate((v) => !(v as HTMLVideoElement).paused)).toBeTruthy();
});

test("reduced motion: loops do not start by themselves", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto("/work/branding", { waitUntil: "domcontentloaded" });
  const card = page.locator(".wk-motion__card").first();
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  expect(await card.locator("video").evaluate((v) => (v as HTMLVideoElement).paused)).toBe(true);
  await context.close();
});

test("case studies that carry motion show it, and the page rail links to it", async ({ page }) => {
  for (const [category, slug] of [["apps", "realtors-practice"], ["software", "litch-consulting"]]) {
    await page.goto(`/work/${category}/${slug}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#in-motion video")).not.toHaveCount(0);
    await expect(page.locator('a[href="#in-motion"]').first()).toBeVisible();
  }
});
