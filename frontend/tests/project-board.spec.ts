import { expect, test, type Page } from "@playwright/test";

/**
 * THE PROJECTS BOARD MOVES: a card dragged with the mouse lands in the other
 * column and stays there after a reload; the keyboard does the same with the
 * grip, the arrows and Enter; Escape puts it back.
 */

const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
test.describe.configure({ mode: "serial", timeout: 120_000 });

async function asOwner(page: Page, baseURL?: string) {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" }]);
}

const col = (page: Page, stage: string) => page.locator(`[data-stage="${stage}"]`);

test("a card dragged with the mouse changes stage, and stays there", async ({ page, baseURL }) => {
  await asOwner(page, baseURL);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto("/admin/projects?view=board", { waitUntil: "networkidle" });
  const card = col(page, "Discovery").locator("[data-card]").first();
  await expect(card).toBeVisible();
  const id = await card.getAttribute("data-card");
  const title = (await card.locator(".ad__kcardTitle").textContent())!.trim();

  const from = (await card.locator(".ad__kcardTitle").boundingBox())!;
  const to = (await col(page, "In progress").boundingBox())!;
  await page.mouse.move(from.x + 10, from.y + 5);
  await page.mouse.down();
  await page.mouse.move(from.x + 30, from.y + 20, { steps: 4 });
  await expect(page.locator(".ad__kghost")).toBeVisible();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height - 20, { steps: 12 });
  await expect(col(page, "In progress").locator(`[data-card="${id}"]`)).toHaveCount(1);
  await page.mouse.up();
  await expect(page.locator(".adToast", { hasText: "Moved to In progress" })).toBeVisible({ timeout: 20_000 });
  await expect(page).toHaveURL(/view=board/);

  await page.reload({ waitUntil: "networkidle" });
  await expect(col(page, "In progress").getByText(title)).toBeVisible();

  /* And back, with the keyboard. */
  const grip = page.getByRole("button", { name: `Move ${title}` });
  await grip.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowLeft");
  await expect(col(page, "Discovery").locator(`[data-card="${id}"]`)).toHaveCount(1);
  await page.keyboard.press("Enter");
  await expect(page.locator(".adToast", { hasText: "Moved to Discovery" })).toBeVisible({ timeout: 20_000 });
});

test("Escape puts a card back where it was", async ({ page, baseURL }) => {
  await asOwner(page, baseURL);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto("/admin/projects?view=board", { waitUntil: "networkidle" });
  const card = col(page, "Discovery").locator("[data-card]").first();
  const id = await card.getAttribute("data-card");
  const title = (await card.locator(".ad__kcardTitle").textContent())!.trim();
  await page.getByRole("button", { name: `Move ${title}` }).focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await expect(col(page, "In progress").locator(`[data-card="${id}"]`)).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(col(page, "Discovery").locator(`[data-card="${id}"]`)).toHaveCount(1);
});
