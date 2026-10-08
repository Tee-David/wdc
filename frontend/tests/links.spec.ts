import { expect, test } from "@playwright/test";

const publicPages = ["/", "/services", "/about", "/work", "/contact", "/policies", "/onboarding"];

test("public internal links resolve and in-page links have real targets", async ({ page, request, baseURL }) => {
  test.setTimeout(120_000);
  await page.route(/jotfor|userway/i, (route) => route.abort());
  const origin = new URL(baseURL ?? "http://localhost:3100").origin;
  const destinations = new Set<string>();

  for (const path of publicPages) {
    await page.goto(path);
    const hrefs = await page.locator("a[href]").evaluateAll((links) =>
      links.map((link) => (link as HTMLAnchorElement).href),
    );

    for (const href of hrefs) {
      const url = new URL(href);
      if (url.origin !== origin || !url.pathname.startsWith("/")) continue;
      destinations.add(url.pathname);

      if (url.pathname === new URL(page.url()).pathname && url.hash) {
        const target = page.locator(`[id=${JSON.stringify(url.hash.slice(1))}]`);
        await expect(target, `${path} links to missing target ${url.hash}`).toHaveCount(1);
      }
    }
  }

  for (const pathname of destinations) {
    const response = await request.get(pathname);
    expect(response.status(), `${pathname} returned ${response.status()}`).toBeLessThan(400);
  }
});
