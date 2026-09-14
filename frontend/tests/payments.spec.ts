import { expect, test } from "@playwright/test";

/**
 * Paying an invoice, and the ways that must fail.
 *
 * WHAT IS PINNED HERE IS THE CLOSED DOOR. The happy path needs a configured
 * Paystack account and a real card, so it is not something a test suite can
 * assert; what a test suite can assert -- and what actually costs money when
 * it regresses -- is that everything else is refused.
 *
 *   - the webhook writes payments, so an unsigned or wrongly signed body must
 *     be a 401 with nothing written;
 *   - the checkout route spends a Paystack API call and creates a transaction,
 *     so a wrong token and a draft invoice must be plain 404s;
 *   - the return page must not believe a query string.
 *
 * Every one of these is a case where the failure is silent in production: an
 * accepted forged webhook looks exactly like a paid invoice.
 */

const INVOICE = "seedInv1AAAAAAAAAAAAAAA";
const DRAFT = "seedInv4AAAAAAAAAAAAAAA";

test.describe.configure({ timeout: 60_000 });

test.describe("the webhook fails closed", () => {
  const body = JSON.stringify({
    event: "charge.success",
    data: { reference: "FORGED-001", amount: 50_000_00, status: "success", currency: "NGN" },
  });

  test("no signature is refused", async ({ request }) => {
    const res = await request.post("/api/paystack/webhook", {
      headers: { "content-type": "application/json" }, data: body,
    });
    expect(res.status()).toBe(401);
  });

  test("a wrong signature is refused", async ({ request }) => {
    const res = await request.post("/api/paystack/webhook", {
      headers: { "content-type": "application/json", "x-paystack-signature": "f".repeat(128) },
      data: body,
    });
    expect(res.status()).toBe(401);
  });

  test("an empty signature header is refused", async ({ request }) => {
    const res = await request.post("/api/paystack/webhook", {
      headers: { "content-type": "application/json", "x-paystack-signature": "" },
      data: body,
    });
    expect(res.status()).toBe(401);
  });

  test("a forged charge does not appear on the invoice", async ({ request, page }) => {
    await request.post("/api/paystack/webhook", {
      headers: { "content-type": "application/json", "x-paystack-signature": "f".repeat(128) },
      data: body,
    });
    await page.goto(`/i/${INVOICE}`);
    await expect(page.locator(".doc__sheet")).not.toContainText("FORGED-001");
  });
});

