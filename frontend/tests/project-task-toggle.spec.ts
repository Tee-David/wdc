import { expect, test, type Page } from "@playwright/test";

const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
test.describe.configure({ timeout: 120_000 });
test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");

async function asOwner(page: Page, baseURL?: string) {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.context().addCookies([
    { name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" },
  ]);
}

test("a project task can be ticked and reopened without taking the project page down", async ({ page, baseURL }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await asOwner(page, baseURL);

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/admin/projects/p1", { waitUntil: "domcontentloaded" });
    const tick = page.getByRole("button", { name: "Tick off Chase Tobi for a pick" });
    const reopen = page.getByRole("button", { name: "Reopen Chase Tobi for a pick" });
    /* Other focused specs can leave the shared seeded task done. Put it back
       before proving the full tick → reopen path, rather than making test
       order decide whether this regression is exercised. */
    await expect(async () => {
      if (await reopen.count()) await reopen.click({ timeout: 2_000 });
      await expect(tick).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 60_000 });
    await tick.click();
    await expect(reopen).toBeVisible();
    await expect(page.getByText("Done: Chase Tobi for a pick", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: /What is left/ })).toBeVisible();

    await reopen.click();
    await expect(page.getByRole("button", { name: "Tick off Chase Tobi for a pick" })).toBeVisible();
    await expect(page.getByText("Reopened: Chase Tobi for a pick", { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  }
});
