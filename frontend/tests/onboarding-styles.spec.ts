import { expect, test, type Page } from "@playwright/test";

/**
 * THE ONBOARDING FORM'S STYLE IS THE STUDIO'S CHOICE (Forms, the form,
 * Settings). Outside production `?style=` previews each one. Same questions,
 * same checks, different layout: the steps style is covered by the other
 * onboarding specs, so these two pin the new ones.
 */
const start = async (page: Page, style: string) => {
  await page.addInitScript(() => { try { localStorage.removeItem("wdc-onboarding-draft"); localStorage.setItem("wdc-intro-seen-at", String(Date.now())); } catch { /* private mode */ } });
  await page.goto(`/onboarding?style=${style}`, { waitUntil: "load" });
  await page.getByRole("button", { name: /^Web/ }).first().click();
  await page.getByRole("button", { name: /^Start$/ }).click();
};

test("conversation: one or two questions at a time, Enter continues, Back keeps answers", async ({ page }) => {
  await start(page, "conversation");
  const fields = page.locator(".ob--talk .ob__fields [data-field]");
  /* The first and last name share a screen; nothing else is on it. */
  await expect(fields).toHaveCount(2);

  await page.getByRole("button", { name: /^Next/ }).click();
  await expect(page.locator(".ob--talk .ob__err")).toBeVisible();
  await expect(fields).toHaveCount(2);

  await page.getByLabel(/first name/i).first().fill("Ada");
  await page.getByLabel(/last name/i).first().fill("Obi");
  await page.getByLabel(/last name/i).first().press("Enter");
  await expect(page.getByLabel(/first name/i)).toHaveCount(0);
  const n = await fields.count();
  expect(n).toBeGreaterThan(0);
  expect(n).toBeLessThanOrEqual(2);

  await page.getByRole("button", { name: /Back/ }).click();
  await expect(page.getByLabel(/first name/i).first()).toHaveValue("Ada");
});

test("board: sections as cards, opened in any order, Review waits for the required ones", async ({ page }) => {
  await start(page, "board");
  const cards = page.locator(".obb__card");
  expect(await cards.count()).toBeGreaterThan(3);
  await expect(page.locator(".obb__card.is-open")).toHaveCount(1);

  /* Any card can be opened, and the field list follows it. */
  await page.locator(".obb__head").nth(1).click();
  await expect(page.locator(".obb__card.is-open .obb__head")).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".obb__card.is-open [data-field]").first()).toBeVisible();

  /* Nothing is finished, so Review is not available. */
  await expect(page.getByRole("button", { name: /^Review and send/ }).last()).toBeDisabled();
});
