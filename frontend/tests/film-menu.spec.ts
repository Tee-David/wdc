import { expect, test, type Page } from "@playwright/test";

/**
 * THE DESKTOP MENU IS A FILM STRIP; THE PHONE'S IS STILL THE PANEL.
 *
 * The owner picked the film strip for desktop and asked for the phone menu to
 * be left exactly as it was, so the line between them is the thing worth
 * pinning: 768px and up gets the reel, below it gets the panel and never even
 * loads the reel's code. What else goes wrong without looking wrong in a quick
 * check: the arrow keys only working after a keyboard open, the page behind
 * scrolling under the reel, the reel staying open after a choice, and the
 * header's own button vanishing while it is open.
 */

const skipIntro = (page: Page) =>
  page.addInitScript(() => {
    try { localStorage.setItem("wdc-intro-seen-at", String(Date.now())); } catch { /* private mode */ }
  });

test.describe("on a desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("the button opens the reel, the arrows move it, a choice goes there, Escape closes", async ({ page }) => {
    await skipIntro(page);
    await page.goto("/", { waitUntil: "load" });
    const toggle = page.getByRole("button", { name: "Open menu" });
    await toggle.click();

    const reel = page.getByRole("dialog", { name: "Menu" });
    await expect(reel).toBeVisible();
    await expect(page.locator(".sm-panel")).toHaveAttribute("data-open", "false");
    /* It starts on the page you are on. */
    await expect(page.locator(".fm-frame.is-centre .fm-title")).toHaveText("Home");

    /* The arrows work after opening with the MOUSE, which is the case that
       once did nothing (the keys were only heard from inside the dialog). */
    await page.keyboard.press("ArrowRight");
    await expect(page.locator(".fm-frame.is-centre .fm-title")).toHaveText("Our Works");
    await page.keyboard.press("End");
    await expect(page.locator(".fm-frame.is-centre .fm-title")).toHaveText("Contact Us");
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowRight");

    /* Everything is a real link, so the pages stay crawlable. */
    await expect(page.locator(".fm-frame").first()).toHaveAttribute("href", "/");

    /* The header's own button and CTA stay on screen over the reel. */
    await expect(page.getByRole("button", { name: "Close menu" })).toBeVisible();
    await expect(page.locator("header").getByRole("link", { name: /Start a Project/ })).toBeVisible();

    await page.locator(".fm-frame.is-centre").click();
    await expect(page).toHaveURL(/\/work$/, { timeout: 8000 });
    await expect(page.getByRole("dialog", { name: "Menu" })).toHaveCount(0);

    /* And it closes on Escape. */
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.locator(".fm-frame.is-cur .fm-title")).toHaveText("Our Works");
    await page.keyboard.press("Escape");
    await expect(page.locator("#film-menu.is-open")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test("the wheel steps the reel and the page behind does not scroll", async ({ page }) => {
    await skipIntro(page);
    await page.goto("/", { waitUntil: "load" });
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.locator("#film-menu.is-open")).toBeVisible();
    await page.mouse.move(720, 400);
    await page.mouse.wheel(0, 300);
    await expect(page.locator(".fm-frame.is-centre .fm-title")).toHaveText("Our Works");
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });
});

test.describe("the line between the two menus", () => {
  test("767px gets the panel and never loads the reel", async ({ page }) => {
    await skipIntro(page);
    await page.setViewportSize({ width: 767, height: 900 });
    await page.goto("/", { waitUntil: "load" });
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.locator(".sm-panel")).toHaveAttribute("data-open", "true");
    await expect(page.locator("#film-menu")).toHaveCount(0);
  });

  test("768px gets the reel", async ({ page }) => {
    await skipIntro(page);
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/", { waitUntil: "load" });
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.locator("#film-menu.is-open")).toBeVisible();
    await expect(page.locator(".sm-panel")).toHaveAttribute("data-open", "false");
  });
});

test.describe("on a phone", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test("the menu is the panel, exactly as before", async ({ page }) => {
    await skipIntro(page);
    await page.goto("/", { waitUntil: "load" });
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.locator(".sm-panel")).toHaveAttribute("data-open", "true");
    await expect(page.locator("#film-menu")).toHaveCount(0);
    for (const name of ["Home", "Our Works", "Services", "Blog", "About Us", "Contact Us"]) {
      await expect(page.locator(".sm-panel").getByRole("link", { name: `Go to ${name}` })).toBeVisible();
    }
  });
});
