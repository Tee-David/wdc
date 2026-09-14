import { expect, test } from "@playwright/test";

/**
 * Voids, refunds and credit: the three ways money moves backwards.
 *
 * THEY ARE THREE DIFFERENT EVENTS AND THE BOOKS HAVE TO TELL THEM APART.
 * A void says the invoice should never have existed. A reversal says the money
 * never really arrived. A refund says it arrived, we had it, and it went back
 * -- and a client reconciling against their bank statement sees two movements
 * for that one and none for the others. Collapsing any pair of them loses the
 * only fact worth keeping.
 *
 * WHAT IS PINNED HERE is the arithmetic and the documents, because both fail
 * silently. A voided invoice still counted in receivables is a figure nobody
 * checks by hand; a receipt that says "reversed" when the money was refunded
 * leaves a client hunting for a credit that is not there.
 *
 * The seeded cases in lib/admin/store.ts exist for this file: INV-2026-006 is
 * struck, and RCT-2026-004 is a deposit half of which went back onto the
 * client's balance.
 */

const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
const VOIDED = "seedInv6AAAAAAAAAAAAAAA";
const REFUNDED = "seedRct4AAAAAAAAAAAAAAA";

test.describe.configure({ timeout: 90_000 });

/** Every naira figure on the page, as integers, so totals can be checked. */
async function nairaOn(locator: import("@playwright/test").Locator) {
  const text = (await locator.textContent()) ?? "";
  return [...text.matchAll(/₦([\d,]+)\.\d\d/g)].map((m) => Number(m[1].replace(/,/g, "")));
}

test.describe("a struck invoice", () => {
  test("still opens, and says nothing is owed", async ({ page }) => {
    const res = await page.goto(`/i/${VOIDED}`);
    /* NOT A 404. A 404 on a document somebody is holding reads as the studio
       having made it disappear. */
    expect(res?.status()).toBe(200);
    await expect(page.locator(".doc__void")).toContainText("cancelled");
    await expect(page.locator(".doc__owed b")).toHaveText("₦0.00");
  });

  test("offers no way to pay it", async ({ page }) => {
    await page.goto(`/i/${VOIDED}`);
    /* Neither the card button nor the transfer instructions: a "how to pay"
       panel under a document saying nothing is owed invites money that would
       have to be sent straight back. */
    await expect(page.locator(".doc__pay")).toHaveCount(0);
    await expect(page.locator(`form[action="/api/pay/${VOIDED}"]`)).toHaveCount(0);
  });

  test("the checkout route refuses it rather than opening one", async ({ request }) => {
    const res = await request.post(`/api/pay/${VOIDED}`, { maxRedirects: 0 });
    expect(res.status()).toBe(303);
    expect(res.headers()["location"]).toContain("pay=voided");
  });

  test("it keeps its number, and the number is not reused", async ({ page }) => {
    await page.goto(`/i/${VOIDED}`);
    await expect(page.locator(".doc__no")).toHaveText("INV-2026-006");
  });

  test("it still says what it was for", async ({ page }) => {
    /* The lines and the total stay real. "Nothing is owed" is a statement
       about the balance, not an erasure of what the document said. */
    await page.goto(`/i/${VOIDED}`);
    await expect(page.locator(".doc__lines tbody")).toContainText("Packaging artwork");
    await expect(page.locator(".doc__lines tfoot")).toContainText("₦548,250.00");
  });
});

