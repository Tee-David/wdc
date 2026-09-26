import type { Page } from "@playwright/test";

/**
 * Answer yes to the admin's confirm dialog (components/admin/confirm.tsx)
 * whenever it opens, ticking "I understand" when it asks for that.
 *
 * Confirmations used to be the browser's `window.confirm`, which the specs
 * accepted with `page.on("dialog")`. They are the admin's own dialog now, so
 * that listener never fires and the press waits forever. A locator handler
 * runs before any action or auto-waiting assertion while the dialog is up,
 * which is the same "whenever it appears" the old listener gave.
 */
const armed = new WeakSet<Page>();

export async function sayYes(page: Page) {
  /* Once per page: a spec that used to accept before each press calls this
     more than once, and one handler already covers every press. */
  if (armed.has(page)) return;
  armed.add(page);
  await page.addLocatorHandler(page.locator(".adAsk"), async (ask) => {
    const sure = ask.getByRole("checkbox");
    if (await sure.count()) await sure.check();
    await ask.locator(".adAsk__acts button").last().click();
  });
}
