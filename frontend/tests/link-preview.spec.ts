import { expect, test } from "@playwright/test";

/**
 * The browser half of /tools/link-preview.
 *
 * THE READING IS TESTED WITHOUT A BROWSER, by `npm run check:link-preview`,
 * because it is a pure function over HTML. What needs a browser is what the
 * reader sees: four cards, the picture where there is one and the reason where
 * there is not, and a refusal that reads like a sentence rather than a stack
 * trace.
 *
 * THE CARDS ARE RENDERED FROM A FIXTURE, NOT FROM A LIVE SITE. Pointing this
 * spec at a real URL would make it depend on somebody else's uptime, their
 * tags and a network this suite may not have -- a test that fails on a Tuesday
 * because a stranger changed a meta tag is a test people learn to re-run. The
 * route's own fetching is covered by `npm run check:fetch-page` for the guards
 * and by the refusal case below for the path through the route.
 */

const PAGE = "/tools/link-preview";

/** What the route returns for a page that has done half the work: a title and
    an image, no description, no card type. Enough that every branch in the
    component is exercised by one fixture. */
const FIXTURE = {
  url: "https://example.com/post",
  finalUrl: "https://example.com/post",
  redirected: false,
  reviewed: "September 2026",
  tags: {
    title: "A headline that is long enough to be cut on a couple of these cards, comfortably past seventy characters",
    description: "",
    image: "https://example.com/card.png",
    imageAlt: "",
    siteName: "",
    canonical: "https://example.com/post",
    twitterCard: "",
    from: { title: "og:title", description: "", image: "og:image" },
  },
  image: { url: "https://example.com/card.png", bytes: 900_000, width: 1200, height: 630, contentType: "image/png" },
  cards: [
    { platform: { key: "whatsapp", label: "WhatsApp", title: 65, description: 120, note: "The fussiest about the image." }, title: "A headline that is long enough to be cut on a couple of…", description: "", titleCut: true, descriptionCut: false, domain: "example.com", showsImage: false, imageReason: "The image is 879KB. WhatsApp drops anything over 300KB.", large: true },
    { platform: { key: "x", label: "X", title: 70, description: 125, note: "Needs twitter:card." }, title: "A headline that is long enough to be cut on a couple of these…", description: "", titleCut: true, descriptionCut: false, domain: "example.com", showsImage: true, imageReason: "", large: false },
    { platform: { key: "linkedin", label: "LinkedIn", title: 119, description: 250, note: "Caches hard." }, title: "A headline that is long enough to be cut on a couple of these cards, comfortably past seventy characters", description: "", titleCut: false, descriptionCut: false, domain: "example.com", showsImage: true, imageReason: "", large: true },
    { platform: { key: "facebook", label: "Facebook", title: 100, description: 300, note: "The most forgiving." }, title: "A headline that is long enough to be cut on a couple of these cards, comfortably…", description: "", titleCut: true, descriptionCut: false, domain: "example.com", showsImage: true, imageReason: "", large: true },
  ],
  findings: [
    { id: "image", label: "Preview image", verdict: "weak", detail: "The image is 879KB. WhatsApp shows nothing over 300KB." },
    { id: "title", label: "Title", verdict: "weak", detail: "It is 104 characters, so WhatsApp and X cut it." },
    { id: "description", label: "Description", verdict: "missing", detail: "No og:description and no meta description." },
    { id: "card", label: "X card type", verdict: "missing", detail: "No twitter:card, so X falls back to the small thumbnail layout." },
  ],
};

async function checkWithFixture(page: import("@playwright/test").Page) {
  await page.route("**/api/tools/link-preview", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FIXTURE) }));
  await page.goto(PAGE);
  await page.fill("#lp-url", "https://example.com/post");
  await page.click(".tl__go");
  await page.waitForSelector(".lp__cards");
}

test("four cards, one per platform, WhatsApp first", async ({ page }) => {
  await checkWithFixture(page);

  const cards = page.locator(".lp__card");
  await expect(cards).toHaveCount(4);

  /* WHATSAPP LEADS, and it is asserted rather than assumed. In this market it
     is the channel a link actually travels through; an alphabetical order
     would put Facebook first and answer an American question. */
  /* Compared in lower case: the label is set in small caps by the stylesheet,
     and `innerText` hands back what is rendered rather than what is written. */
  const order = (await page.locator(".lp__who").allInnerTexts()).map((s) => s.toLowerCase());
  expect(order).toEqual(["whatsapp", "x", "linkedin", "facebook"]);
});

test("each card cuts the title where that platform cuts it", async ({ page }) => {
  await checkWithFixture(page);

  const titles = await page.locator(".lp__title").allInnerTexts();
  expect(titles).toHaveLength(4);

  /* The whole point of four cards rather than one: they must not all say the
     same thing. LinkedIn keeps this title whole; WhatsApp does not. */
  expect(new Set(titles).size, "every card shows the same title").toBeGreaterThan(1);
  expect(titles[0].endsWith("…"), "WhatsApp's copy is not cut").toBe(true);
  expect(titles[2].endsWith("…"), "LinkedIn cuts a title it has room for").toBe(false);

  /* And it says where it cut, in the platform's own number. */
  await expect(page.locator(".lp__cut").first()).toContainText("65");
});

test("a card that will show no picture says why", async ({ page }) => {
  await checkWithFixture(page);

  const whatsapp = page.locator(".lp__card--whatsapp");
  await expect(whatsapp.locator(".lp__noimg")).toBeVisible();
  /* "No image" and "your image is 879KB and WhatsApp drops it" are different
     problems with different fixes, so the empty state carries the reason. */
  await expect(whatsapp.locator(".lp__noimg")).toContainText(/300KB/);

  /* X has no twitter:card here, so it gets the thumbnail layout rather than
     the banner. That is the difference the platform actually makes. */
  await expect(page.locator(".lp__card--x .lp__mock--small")).toHaveCount(1);
  await expect(page.locator(".lp__card--linkedin .lp__mock--small")).toHaveCount(0);
});

test("the findings are listed under the cards, worst thing first", async ({ page }) => {
  await checkWithFixture(page);

  const findings = page.locator(".tl__find");
  await expect(findings).toHaveCount(FIXTURE.findings.length);
  await expect(findings.first()).toContainText("Preview image");

  /* Colour is never the carrier: every row says its verdict in words. */
  const words = await page.locator(".tl__findverdict").allInnerTexts();
  expect(words.every((w) => w.trim().length > 0)).toBe(true);
});

test("a private address is refused in a sentence, not a stack trace", async ({ page }) => {
  /* NO ROUTE MOCK HERE ON PURPOSE. This one goes through the real endpoint and
     the real SSRF guards, which is the only part of the fetching path a
     browser test can exercise without depending on the internet. */
  await page.goto(PAGE);
  await page.fill("#lp-url", "http://127.0.0.1:6379/");
  await page.click(".tl__go");

  const error = page.locator(".tl__err");
  await expect(error).toBeVisible();
  await expect(error).toContainText(/public web pages/i);
  /* Nothing leaks about why it was refused beyond that. */
  await expect(error).not.toContainText(/error|stack|ECONN/i);
});

test("the cards stack without breaking a phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await checkWithFixture(page);

  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "the page scrolls sideways at 320px").toBeLessThanOrEqual(1);
});
