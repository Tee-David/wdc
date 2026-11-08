import { expect, test } from "@playwright/test";

const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
test.skip(!TOKEN, "Needs capture token on the development server.");
test.setTimeout(180_000);

test("owner project settlement stays inside the viewport in both themes", async ({ page, baseURL }) => {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN! });
  await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL! }]);
  await page.goto("/admin/projects", { waitUntil: "domcontentloaded" });
  const trigger = page.getByRole("button", { name: /^Actions for / }).first();
  await expect(trigger).toBeVisible({ timeout: 90_000 });
  for (const theme of ["light", "dark"]) {
    await page.evaluate((t) => { localStorage.setItem("theme", t); document.documentElement.classList.toggle("dark", t === "dark"); }, theme);
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await trigger.click();
      await page.getByRole("button", { name: "Manually settle payment", exact: true }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      const box = await dialog.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
      await expect(dialog.getByText(/Only settle money you have received|No issued invoice/)).toBeVisible();
      await page.screenshot({ path: `test-results/project-settlement-${theme}-${width}.png` });
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
    }
  }
});

test("staff project menu offers no settlement action", async ({ page, baseURL }) => {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN!, "x-boneyard-capture-role": "staff" });
  await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL! }]);
  await page.goto("/admin/projects", { waitUntil: "domcontentloaded" });
  const trigger = page.getByRole("button", { name: /^Actions for / }).first();
  await expect(trigger).toBeVisible({ timeout: 90_000 });
  await trigger.click();
  await expect(page.getByRole("button", { name: "Manually settle payment", exact: true })).toHaveCount(0);
});