test.describe("a refunded payment", () => {
  test("the receipt says refunded, not reversed", async ({ page }) => {
    const res = await page.goto(`/r/${REFUNDED}`);
    expect(res?.status()).toBe(200);
    const note = page.locator(".doc__void");
    await expect(note).toContainText("refunded");
    await expect(note).not.toContainText("reversed");
  });

  test("it itemises what went back, and where", async ({ page }) => {
    await page.goto(`/r/${REFUNDED}`);
    const refunds = page.locator(".doc__sub", { hasText: "Refunded" });
    await expect(refunds).toBeVisible();
    /* Where it went is the fact a single "less refunds" figure cannot carry:
       money returned has left the studio, money held as credit has not. */
    await expect(page.locator(".doc__lines").nth(0)).toContainText("Held on your balance");
  });

  test("the amount received is not rewritten", async ({ page }) => {
    /* ₦150,000 arrived and the receipt still says so. The client is holding a
       document with that number on it; a books entry that edits itself cannot
       be reconciled against a printed one. */
    await page.goto(`/r/${REFUNDED}`);
    await expect(page.locator(".doc__owed b")).toHaveText("₦150,000.00");
  });

  test("and the arithmetic still closes", async ({ page }) => {
    await page.goto(`/r/${REFUNDED}`);
    const table = page.locator(".doc__lines").nth(0);
    const figures = await nairaOn(table);
    /* One refund of 75,000, leaving 75,000 held. */
    expect(figures).toContain(75_000);
    await expect(table.locator("tfoot")).toContainText("Still held");
  });
});

test.describe("the books", () => {
  test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");

  test.beforeEach(async ({ page, baseURL }) => {
    await page.context().addCookies([
      { name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" },
    ]);
    await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  });

  test("a struck invoice owes nothing and is out of the aging", async ({ page }) => {
    await page.goto("/admin/money", { waitUntil: "load" });
    const row = page.locator("tr", { hasText: "INV-2026-006" }).first();
    await expect(row).toContainText("Void");
    /* Its total is still shown -- it is a real document -- and the owed column
       reads nil rather than its total. */
    await expect(row).toContainText("₦548,250.00");
    await expect(row).toContainText("Nil");
  });

  test("outstanding equals the aging buckets, with the void in neither", async ({ page }) => {
    await page.goto("/admin/money", { waitUntil: "load" });
    const aging = page.locator(".ad__panel", {
      has: page.getByRole("heading", { name: /Who owes what/i }),
    });
    const total = (await nairaOn(aging.locator("tfoot")))[0];
    /* The one number both panels have to agree on. If a void leaked into
       either, they would differ by ₦548,250. */
    expect(total).toBeGreaterThan(0);
    expect(total).not.toBe(548_250);

    const rows = await aging.locator("tbody tr").allTextContents();
    expect(rows.join(" ")).not.toContain("INV-2026-006");
  });

  test("a refund is counted net, not gross", async ({ page }) => {
    await page.goto("/admin/money/i2", { waitUntil: "load" });
    const tiles = page.locator("dl.ad__tiles");
    /* ₦150,000 arrived, ₦75,000 went back, so the invoice has ₦75,000. */
    await expect(tiles).toContainText("₦75,000.00");
    const payments = page.locator(".ad__panel", {
      has: page.getByRole("heading", { name: "Payments", exact: true }),
    });
    /* And the row still shows what actually arrived. */
    await expect(payments).toContainText("₦150,000.00");
  });

  test("the client's balance carries the half that was held", async ({ page }) => {
    await page.goto("/admin/clients/c2", { waitUntil: "load" });
    const panel = page.locator(".ad__panel", {
      has: page.getByRole("heading", { name: "Their balance with us" }),
    });
    await expect(panel).toContainText("₦75,000.00");
    await expect(panel).toContainText("Available");
  });

  test("credit cannot be entered as a payment by hand", async ({ page }) => {
    await page.goto("/admin/money/i1", { waitUntil: "load" });
    await page.getByRole("button", { name: /Record a payment/i }).first().click();
    const options = await page.locator('select[name="method"] option').allTextContents();
    /* Money coming off a balance is applied from the balance, not typed here;
       a hand-entered "Credit" would create money no balance ever gave up. */
    expect(options.join(" ")).not.toContain("Credit");
    expect(options.join(" ")).toContain("POS");
  });
});
