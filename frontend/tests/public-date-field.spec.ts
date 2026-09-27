import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import pg from "pg";
import { pickDate } from "./choose";

/**
 * A built form's Date question uses the site's own calendar (the admin's
 * DateInput in the public skin), not the browser's native picker, and what
 * it posts is the YYYY-MM-DD the server checks for.
 */
const CONNECTION = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
test.skip(!CONNECTION, "Needs a database.");
test.describe.configure({ mode: "serial", timeout: 120_000 });

const TAG = randomUUID().slice(0, 6);
const KEY = `form-date-${TAG}`;
const SLUG = `date-${TAG}`;
let db: pg.Pool;

test.beforeAll(async () => {
  const url = new URL(CONNECTION!);
  url.searchParams.delete("sslmode");
  db = new pg.Pool({ connectionString: url.toString(), max: 2 });
  const def = {
    title: "Pick a day", intro: "", submitLabel: "Send", successMessage: "Thanks, we have your date.",
    fields: [
      { id: "name", type: "text", label: "Your name", required: true },
      { id: "email", type: "email", label: "Email", required: true },
      { id: "day", type: "date", label: "Which day suits you?", required: true },
    ],
  };
  await db.query("INSERT INTO custom_forms (key, slug, draft, created_by) VALUES ($1, $2, $3::JSONB, 'test')", [KEY, SLUG, JSON.stringify(def)]);
  await db.query("INSERT INTO custom_form_versions (form_key, version, definition, published_by) VALUES ($1, 1, $2::JSONB, 'test')", [KEY, JSON.stringify(def)]);
  await db.query("UPDATE custom_forms SET published = draft, version = 1, status = 'live', published_at = now() WHERE key = $1", [KEY]);
});
test.afterAll(async () => {
  await db.query("DELETE FROM custom_entries WHERE form_key = $1", [KEY]).catch(() => undefined);
  await db.query("DELETE FROM custom_form_versions WHERE form_key = $1", [KEY]);
  await db.query("DELETE FROM custom_forms WHERE key = $1", [KEY]);
  await db.end();
});

for (const theme of ["light", "dark"] as const) {
  test(`the Date question opens our calendar and sends the day (${theme})`, async ({ page }) => {
    await page.addInitScript((t) => { try { localStorage.setItem("theme", t); } catch { /* private window */ } }, theme);
    await page.goto(`/f/${SLUG}`, { waitUntil: "networkidle" });
    await expect(page.locator('input[type="date"]')).toHaveCount(0);
    const form = page.locator("form", { has: page.locator('[data-pick-skin="public"]') });
    await form.getByLabel("Your name").fill("Ada Eze");
    await form.getByLabel(/^Email/).fill(`date-${TAG}@example.com`);
    const trigger = page.locator('[data-pick-skin="public"] .adPick__btn');
    await expect(trigger).toBeVisible();

    await trigger.click();
    const pop = page.locator(".adPick__pop.adCal.adPick--public");
    await expect(pop).toBeVisible();
    /* The popover is drawn in the site's colours, solid. */
    const bg = await pop.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).not.toMatch(/rgba\(.*, 0\)|transparent/);
    expect(bg).toBe(theme === "dark" ? "rgb(3, 3, 24)" : "rgb(255, 255, 255)");
    expect((await pop.boundingBox())!.width).toBeLessThanOrEqual(353);
    await page.waitForTimeout(1_500);
    const box = (await pop.boundingBox())!;
    const tb = (await trigger.boundingBox())!;
    await page.screenshot({ path: `test-results/public-date-${theme}.png`, clip: { x: Math.max(0, tb.x - 40), y: Math.max(0, Math.min(tb.y, box.y) - 60), width: Math.max(box.width, tb.width) + 80, height: box.height + tb.height + 120 } });
    await page.keyboard.press("Escape");

    await pickDate(trigger, "2027-02-14");
    await expect(trigger).toContainText("14 Feb 2027");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.getByText("Thanks, we have your date.")).toBeVisible({ timeout: 15_000 });
    const row = (await db.query<{ answers: Record<string, string> }>("SELECT answers FROM custom_entries WHERE form_key = $1 ORDER BY created_at DESC LIMIT 1", [KEY])).rows[0];
    expect(row.answers.day).toBe("2027-02-14");
    await db.query("DELETE FROM custom_entries WHERE form_key = $1", [KEY]);
  });
}
