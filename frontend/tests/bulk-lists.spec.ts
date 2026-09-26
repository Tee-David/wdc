import { expect, test, type Page } from "@playwright/test";
import { sayYes } from "./say-yes";

/** The bulk bar on Support, Clients and Invoices: tick rows, act on them all, and the list says what happened. */
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
test.describe.configure({ mode: "serial", timeout: 120_000 });

async function asOwner(page: Page, baseURL?: string) {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" }]);
}

test("ticking questions brings up the bar; Close closes them all", async ({ page, baseURL }) => {
  await asOwner(page, baseURL);
  await page.goto("/admin/clients/support", { waitUntil: "networkidle" });
  const bar = page.getByRole("region", { name: "Selected questions" });
  await expect(bar).toHaveCount(0);
  const picks = page.locator("#tickets tbody .adRowPick");
  const n = Math.min(2, await picks.count());
  test.skip(n === 0, "No questions to act on.");
  for (let i = 0; i < n; i++) await picks.nth(i).check();
  await expect(bar).toContainText(`${n} selected`);
  await bar.getByRole("button", { name: "Close" }).click();
  await expect(page.locator(".adToast", { hasText: `${n} closed` })).toBeVisible({ timeout: 20_000 });
  await expect(bar).toHaveCount(0);

  /* And back, so the next run has open questions: select all, Reopen. */
  await page.getByRole("checkbox", { name: "Select every question" }).check();
  await page.getByRole("region", { name: "Selected questions" }).getByRole("button", { name: "Reopen" }).click();
  await expect(page.locator(".adToast", { hasText: "reopened" })).toBeVisible({ timeout: 20_000 });
});

test("invoices can be reminded in bulk, and the reply counts what went and what did not", async ({ page, baseURL }) => {
  await asOwner(page, baseURL);
  await page.goto("/admin/money", { waitUntil: "networkidle" });
  await sayYes(page);
  await page.locator("#invoices-table tbody .adRowPick").first().check();
  await page.getByRole("region", { name: "Selected invoices" }).getByRole("button", { name: "Send reminder" }).click();
  await expect(page.locator(".adToast").last()).toContainText(/reminded|None reminded/, { timeout: 30_000 });
});

test("projects move stage in bulk from More, each through the same stage move, and back", async ({ page, baseURL }) => {
  await asOwner(page, baseURL);
  await page.goto("/admin/projects?view=list", { waitUntil: "networkidle" });
  const rows = page.locator("#projects-table tbody tr");
  const first = rows.nth(0);
  /* The Stage column, the fifth: the title cell carries attention pills too. */
  const stageCell = first.locator("td").nth(4);
  const stageBefore = (await stageCell.innerText()).replace(/^[•\s]+/, "").trim();
  await first.locator(".adRowPick").check();
  const bar = page.getByRole("region", { name: "Selected projects" });
  await expect(bar).toContainText("1 selected");
  await sayYes(page);
  await bar.locator("summary", { hasText: "More" }).click();
  const target = stageBefore === "Discovery" ? "Revisions" : "Discovery";
  await bar.getByRole("button", { name: `Move to ${target}` }).click();
  await expect(page.locator(".adToast", { hasText: `1 moved to ${target}` })).toBeVisible({ timeout: 20_000 });
  await expect(stageCell).toContainText(target);

  /* Put it back through the same bar. */
  await first.locator(".adRowPick").check();
  await sayYes(page);
  await bar.locator("summary", { hasText: "More" }).click();
  await bar.getByRole("button", { name: `Move to ${stageBefore}` }).click();
  await expect(page.locator(".adToast", { hasText: `1 moved to ${stageBefore}` })).toBeVisible({ timeout: 20_000 });
});