test.describe("starting a checkout", () => {
  test("a wrong token is a plain 404", async ({ request }) => {
    const res = await request.post("/api/pay/notarealtokenatall", { maxRedirects: 0 });
    expect(res.status()).toBe(404);
  });

  test("a draft invoice has nothing to pay", async ({ request }) => {
    const res = await request.post(`/api/pay/${DRAFT}`, { maxRedirects: 0 });
    expect(res.status()).toBe(404);
  });

  test("it is POST only — a link must not be able to spend money", async ({ request }) => {
    const res = await request.get(`/api/pay/${INVOICE}`, { maxRedirects: 0 });
    expect(res.status()).toBe(405);
  });

  test("the invoice offers a real form, not a link", async ({ page }) => {
    await page.goto(`/i/${INVOICE}`);
    const form = page.locator(`form[action="/api/pay/${INVOICE}"]`);
    await expect(form).toHaveAttribute("method", /post/i);
    await expect(form.locator("button[type=submit]")).toBeVisible();
    /* A 44px floor, like every other control on the site. */
    const box = await form.locator("button[type=submit]").boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  test("and the button is the biggest thing in the panel", async ({ page }) => {
    /* THIS IS THE PAGE'S PURPOSE, not one of its options. It used to be a
       44px pill in a row beside its own caption, which made it read as a
       choice among several. Pinned because "tidy that up" is exactly the sort
       of change that quietly shrinks it back. */
    await page.setViewportSize({ width: 1100, height: 1000 });
    await page.goto(`/i/${INVOICE}`);
    const btn = page.locator(".doc__btn--pay");
    const box = await btn.boundingBox();
    const panel = await page.locator(".doc__pay").boundingBox();
    /* Taller than a minimum touch target, and the full width of the panel it
       sits in rather than shrink-wrapped to its label. */
    expect(box!.height).toBeGreaterThanOrEqual(56);
    expect(box!.width).toBeGreaterThan(panel!.width * 0.9);
    /* Still black on orange. Bigger type does not change the measurement:
       white on #ff6500 is 2.95:1 and fails even the 3:1 large text gets. */
    const paint = await btn.evaluate((el) => {
      const s = getComputedStyle(el);
      return { color: s.color, bg: s.backgroundColor, size: parseFloat(s.fontSize) };
    });
    expect(paint.color).toBe("rgb(0, 0, 0)");
    expect(paint.bg).toBe("rgb(255, 101, 0)");
    expect(paint.size).toBeGreaterThan(16);
  });

  test("it is a control on screen and nothing on paper", async ({ page }) => {
    /* A button on a printed invoice cannot be pressed and costs a block of
       solid orange. The QR reopens the live page, where it works. */
    await page.goto(`/i/${INVOICE}`);
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".doc__actions")).toBeHidden();
  });

  test("there is ONE way to pay, and it is not a bank transfer", async ({ page }) => {
    await page.goto(`/i/${INVOICE}`);
    const pay = page.locator(".doc__pay");
    /* The studio collects through Paystack, and Paystack's own page offers a
       transfer to a one-time account beside the card. Offering "prefer a bank
       transfer?" underneath sent people out to email for something the button
       in front of them does better and records automatically -- and produced
       the untracked transfer somebody then reconciles by hand. The other
       methods in the books are the STUDIO'S, for entering money that arrived
       some other way; they are not a menu a client picks from. */
    await expect(pay).not.toContainText(/prefer a bank transfer/i);
    await expect(pay).not.toContainText(/account details/i);
    /* What is there instead: the checkout, and one line naming the invoice so
       anything that goes wrong reaches the right piece of work. */
    await expect(pay.locator("form[action^='/api/pay/']")).toHaveCount(1);
    await expect(pay).toContainText("INV-2026-001");
  });
});

test.describe("coming back from the checkout", () => {
  test("no reference is not a thank-you", async ({ page }) => {
    await page.goto("/pay/done");
    await expect(page.locator(".doc")).toContainText("needs a payment reference");
    await expect(page.locator(".doc")).not.toContainText("Thank you");
  });

  test("a made-up reference is never treated as paid", async ({ page }) => {
    /* The whole point: the page asks Paystack rather than reading the URL.
       With no Paystack configured the verify fails, and the honest answer is
       "we could not confirm this" -- never "paid". */
    await page.goto("/pay/done?reference=MADE-UP-0001&status=success");
    await expect(page.locator(".doc__owed b")).not.toContainText("₦");
    await expect(page.locator(".doc")).not.toContainText("Thank you");
  });

  test("it is not indexed", async ({ page }) => {
    await page.goto("/pay/done");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("the printer only runs once money has actually arrived", async ({ page }) => {
    /* THE WHOLE POINT OF THE THING. A receipt printing itself is a statement
       that the studio has the money, and it must never appear on a page that
       has not confirmed that. The reference this was copied from fires on
       arrival at a success URL, which is a query string anybody can type.

       No reference, a made-up one, and one dressed up to look successful: none
       of them prints. */
    for (const url of ["/pay/done", "/pay/done?reference=MADE-UP-0001",
                       "/pay/done?reference=MADE-UP-0002&status=success"]) {
      await page.goto(url);
      await expect(page.locator(".rp"), `a slip printed on ${url}`).toHaveCount(0);
      await expect(page.locator(".rp__slip")).toHaveCount(0);
    }
  });

  test("and it costs the page no JavaScript", async ({ page }) => {
    /* The slip is one CSS animation on a server-rendered element. This page is
       reached on a phone on mobile data immediately after somebody has parted
       with money, so a celebration that ships a bundle is the wrong trade.
       Pinned by counting the scripts the page asks for: a client component
       added here would show up as another chunk. */
    const scripts: string[] = [];
    page.on("request", (r) => {
      if (r.resourceType() === "script") scripts.push(new URL(r.url()).pathname);
    });
    await page.goto("/pay/done", { waitUntil: "networkidle" });
    const own = scripts.filter((s) => s.includes("receipt-printer"));
    expect(own, `the printer pulled in ${own.join(", ")}`).toEqual([]);
  });
});
