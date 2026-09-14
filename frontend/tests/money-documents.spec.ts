import { expect, test } from "@playwright/test";
import jsQR from "jsqr";
import { PNG } from "pngjs";

/**
 * The public invoice and receipt, and the codes printed on them.
 *
 * TWO THINGS ARE PINNED HERE, and both are the kind that fail quietly.
 *
 * ONE: THE TOKEN IS THE WHOLE AUTHORISATION. Invoice numbers are sequential by
 * design, so a public page addressable by its number would hand anyone holding
 * one invoice every other invoice the studio has raised, by subtracting one.
 * These cases prove the number does not open the page, a near-miss token does
 * not open it, and a draft -- which has not been sent to anybody -- has no
 * public page even with the right token.
 *
 * TWO: THE QR ACTUALLY SCANS. It is decoded with jsQR at the size the page
 * renders it, not eyeballed. These URLs carry a 22-character token and the
 * mark in the middle forces error-correction level H, so they need more
 * modules than the blog's codes; 116px found no code at all and 160px reads
 * cleanly. A QR that does not scan is discovered on somebody else's phone
 * after the invoice has been posted, which is why this is a test.
 *
 * It uses the same door as admin-actions.spec.ts for the admin page, and none
 * at all for the public ones -- that is the point of them.
 */

const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;

/* The seeded records in lib/admin/store.ts. i4 is a draft on purpose. */
const INVOICE = "seedInv1AAAAAAAAAAAAAAA";
const DRAFT = "seedInv4AAAAAAAAAAAAAAA";
const RECEIPT = "seedRct1AAAAAAAAAAAAAAA";

test.describe.configure({ timeout: 120_000 });

test.describe("public money documents", () => {
  test("an invoice opens by its token", async ({ page }) => {
    const res = await page.goto(`/i/${INVOICE}`);
    expect(res?.status()).toBe(200);
    await expect(page.locator(".doc__no")).toHaveText("INV-2026-001");
    /* The figure a client came for, and the line items behind it. */
    await expect(page.locator(".doc__owed b")).toBeVisible();
    await expect(page.locator(".doc__lines tbody tr").first()).toBeVisible();
  });

  test("a receipt opens by its token and names its invoice", async ({ page }) => {
    const res = await page.goto(`/r/${RECEIPT}`);
    expect(res?.status()).toBe(200);
    await expect(page.locator(".doc__no")).toHaveText("RCT-2026-001");
    await expect(page.locator(".doc__meta")).toContainText("INV-2026-001");
  });

  test("the invoice NUMBER does not open it", async ({ page }) => {
    const res = await page.goto("/i/INV-2026-001");
    expect(res?.status()).toBe(404);
  });

  test("a near-miss token does not open it", async ({ page }) => {
    const res = await page.goto(`/i/${INVOICE.slice(0, -1)}B`);
    expect(res?.status()).toBe(404);
  });

  test("a draft has no public page", async ({ page }) => {
    const res = await page.goto(`/i/${DRAFT}`);
    expect(res?.status()).toBe(404);
  });

  test("a receipt number does not open a receipt", async ({ page }) => {
    const res = await page.goto("/r/RCT-2026-001");
    expect(res?.status()).toBe(404);
  });
});

/**
 * Decoded, not looked at. Runs at three device pixel ratios because a code
 * that only survives one of them survives none of them in the field.
 */
for (const [label, path, selector, expected] of [
  ["invoice", `/i/${INVOICE}`, ".doc__qr", `/i/${INVOICE}`],
  ["receipt", `/r/${RECEIPT}`, ".doc__qr", `/r/${RECEIPT}`],
] as const) {
  test(`the ${label} QR decodes to its own url`, async ({ page }) => {
    await page.goto(path, { waitUntil: "load" });
    const box = page.locator(selector).first();
    await box.waitFor();
    /* WAIT FOR THE MARK'S BYTES, not for its box.

       The code's centre is an <image> referencing the logo by URL -- one
       cached file across the site rather than 9KB inlined into every page --
       so the SVG is in the DOM, and its <image> already reports a size, before
       the picture itself has arrived. `getBBox()` was the first thing tried
       and it is true immediately, which is exactly why it did not work.
       jsQR reads pixels, so it has to read them once there are pixels.
       `networkidle` is the signal that every subresource has landed. */
    await page.waitForLoadState("networkidle");
    const png = PNG.sync.read(await box.screenshot({ type: "png" }));
    const found = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    expect(found, `no QR found in the ${label} at its rendered size`).not.toBeNull();
    expect(found!.data.endsWith(expected)).toBe(true);
  });
}

test("the admin shows the client's copy with a scannable code", async ({ page, baseURL }) => {
  test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
  await page.context().addCookies([
    { name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" },
  ]);
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.goto("/admin/money/i1", { waitUntil: "load" });
  const box = page.locator(".ad__qr").first();
  await box.waitFor();
  await page.waitForLoadState("networkidle");
  const png = PNG.sync.read(await box.screenshot({ type: "png" }));
  const found = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  expect(found, "no QR found on the admin invoice at its rendered size").not.toBeNull();
  expect(found!.data.endsWith(`/i/${INVOICE}`)).toBe(true);
});
