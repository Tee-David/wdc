import { expect, test } from "@playwright/test";

/**
 * The admin on a phone.
 *
 * FOUR FAULTS FROM FOUR PHOTOGRAPHS, all of them layout and none of them
 * visible in a component on its own. They are pinned together because they
 * share a cause worth naming: a rule that is right on a 1280px rail and wrong
 * in a 360px column.
 *
 * THESE NEED A DATABASE, because the admin is behind a session and the session
 * store is CockroachDB. Rather than fail a whole suite on a machine without
 * one, they skip: a test that cannot run should say so, not go red next to
 * tests that genuinely failed.
 */

const EMAIL = process.env.WDC_E2E_ADMIN_EMAIL;
const PASSWORD = process.env.WDC_E2E_ADMIN_PASSWORD;

/**
 * How far the page will actually move sideways, in pixels.
 *
 * NOT `scrollWidth - clientWidth`, which is the obvious test and gives a false
 * positive here. The admin shell clips horizontally (`overflow-x: clip` on
 * `.ad` and `.ad__main`), and Chromium still counts clipped content toward the
 * root's `scrollWidth`: on /admin/projects it reports 1162 against a 393px
 * client width while the page cannot be scrolled sideways by a single pixel.
 * Asserting on that number would have had me "fixing" a page that was already
 * correct, and would fail forever afterwards.
 *
 * Trying to scroll and reading back where we landed is the thing a reader
 * would actually experience.
 */
async function scrollsSideways(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const before = window.scrollX;
    window.scrollTo(600, window.scrollY);
    const moved = window.scrollX - before;
    window.scrollTo(before, window.scrollY);
    return moved;
  });
}

test.describe.configure({ timeout: 120_000 });

test.beforeEach(async ({ page }) => {
  test.skip(!EMAIL || !PASSWORD, "set WDC_E2E_ADMIN_EMAIL and WDC_E2E_ADMIN_PASSWORD to run the admin tests");
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto("/login");
  /* Email first, then the method, then the password: the login page asks
     for one thing at a time. Wait for hydration before typing, because the
     fields are controlled and a value typed earlier is reconciled away. */
  await expect(page.locator("button.au__submit").first()).not.toHaveAttribute("disabled", { timeout: 30_000 });
  await page.getByLabel("Email", { exact: true }).fill(EMAIL!);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("tab", { name: "Password" }).click();
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD!);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.waitForURL(/\/admin/, { timeout: 30_000 });
});

test("a panel's action keeps its own line, arrow included", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.locator(".ad__panelH").first()).toBeVisible();

  /* THE FAULT: the label and its arrow were a text node beside an unsized
     `<svg>`. A lucide glyph has no intrinsic size, so it drew at 24px against
     13px type and the pair wrapped, stranding the arrow on a line of its own.
     One line box for the whole link is the assertion; it cannot be satisfied
     by a link that has broken in two. */
  const rows = await page.locator(".ad__panelH").evaluateAll((heads) =>
    heads.map((h) => {
      const title = h.querySelector("h2, h3");
      const action = h.querySelector("a");
      if (!title || !action) return null;
      return {
        title: title.textContent?.trim() ?? "",
        lines: action.getClientRects().length,
        sameRow: Math.abs(title.getBoundingClientRect().top - action.getBoundingClientRect().top) < 8,
        icon: action.querySelector("svg")?.getBoundingClientRect().width ?? 0,
      };
    }).filter(Boolean),
  );

  expect(rows.length, "no panel headers with an action were found").toBeGreaterThan(0);
  for (const r of rows) {
    expect(r!.lines, `"${r!.title}" action wrapped onto ${r!.lines} lines`).toBe(1);
    expect(r!.sameRow, `"${r!.title}" action dropped below its title`).toBe(true);
    expect(r!.icon, `"${r!.title}" icon is unsized`).toBeLessThan(20);
  }
});

test("the menu drawer is a list, not a list split across a chasm", async ({ page }) => {
  await page.goto("/admin");
  await page.locator(".ad__mobileMenu").click();
  await expect(page.locator(".ad__mobileDrawer")).toBeVisible();

  /* The drawer is full height, which is right for a nav drawer. What was wrong
     was `margin-top: auto` on the last group pushing Settings to the foot and
     opening 430px of nothing in the middle of five links. So the assertion is
     about the GAP BETWEEN ITEMS, not about the height of the panel. */
  const gaps = await page.locator(".ad__mobileDrawer .ad__link").evaluateAll((links) => {
    const boxes = links.map((l) => l.getBoundingClientRect()).sort((a, b) => a.top - b.top);
    return boxes.slice(1).map((b, i) => Math.round(b.top - boxes[i].bottom));
  });
  expect(gaps.length).toBeGreaterThan(3);
  const worst = Math.max(...gaps);
  expect(worst, `a ${worst}px gap between two menu items`).toBeLessThan(80);
});

test("a wide table scrolls itself instead of crushing its columns", async ({ page }) => {
  await page.goto("/admin/money");
  const first = await page.locator('a[href^="/admin/money/"]').first().getAttribute("href");
  expect(first, "no invoice to open").toBeTruthy();
  await page.goto(first!);

  const table = page.locator(".ad__scroll .ad__t").first();
  await expect(table).toBeVisible();

  const shape = await table.evaluate((t) => {
    const wrap = t.parentElement!;
    const cells = [...t.querySelectorAll("tbody tr:first-child td")].map((c) => c.getBoundingClientRect().width);
    return { scrolls: t.scrollWidth > wrap.clientWidth, narrowest: Math.min(...cells) };
  });

  /* The wrapper always had `overflow-x: auto`; the table inside it was
     `width: 100%`, so it squeezed rather than overflowed and the recipient
     column came out one character per line. A column narrower than about 5rem
     is that fault returning. */
  expect(shape.scrolls, "the table fits the phone, so its columns were crushed to make it").toBe(true);
  expect(shape.narrowest, "a column is too narrow to read").toBeGreaterThan(70);

  /* And the page itself still must not scroll sideways. A table is the one
     thing allowed to be wider than the screen, inside its own scroller. */
  expect(await scrollsSideways(page), "the table pushed the page sideways").toBe(0);
});

test("Projects opens on the list, with List first", async ({ page }) => {
  await page.goto("/admin/projects");

  const links = await page.locator(".ad__switch a").evaluateAll((els) =>
    els.map((e) => ({ label: e.textContent?.trim() ?? "", current: e.getAttribute("aria-current") === "true" })),
  );

  expect(links.map((l) => l.label)).toEqual(["List", "Board"]);
  expect(links[0].current, "Projects did not open on the list").toBe(true);

  /* An existing ?view=list link has to keep working: the parameter was
     inverted rather than renamed precisely so it would. */
  await page.goto("/admin/projects?view=list");
  const stillList = await page.locator(".ad__switch a").first()
    .evaluate((e) => e.getAttribute("aria-current") === "true");
  expect(stillList, "an old ?view=list link stopped landing on the list").toBe(true);
});

test("no admin page scrolls sideways on a phone", async ({ page }) => {
  for (const route of ["/admin", "/admin/clients", "/admin/projects", "/admin/money", "/admin/forms"]) {
    await page.goto(route);
    await page.waitForTimeout(400);
    const by = await scrollsSideways(page);
    expect(by, `${route} scrolls ${by}px sideways`).toBe(0);
  }
});
