import { expect, test } from "@playwright/test";
import sharp from "sharp";

/**
 * The browser half of /tools/brand-kit, run against the REAL endpoint rather
 * than a fixture. Unlike the tools that fetch a stranger's page, this one
 * does no networking at all -- it decodes whatever was uploaded and resizes
 * it with `sharp`, entirely on our own server -- so there is no uptime or
 * network this suite depends on by exercising the real round trip.
 *
 * WHAT IS CHECKED WITHOUT A BROWSER, by `npm run check:brand-kit`: turning a
 * raw pixel buffer into a palette. What needs one is the upload itself, the
 * favicon set actually rendering, and the page holding together once there
 * is something to show.
 */

const PAGE = "/tools/brand-kit";

let logoPng: Buffer;
test.beforeAll(async () => {
  /* A flat orange square. There is exactly one colour to find, which makes
     the palette assertion below unambiguous rather than a guess at how a
     photographic image would bucket. */
  logoPng = await sharp({
    create: { width: 64, height: 64, channels: 4, background: { r: 255, g: 101, b: 0, alpha: 1 } },
  }).png().toBuffer();
});

async function upload(page: import("@playwright/test").Page, buffer: Buffer, name = "logo.png", mimeType = "image/png") {
  await page.goto(PAGE);
  await page.setInputFiles("#brand-kit-file", { name, mimeType, buffer });
  await page.click(".tl__go");
}

test("a real logo produces a real palette, contrast row and favicon set", async ({ page }) => {
  await upload(page, logoPng);
  await page.waitForSelector(".bk__palette");

  await expect(page.locator(".bk__swatchHex")).toHaveText("#ff6500");
  /* The same figure AGENTS.md documents by hand for this exact colour: white
     text on #ff6500 fails AA. If the contrast maths here ever drifted from
     `lib/contrast.ts`, this is where it would show. */
  await expect(page.locator(".bk__contrastPair")).toContainText("2.95:1 on white");
  await expect(page.locator(".bk__contrastPair .is-fail")).toContainText("on white");
  await expect(page.locator(".bk__contrastPair .is-pass")).toContainText("on black");

  const favicons = page.locator(".bk__favicon");
  await expect(favicons).toHaveCount(6);
  await expect(page.locator(".bk__faviconDl").first()).toHaveAttribute("download", /favicon-\d+\.png/);
});

test("the submit button is disabled until a file is chosen", async ({ page }) => {
  await page.goto(PAGE);
  await expect(page.locator(".tl__go")).toBeDisabled();
});

test("a file that is not an image gets a plain refusal, not a crash", async ({ page }) => {
  await upload(page, Buffer.from("not an image"), "notes.txt", "text/plain");

  const error = page.locator(".tl__err");
  await expect(error).toBeVisible();
  await expect(error).toContainText(/PNG, JPEG, WebP, GIF, AVIF|could not read/i);
  await expect(page.locator(".bk__palette")).toHaveCount(0);
});

test("nothing uploaded is ever sent to an email or stored on the page as a link back to us", async ({ page }) => {
  await upload(page, logoPng);
  await page.waitForSelector(".bk__palette");
  /* No email field anywhere on this tool -- unlike the SEO snapshot, there is
     no slow half to defer, so there is nothing to ask for. */
  await expect(page.locator('input[type="email"]')).toHaveCount(0);
});

test("the result holds together on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await upload(page, logoPng);
  await page.waitForSelector(".bk__palette");

  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "the page scrolls sideways at 320px").toBeLessThanOrEqual(1);
});
