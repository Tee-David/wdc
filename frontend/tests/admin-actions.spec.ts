import { expect, test, type Page } from "@playwright/test";

/**
 * Every list in the admin offers the verbs for the thing on its row.
 *
 * The screens were readable and inert: the only way to find out what could be
 * done to a project was to open the project. This pins the fix -- a row menu
 * on every list, with items that match the record's actual state.
 *
 * HOW IT GETS IN. The admin is behind a session, and this sandbox has no
 * database to seed one in, so the spec uses the same door the skeleton
 * capture script uses: `BONEYARD_CAPTURE_TOKEN` on the server plus the
 * matching header, which the admin layout accepts OUTSIDE production only.
 * The middleware in front of it wants a session cookie present and does not
 * read it, so a placeholder satisfies the redirect and the layout does the
 * real check. Without the token there is nothing to test against, so the spec
 * skips rather than failing -- run it with
 * `BONEYARD_CAPTURE_TOKEN=x npx next dev` on the other side.
 */

const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;

test.describe.configure({ timeout: 120_000 });
test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
test.use({ extraHTTPHeaders: { "x-boneyard-capture": TOKEN ?? "" } });

const open = async (page: Page, path: string, baseURL: string | undefined) => {
  await page.context().addCookies([
    { name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" },
  ]);
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
};

const LISTS = ["/admin", "/admin/projects", "/admin/clients", "/admin/money", "/admin/forms", "/admin/settings"];

for (const path of LISTS) {
  test(`${path} offers actions on its rows`, async ({ page, baseURL }) => {
    await open(page, path, baseURL);
    expect(await page.locator(".ad__rm").count(), `${path} has no row menus`).toBeGreaterThan(0);
  });
}

/* `?view=list`, because Projects now opens on the BOARD.

   The page used to render the board and the table together; it has a switch
   now, and the board is the default because "what is in flight" is the
   question somebody opens the screen with. These two cases are about the row
   MENU rather than about which view is default, so they ask for the view that
   has rows. The board's cards carry the same menu and the sweep above already
   covers it. */
test("a row menu opens in the admin's own scope and walks with the keyboard", async ({ page, baseURL }) => {
  await open(page, "/admin/projects?view=list", baseURL);
  await page.locator("table.ad__t .ad__rm").first().click();

  const list = page.locator(".ad__rmList");
  await expect(list).toHaveAttribute("role", "menu");

  /* PORTALLED INSIDE `.ad`, NOT INTO THE BODY. Every colour and the type on
     these screens are declared on `.ad`; outside it the menu renders with no
     background at all. Measured once, the hard way. */
  const styled = await list.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      insideAd: !!el.closest(".ad"),
      opaque: cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.backgroundColor !== "transparent",
    };
  });
  expect(styled.insideAd).toBe(true);
  expect(styled.opaque).toBe(true);

  /* And outside the `overflow: auto` scroller the table sits in. */
  const box = (await list.boundingBox())!;
  const view = page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(view.width + 1);

  const first = await page.evaluate(() => document.activeElement?.textContent?.trim());
  await page.keyboard.press("ArrowDown");
  const second = await page.evaluate(() => document.activeElement?.textContent?.trim());
  expect(second).not.toBe(first);

  await page.keyboard.press("Escape");
  await expect(list).toHaveCount(0);
});

test("a menu item opens a dialog that names the record", async ({ page, baseURL }) => {
  await open(page, "/admin/projects?view=list", baseURL);
  const title = (await page.locator("table.ad__t tbody tr").first().locator("b").first().textContent())!.trim();

  await page.locator("table.ad__t .ad__rm").first().click();
  await page.locator(".ad__rmList [data-item]").nth(2).click();

  const dialog = page.locator("dialog.addlg[open]");
  await expect(dialog).toHaveCount(1);
  await expect(dialog.locator("h2")).toContainText(title);
  /* The menu goes when the dialog comes, and the dialog survives it: the two
     are siblings for exactly this reason. */
  await expect(page.locator(".ad__rmList")).toHaveCount(0);
});

test("an invoice is only offered what its status allows", async ({ page, baseURL }) => {
  await open(page, "/admin/money", baseURL);
  const rows = page.locator("table.ad__t").first().locator("tbody tr");

  for (let i = 0; i < await rows.count(); i++) {
    const status = (await rows.nth(i).locator(".ad__pill").first().textContent())!.trim();
    await rows.nth(i).locator(".ad__rm").click();
    /* Waited for rather than read straight away: the menu mounts a frame after
       the press, and reading an empty list is a flake, not a finding. */
    await expect(page.locator(".ad__rmList")).toBeVisible();
    const items = (await page.locator(".ad__rmList [data-item]").allTextContents()).join(" | ");

    if (status === "Draft") {
      /* Nothing has been sent, so it can still be issued and still be thrown
         away -- and there is nothing to take a payment against. */
      expect(items, items).toContain("Issue it");
      expect(items, items).toContain("Delete the draft");
      expect(items, items).not.toContain("Record a payment");
    } else {
      /* Issued. Its number and lines are fixed, so deleting it would leave a
         hole in the numbering somebody has already been sent. */
      expect(items, items).not.toContain("Delete the draft");
      expect(items, items).not.toContain("Issue it");
    }

    await page.keyboard.press("Escape");
    await expect(page.locator(".ad__rmList")).toHaveCount(0);
  }
});

test("editing a setting writes an override, and putting it back clears it", async ({ page, baseURL }) => {
  await open(page, "/admin/settings", baseURL);
  const row = page.locator("table.ad__t tbody tr").first();

  await row.locator(".ad__rm").click();
  await expect(page.locator(".ad__rmList [data-item]")).toHaveCount(1);
  await page.locator(".ad__rmList [data-item]").first().click();

  const field = page.locator("dialog.addlg[open] input[name=value]");
  const shipped = await field.inputValue();
  await field.fill("changed@example.com");
  await page.locator("dialog.addlg[open] button[type=submit]").click();
  await page.waitForTimeout(2000);

  await expect(row).toContainText("changed@example.com");
  /* The screen says what shipped as well as what it is showing, which is the
     question people actually bring to a settings page. */
  await expect(row).toContainText("Edited");
  await expect(row).toContainText(shipped);

  await row.locator(".ad__rm").click();
  await expect(page.locator(".ad__rmList [data-item]")).toHaveCount(2);
  await page.locator(".ad__rmList [data-item]").last().click();
  await page.locator("dialog.addlg[open] button[type=submit]").click();
  await page.waitForTimeout(2000);

  await expect(row).not.toContainText("Edited");
  await expect(row).toContainText(shipped);
});
