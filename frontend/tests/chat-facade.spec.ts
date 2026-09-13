import { expect, test, type Page } from "@playwright/test";

/**
 * The project chat, and the two properties it has to keep.
 *
 * ONE: NOTHING THIRD-PARTY RUNS UNTIL SOMEBODY ASKS FOR IT. This is the whole
 * reason the chat is a facade rather than a vendor embed. If a script tag for
 * Jotform ever appears on an idle page again, the page is paying for a chat
 * nobody opened.
 *
 * TWO: IT NEVER SAYS "STARTING" FOREVER. The version this replaced waited for
 * a vendor launcher to appear in our DOM and clicked it, with no timeout and
 * no failure path, so a blocked or slow load left the button claiming to be
 * busy for the rest of the session. Chat widgets are among the most commonly
 * blocked things on the web, so the blocked path is not an edge case -- it is
 * a normal Tuesday for anyone running an ad blocker.
 */

test.describe.configure({ timeout: 120_000 });

const AGENT = /jotform\.com\/agent\//;

/* A stand-in for the agent, so "it loaded" can be tested without depending on
   a third party being up. */
const STUB = `<!doctype html><meta charset="utf-8"><title>Agent</title><p>Hi!</p>`;

const arrive = async (page: Page) => {
  await page.route(/userway/i, (route) => route.abort());
  await page.addInitScript(() => {
    try {
      localStorage.setItem("wdc-intro-seen-at", String(Date.now()));
      sessionStorage.setItem("wdc:preloaded", "1");
    } catch {}
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
};

test("an idle page loads nothing from the chat vendor", async ({ page }) => {
  const hits: string[] = [];
  page.on("request", (r) => {
    if (/jotfor|jotform/i.test(r.url())) hits.push(`${r.resourceType()} ${r.url()}`);
  });

  await arrive(page);
  /* Long enough to cover anything deferred to idle. The preconnect is a link
     element, not a request, so it does not count here. */
  await page.waitForTimeout(4000);

  expect(hits, `idle page requested ${hits.join(", ")}`).toEqual([]);
  expect(
    await page.evaluate(() => [...document.scripts].filter((s) => /jotf/i.test(s.src)).length),
  ).toBe(0);
  await expect(page.locator(".jf-facade")).toBeVisible();
  /* The panel is not even in the document until the button is reached for. */
  await expect(page.locator(".jf-panel")).toHaveCount(0);
});

test("clicking opens a panel holding the agent, and escape closes it", async ({ page }) => {
  await page.route(AGENT, (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: STUB }),
  );
  await arrive(page);

  await page.click(".jf-facade");
  const panel = page.locator(".jf-panel");
  await expect(panel).toHaveClass(/is-open/);

  /* The agent is framed, not scripted into our page. */
  await expect(page.locator(".jf-panel__frame")).toHaveAttribute("src", AGENT);
  expect(
    await page.evaluate(() => [...document.scripts].filter((s) => /jotf/i.test(s.src)).length),
  ).toBe(0);

  /* Once the frame is there the panel stops talking about loading. */
  await expect(page.locator(".jf-panel__state")).toHaveCount(0);

  /* Inside the viewport at whatever size it opened at, or the conversation is
     half off the screen. */
  const box = await panel.boundingBox();
  const view = page.viewportSize()!;
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(view.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(view.height + 1);

  await page.keyboard.press("Escape");
  await expect(panel).not.toHaveClass(/is-open/);
  /* Focus comes back to the thing that opened it. */
  expect(await page.evaluate(() => document.activeElement?.className)).toContain("jf-facade");
});

test("a blocked agent gives up and offers the contact form", async ({ page }) => {
  /* What an ad blocker does: abort the request rather than answer it. */
  await page.route(AGENT, (route) => route.abort());
  await arrive(page);

  await page.click(".jf-facade");

  const fallback = page.locator(".jf-panel__alt");
  await expect(fallback).toBeVisible({ timeout: 30_000 });
  await expect(fallback).toHaveAttribute("href", "/contact");
  await expect(page.locator(".jf-panel__mail")).toHaveAttribute("href", /^mailto:/);
  /* And it does not quietly revert to claiming it is still starting. */
  await expect(page.locator(".jf-panel__state")).not.toContainText("Starting");
});
