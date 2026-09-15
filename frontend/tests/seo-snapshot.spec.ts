import { expect, test } from "@playwright/test";

/**
 * The browser half of /tools/seo, including the data-cost panel bolted onto
 * its result.
 *
 * WHAT IS CHECKED WITHOUT A BROWSER, by `npm run check:seo-audit`: every
 * finding, and the arithmetic that turns bytes into naira and seconds. What
 * needs one is the shape of the bargain the page makes -- every free answer
 * first, the email ask afterwards, and the ask buying something the reader can
 * see they have not already been given.
 *
 * RENDERED FROM A FIXTURE, for the reason written in `link-preview.spec.ts`: a
 * spec pointed at a live site depends on a stranger's uptime and a network
 * this suite may not have. The route's own fetching is covered by
 * `npm run check:fetch-page` and by the refusal case at the end of this file.
 */

const PAGE = "/tools/seo";

const FIXTURE = {
  url: "https://example.com",
  finalUrl: "https://example.com/",
  redirected: false,
  facts: {
    url: "https://example.com/",
    https: true,
    title: "Home",
    description: "",
    h1s: ["Welcome"],
    canonical: "",
    robots: "",
    viewport: "width=device-width, initial-scale=1",
    og: { title: false, description: false, image: false },
    images: 4,
    imagesWithoutAlt: 3,
    structuredData: [],
    /* 2MB, which is a real number for a page built out of a page builder and
       the one that makes the cost panel worth reading. */
    bytes: 2 * 1024 * 1024,
  },
  findings: [
    { id: "robots", label: "Indexing", verdict: "good", detail: "Nothing is blocking this page from being indexed." },
    { id: "title", label: "Title", verdict: "weak", detail: "Only 4 characters." },
    { id: "description", label: "Meta description", verdict: "missing", detail: "There is none, so Google picks two lines out of the page." },
    { id: "h1", label: "Headline", verdict: "good", detail: "One H1." },
    { id: "canonical", label: "Canonical", verdict: "weak", detail: "No canonical link." },
    { id: "viewport", label: "Mobile viewport", verdict: "good", detail: "The viewport meta tag is set." },
    { id: "https", label: "HTTPS", verdict: "good", detail: "Served over https." },
    { id: "og", label: "Sharing tags", verdict: "missing", detail: "None of the three Open Graph tags are set." },
    { id: "alt", label: "Image descriptions", verdict: "weak", detail: "3 of 4 images have no alt attribute." },
    { id: "schema", label: "Structured data", verdict: "weak", detail: "No valid JSON-LD on the page." },
  ],
  headline: "2 things are actively costing you here, and 4 more could be doing more.",
  ours: { url: "https://wedigcreativity.com.ng", bytes: 420_000 },
};

async function checkWithFixture(page: import("@playwright/test").Page) {
  await page.route("**/api/tools/seo", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FIXTURE) }));
  await page.goto(PAGE);
  await page.fill("#seo-url", "https://example.com");
  await page.click(".tl__go");
  await page.waitForSelector(".sn__cost");
}

test("every free finding is shown before anything is asked for", async ({ page }) => {
  await page.route("**/api/tools/seo", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FIXTURE) }));
  await page.goto(PAGE);

  /* Nothing asks for an address to run the check itself. */
  await expect(page.locator("#seo-email")).toHaveCount(0);

  await page.fill("#seo-url", "https://example.com");
  await page.click(".tl__go");
  await page.waitForSelector(".tl__find");

  await expect(page.locator(".tl__find")).toHaveCount(FIXTURE.findings.length);
  /* AND ONLY THEN the ask, which buys the Lighthouse run rather than the
     findings the reader already has. */
  await expect(page.locator("#seo-email")).toBeVisible();
  await expect(page.locator(".tl__step")).toContainText(/lighthouse/i);
});

test("page weight is shown as money and as time", async ({ page }) => {
  await checkWithFixture(page);

  const cost = page.locator(".sn__cost");
  /* MONEY OR KOBO. One page load at a bundle rate is a fraction of a naira, and
     "₦0" would read as "this is free" when the whole point is that it is not.
     The figure is in kobo below ₦1 and in naira above it, so the assertion
     takes either rather than pinning the unit. */
  await expect(cost.locator(".sn__big")).toContainText(/₦|kobo/);
  await expect(cost.locator(".sn__big")).toContainText(/second|minute/);
  /* 2MB, said in the unit somebody reads. */
  await expect(cost.locator(".sn__sub")).toContainText("2.0MB");
  /* A thousand visits is the multiplication people do badly in their heads. */
  await expect(cost.locator(".sn__sub")).toContainText(/thousand visits/i);

  /* OUR OWN NUMBER, MEASURED THE SAME WAY. A comparison with only one side
     measured is an advertisement. */
  await expect(cost.locator(".sn__ours")).toContainText("410KB");
});

test("the data price is the reader's to set, and the figures follow it", async ({ page }) => {
  await checkWithFixture(page);

  const big = page.locator(".sn__big");
  const atDefault = await big.innerText();

  /* Pay-as-you-go is many times a bundle, which is the case the input exists
     for: the same page, the same bytes, a different bill. */
  await page.fill(".sn__priceIn", "4600");
  await expect(big).not.toHaveText(atDefault);

  /* A half-typed rate must not make the figure collapse to zero or NaN. */
  await page.fill(".sn__priceIn", "");
  await expect(big).toContainText(/₦|kobo/);
  await expect(big).not.toContainText(/NaN/);
});

test("it says the weight is the HTML alone", async ({ page }) => {
  await checkWithFixture(page);

  /* ONE FETCH CAN ONLY MEASURE THE DOCUMENT. Implying it has weighed the whole
     page -- images, fonts, scripts -- would be the tool claiming an audit it
     has not done, which is the line this whole page is written to stay behind. */
  await expect(page.locator(".sn__cost")).toContainText(/HTML document alone/i);
});

test("a private address is refused in a sentence", async ({ page }) => {
  /* The real endpoint and the real guards, which is the part of the fetching
     path a browser can exercise without depending on the internet. */
  await page.goto(PAGE);
  await page.fill("#seo-url", "http://169.254.169.254/latest/meta-data/");
  await page.click(".tl__go");

  const error = page.locator(".tl__err");
  await expect(error).toBeVisible();
  await expect(error).toContainText(/public web pages/i);
});

test("the result holds together on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await checkWithFixture(page);

  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "the page scrolls sideways at 320px").toBeLessThanOrEqual(1);
});
