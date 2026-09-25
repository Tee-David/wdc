import { expect, test } from "@playwright/test";

/**
 * Estimates: what was quoted, and whether anybody said yes.
 *
 * THE THING WORTH PINNING is that an estimate is not a draft invoice. A draft
 * is a document the studio has not finished writing; an estimate is one it HAS
 * finished and sent, waiting on somebody else. They have separate number
 * series, separate public addresses, and accepting one raises a NEW invoice
 * rather than transforming the quote -- so there is still a document saying
 * what the price was when it was agreed, after the scope changes and the price
 * does too.
 *
 * AND THAT NOBODY CAN PAY A QUOTE. A pay button on an estimate would take
 * money against a document that owes nothing.
 */

const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
/* Seeded in lib/admin/store.ts: one live, one accepted, one declined. */
const LIVE = "seedEst1AAAAAAAAAAAAAAA";
const ACCEPTED = "seedEst2AAAAAAAAAAAAAAA";
const DECLINED = "seedEst3AAAAAAAAAAAAAAA";

test.describe.configure({ timeout: 90_000 });

test.describe("the public estimate", () => {
  test("opens by its token and holds a date", async ({ page }) => {
    const res = await page.goto(`/q/${LIVE}`);
    expect(res?.status()).toBe(200);
    await expect(page.locator(".doc__no")).toHaveText("EST-2026-001");
    await expect(page.locator(".doc__pill")).toContainText("Holds until");
  });

  test("its number does not open it, and a near miss does not either", async ({ page }) => {
    expect((await page.goto("/q/EST-2026-001"))?.status()).toBe(404);
    expect((await page.goto(`/q/${LIVE.slice(0, -1)}B`))?.status()).toBe(404);
  });

  test("nobody can pay a quote", async ({ page }) => {
    await page.goto(`/q/${LIVE}`);
    /* No card button and no checkout form anywhere on the document. */
    await expect(page.locator("form[action^='/api/pay/']")).toHaveCount(0);
    await expect(page.locator(".doc__btn")).toHaveCount(0);
    await expect(page.locator(".doc__pay")).toContainText("Nothing is owed");
  });

  test("the discount is applied to the sum, and the arithmetic closes", async ({ page }) => {
    await page.goto(`/q/${LIVE}`);
    const foot = page.locator(".doc__lines tfoot");
    /* ₦2,130,000 less 5% is ₦2,023,500; VAT at 7.5% is ₦151,762.50. A discount
       taken per line and summed would land a kobo or two away from this. */
    await expect(foot).toContainText("₦2,130,000.00");
    await expect(foot).toContainText("−₦106,500.00");
    await expect(foot).toContainText("₦151,762.50");
    await expect(page.locator(".doc__owed b")).toHaveText("₦2,175,262.50");
  });

  test("what it covers and its terms are on the document", async ({ page }) => {
    /* Not in the covering email, which is the thing nobody can find in
       December. */
    await page.goto(`/q/${LIVE}`);
    await expect(page.locator(".doc__sheet")).toContainText("What this covers");
    await expect(page.locator(".doc__sheet")).toContainText("Terms");
  });

  test("an accepted one names the invoice it became, and keeps its own number", async ({ page }) => {
    await page.goto(`/q/${ACCEPTED}`);
    await expect(page.locator(".doc__no")).toHaveText("EST-2026-002");
    await expect(page.locator(".doc__pill")).toContainText("Accepted by");
    /* The invoice is a different document at a different number. */
    await expect(page.locator(".doc__pay")).toContainText("INV-2026-001");
    await expect(page.locator("a[href*='/i/']")).toHaveCount(1);
  });

  test("a declined one is kept, and says so", async ({ page }) => {
    const res = await page.goto(`/q/${DECLINED}`);
    expect(res?.status()).toBe(200);
    await expect(page.locator(".doc__void")).toContainText("declined");
  });

  test("it is not indexed", async ({ page }) => {
    await page.goto(`/q/${LIVE}`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("robots disallows the whole prefix", async ({ request }) => {
    const body = await (await request.get("/robots.txt")).text();
    expect(body).toContain("/q/");
  });
});

test.describe("in the admin", () => {
  test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");

  test.beforeEach(async ({ page, baseURL }) => {
    await page.context().addCookies([
      { name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" },
    ]);
    await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  });

  test("estimates have their own series, separate from invoices", async ({ page }) => {
    await page.goto("/admin/money", { waitUntil: "load" });
    const panel = page.locator(".ad__panel", {
      has: page.getByRole("heading", { name: "Estimates", exact: true }),
    });
    await expect(panel).toContainText("EST-2026-001");
    /* A quote nobody took must not have burned an invoice number: the invoice
       series runs 001-006 and has never seen an EST. */
    await expect(panel).not.toContainText("INV-2026-007");
  });

  test("the pipeline figure is separate from collected income", async ({ page }) => {
    await page.goto("/admin/money", { waitUntil: "load" });
    const tiles = page.locator("dl.ad__tiles").first();
    /* A quote is not money: the figure sits on the Estimates panel, and no
       tile of money in or out counts it. */
    await expect(tiles).toContainText("Collected");
    await expect(tiles).not.toContainText(/quote/i);
    const panel = page.locator(".ad__panel", { has: page.getByRole("heading", { name: "Estimates", exact: true }) });
    await expect(panel).toContainText("out for quote");
  });

  test("a declined estimate is kept rather than deleted", async ({ page }) => {
    await page.goto("/admin/money", { waitUntil: "load" });
    const row = page.locator("tr", { hasText: "EST-2026-003" }).first();
    await expect(row).toContainText("Declined");
    /* A click before hydration opens nothing, so try until the menu shows. */
    await expect(async () => {
      await row.locator(".ad__rm").click();
      await expect(page.locator(".ad__rmList [data-item]").first()).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 30_000 });
    const items = (await page.locator(".ad__rmList [data-item]").allTextContents()).join(" | ");
    /* No delete anywhere: a quote nobody took is the most useful row in a
       pipeline six months later. */
    expect(items).not.toContain("Delete");
    expect(items).toContain("Quote it again");
  });

  test("a draft has no public page, so the menu does not offer one", async ({ page }) => {
    await page.goto("/admin/money", { waitUntil: "load" });
    const row = page.locator("tr", { hasText: "EST-2026-001" }).first();
    /* A click before hydration opens nothing, so try until the menu shows. */
    await expect(async () => {
      await row.locator(".ad__rm").click();
      await expect(page.locator(".ad__rmList [data-item]").first()).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 30_000 });
    const items = (await page.locator(".ad__rmList [data-item]").allTextContents()).join(" | ");
    /* This one is Sent, so it does offer the client's copy and an answer. */
    expect(items).toContain("Open the client's copy");
    expect(items).toContain("Record their answer");
  });
});
