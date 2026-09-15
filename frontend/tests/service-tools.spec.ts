import { expect, test } from "@playwright/test";

/**
 * The free tools are reachable from the page they were built for.
 *
 * WHY THIS IS A TEST. Both tools shipped complete: server-rendered, indexable,
 * their own titles and JSON-LD, listed in the sitemap. And nothing on the site
 * linked to either of them. They were reachable by typing the URL or by
 * finding them in a search result -- which is the one route a visitor already
 * reading the web services page will never take. A page can be finished and
 * still be invisible, and nothing in a build catches that.
 *
 * So the assertion is not "the section renders". It is "a reader on the
 * service page can get to the tool", walked as a click.
 */

const SERVICE_WITH_TOOLS = "/services/web";
const EXPECTED = ["/tools/domain", "/tools/email"];
/* EVERY tool in the registry, not just the web ones. The resolve test below
   walks this, because a card pointing at a 404 is worse than no card and a
   tool filed under a different service is exactly the one nobody rechecks. */
const ALL_TOOLS = ["/tools/domain", "/tools/email", "/tools/business-name"];

test("the web service page offers its free tools", async ({ page }) => {
  await page.goto(SERVICE_WITH_TOOLS);

  const cards = page.locator(".svc-tool");
  await expect(cards).toHaveCount(EXPECTED.length);

  const hrefs = await cards.evaluateAll((els) =>
    els.map((e) => new URL((e as HTMLAnchorElement).href).pathname),
  );
  expect(hrefs.sort()).toEqual([...EXPECTED].sort());

  /* Each card says what it is and what it does, rather than being an icon and
     a chevron. A tool nobody understands is a tool nobody opens. */
  for (const card of await cards.all()) {
    await expect(card.locator(".svc-tool__t")).not.toBeEmpty();
    await expect(card.locator(".svc-tool__d")).not.toBeEmpty();
    await expect(card.locator(".svc-tool__go")).not.toBeEmpty();
  }
});

test("the card is the link, all of it", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto(SERVICE_WITH_TOOLS);

  /* ASSERTED STRUCTURALLY, NOT BY CLICKING A CORNER. A pixel click near the
     card's edge was the first attempt and it was a bad test: the section
     reveals on scroll, so the box is still moving when the coordinates are
     taken, and a miss by two pixels reads as "the card is not a link" when the
     card is fine. What actually matters is that ONE anchor wraps the icon, the
     title, the blurb and the label, so there is no dead area inside the panel
     for a thumb to land on. That is a fact about the DOM, and the DOM does not
     move. */
  const shape = await page.locator(".svc-tool").first().evaluate((el) => ({
    tag: el.tagName.toLowerCase(),
    /* `wdc-tile` rather than a `svc-tool__ic` of its own: the icon square is
       the one shared tile the whole site uses, and this card stopped carrying
       a private class for it when that tile was factored out. Asserting the
       class the element actually has is the point -- a role class with no
       rules behind it, kept alive so a test keeps passing, is how a selector
       and a stylesheet quietly stop describing the same thing. */
    wraps: ["wdc-tile", "svc-tool__t", "svc-tool__d", "svc-tool__go"]
      .every((c) => el.querySelector("." + c) !== null),
    /* And nothing inside it is a second link, which would swallow the click
       and navigate somewhere else. */
    nested: el.querySelectorAll("a, button").length,
  }));

  expect(shape.tag).toBe("a");
  expect(shape.wraps, "the card does not contain all of its own parts").toBe(true);
  expect(shape.nested, "a nested link inside the card would steal the tap").toBe(0);
});

test("a service with no tools of its own grows no empty section", async ({ page }) => {
  /* The section must render nothing rather than an empty heading, or the
     service pages with no tool of their own gain a "Try one before you talk to
     us" with nothing under it.

     NOT `branding` ANY MORE. It has the business name checker now, which is
     the whole point of the registry being data: a service gains a tool by
     gaining a row, and a test naming a specific empty service has to move with
     it. `seo` is the one furthest from having a tool of its own. */
  await page.goto("/services/seo");
  await expect(page.locator(".svc-tools")).toHaveCount(0);
  await expect(page.getByText("Try one before you talk to us")).toHaveCount(0);
});

test("every tool the registry names actually resolves", async ({ page }) => {
  /* A card pointing at a 404 is worse than no card. The hrefs come from
     `lib/tools.ts`, which is data -- so it can name a route that does not
     exist, and nothing would complain until a reader clicked. */
  for (const href of ALL_TOOLS) {
    const response = await page.goto(href);
    expect(response?.status(), `${href} did not resolve`).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
  }
});
