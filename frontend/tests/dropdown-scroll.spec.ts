import { expect, test } from "@playwright/test";

/**
 * A DROPDOWN'S OPTIONS SCROLL, with a wheel and with a finger.
 *
 * This has broken and been fixed more than once (Lenis taking the wheel, the
 * sheet swallowing a swipe), and each time it was found by a person. The
 * country list is the one to test: 245 rows, so it has plenty to scroll, and it
 * lives in the same picker every select in the site's forms uses.
 *
 * Two real defects in the picker are pinned as well: the panel re-measuring
 * itself on the list's OWN scroll events, and the hovered row being scrolled
 * into view while the wheel turned (the list stalled at its edges).
 */

const skipIntro = (page: import("@playwright/test").Page) =>
  page.addInitScript(() => {
    try { localStorage.setItem("wdc-intro-seen-at", String(Date.now())); } catch { /* private mode */ }
  });

test.describe("with a mouse", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("the wheel scrolls the list, not the page, and keeps scrolling at the edges", async ({ page }) => {
    await skipIntro(page);
    await page.goto("/contact", { waitUntil: "load" });
    await page.locator("button.ph__cc").first().click();
    const list = page.locator(".pk.is-open .pk__list").first();
    await expect(list).toBeVisible();
    const box = (await list.boundingBox())!;
    const y0 = await page.evaluate(() => window.scrollY);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

    let last = -1;
    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel(0, 240);
      await expect.poll(() => list.evaluate((el) => Math.round(el.scrollTop))).toBeGreaterThan(last);
      last = await list.evaluate((el) => Math.round(el.scrollTop));
    }
    expect(await page.evaluate(() => window.scrollY)).toBe(y0);
    await expect(page.locator(".pk.is-open")).toHaveCount(1);
  });
});

test.describe("with a finger", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test("a swipe scrolls the list inside the sheet, not the page behind it", async ({ page, context }) => {
    await skipIntro(page);
    await page.goto("/contact", { waitUntil: "load" });
    await page.locator("button.ph__cc").first().tap();
    const list = page.locator(".pk.is-open .pk__list").first();
    await expect(list).toBeVisible();
    const box = (await list.boundingBox())!;
    const y0 = await page.evaluate(() => window.scrollY);
    const cdp = await context.newCDPSession(page);
    const x = Math.round(box.x + box.width / 2);
    const y = Math.round(box.y + box.height * 0.75);

    let last = -1;
    for (let i = 0; i < 3; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
      for (let k = 1; k <= 12; k++) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y - 20 * k }] });
        await page.waitForTimeout(16);
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await expect.poll(() => list.evaluate((el) => Math.round(el.scrollTop))).toBeGreaterThan(last);
      last = await list.evaluate((el) => Math.round(el.scrollTop));
    }
    expect(await page.evaluate(() => window.scrollY)).toBe(y0);
  });
});
