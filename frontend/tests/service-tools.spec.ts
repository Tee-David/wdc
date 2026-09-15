import { expect, test } from "@playwright/test";
import { FREE_TOOLS, toolsFor } from "../lib/tools";
import { SERVICES } from "../lib/services";

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

/* READ FROM THE REGISTRY, NOT COPIED OUT OF IT.
   These lists were three literals, and section 1B added four tools to
   `lib/tools.ts` -- at which point a spec asserting "the web page offers
   exactly these two" is asserting a fact about a file nobody edited. Worse,
   the resolve test would have kept passing while four new routes went
   unchecked. The registry is the data both the site and this file read. */
const SERVICE_WITH_TOOLS = "/services/web";
const EXPECTED = toolsFor("web").map((t) => t.href);
const ALL_TOOLS = FREE_TOOLS.map((t) => t.href);

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
    wraps: ["svc-tool__ic", "svc-tool__t", "svc-tool__d", "svc-tool__go"]
      .every((c) => el.querySelector("." + c) !== null),
    /* And nothing inside it is a second link, which would swallow the click
       and navigate somewhere else. */
    nested: el.querySelectorAll("a, button").length,
  }));

  expect(shape.tag).toBe("a");
  expect(shape.wraps, "the card does not contain all of its own parts").toBe(true);
  expect(shape.nested, "a nested link inside the card would steal the tap").toBe(0);
});

test("every service page shows exactly the tools the registry gives it", async ({ page }) => {
  /* THIS TEST USED TO NAME ONE EMPTY SERVICE, and it had already had to move
     once, from `branding` to `seo`, as each gained a tool. Section 1B gave the
     last two -- `seo`, `social`, `software` and `apps` -- a tool of their own,
     so there is no empty service left to name and the test that named one
     would now be untestable rather than merely wrong.

     What it was really asserting survives as a rule over all six: a service
     shows its own tools and nothing else, and a service with none grows no
     empty heading. The day a seventh service is added with no tool, this
     covers it without anybody remembering to come back here. */
  for (const service of SERVICES) {
    const expected = toolsFor(service.slug).map((t) => t.href);
    await page.goto(`/services/${service.slug}`);

    const cards = page.locator(".svc-tool");
    await expect(cards, `${service.slug} shows the wrong number of tools`).toHaveCount(expected.length);

    if (expected.length === 0) {
      /* No cards AND no heading: an empty "Try one before you talk to us" is
         worse than no section at all. */
      await expect(page.locator(".svc-tools")).toHaveCount(0);
      await expect(page.getByText("Try one before you talk to us")).toHaveCount(0);
      continue;
    }

    const hrefs = await cards.evaluateAll((els) =>
      els.map((e) => new URL((e as HTMLAnchorElement).href).pathname));
    expect(hrefs.sort(), `${service.slug} offers the wrong tools`).toEqual([...expected].sort());
  }
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
