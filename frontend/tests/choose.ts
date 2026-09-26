import type { Locator } from "@playwright/test";

/**
 * Pick a value in one of the admin's own selects (components/admin/pick.tsx),
 * the way `selectOption` picks one in a native select: open it, then click
 * the option that posts that value.
 */
export async function choose(trigger: Locator, value: string) {
  await trigger.click();
  await trigger.page().locator(`.adPick__pop [role="option"][data-value="${value}"]`).click();
}

/**
 * Pick a day in the admin's calendar (DateInput in pick.tsx), the way `fill`
 * typed one into a native date input: open it, page to the month, click it.
 */
export async function pickDate(trigger: Locator, iso: string) {
  await trigger.click();
  const pop = trigger.page().locator(".adPick__pop.adCal");
  for (let i = 0; i < 36; i++) {
    const day = pop.locator(`[data-iso="${iso}"]`);
    if (await day.count()) { await day.click(); return; }
    const shown = await pop.locator("[data-iso]").first().getAttribute("data-iso");
    await pop.getByRole("button", { name: (shown ?? "") < iso ? "Next month" : "Previous month" }).click();
  }
  throw new Error(`No ${iso} within three years of the calendar's month.`);
}
