import { createHash, randomBytes, randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import pg from "pg";

/**
 * Invitations: an account for exactly the invited address, once, for a week.
 *
 * Needs the dev server under test started with COCKROACHDB_URL,
 * BETTER_AUTH_SECRET and BONEYARD_CAPTURE_TOKEN, and the same
 * COCKROACHDB_URL/BONEYARD_CAPTURE_TOKEN here, with migrations applied. Every
 * address it makes is under @example.test and removed afterwards.
 *
 * Run it against a freshly started server: redemption is rate limited to ten
 * per ten minutes per connection (lib/invite-redeem.ts), in that server's
 * memory, and two back-to-back runs spend that on purpose.
 */

const CONNECTION = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;

test.skip(!CONNECTION, "Needs a database: an invitation is a row.");
test.describe.configure({ mode: "serial", timeout: 120_000 });

const tag = randomUUID().slice(0, 8);
const addr = (who: string) => `wdc-inv-${tag}-${who}@example.test`;
let db: pg.Pool;

async function invite(email: string, opts: { role?: "client" | "staff"; expiredDays?: number } = {}) {
  const token = randomBytes(32).toString("base64url");
  await db.query(
    `INSERT INTO invitations (token_hash, email, name, role, invited_by, expires_at)
     VALUES ($1, $2, 'Ada Test', $3, 'E2E', now() + ($4 || ' days')::INTERVAL)`,
    [createHash("sha256").update(token).digest("hex"), email, opts.role ?? "client", String(opts.expiredDays ? -opts.expiredDays : 7)],
  );
  return token;
}

async function acceptWithPassword(page: Page, token: string, password: string) {
  await page.goto(`/invite/${token}`, { waitUntil: "networkidle" });
  await page.getByLabel("Choose a password").fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create my account" }).click();
}

test.beforeAll(async () => {
  const url = new URL(CONNECTION!);
  url.searchParams.delete("sslmode");
  const ca = process.env.COCKROACHDB_CERT?.replace(/\\n/g, "\n");
  db = new pg.Pool({ connectionString: url.toString(), ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) }, max: 2 });
});

test.afterAll(async () => {
  await db?.query(`DELETE FROM "user" WHERE "email" LIKE $1`, [`wdc-inv-${tag}-%`]);
  await db?.query(`DELETE FROM invitations WHERE email LIKE $1 OR email = 'tobi@mooredesigns.ng'`, [`wdc-inv-${tag}-%`]);
  await db?.end();
});

test("the page names the invited address and has no field to change it", async ({ page }) => {
  const email = addr("show");
  const token = await invite(email);
  await page.goto(`/invite/${token}`, { waitUntil: "load" });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your project portal", { timeout: 30_000 });
  await expect(page.getByText(email)).toBeVisible();
  await expect(page.locator('input[type="email"], input[name="email"]')).toHaveCount(0);
});

test("a weak password is refused on the page, and Suggest one makes a strong one", async ({ page }) => {
  const email = addr("rule");
  const token = await invite(email);
  await page.goto(`/invite/${token}`, { waitUntil: "networkidle" });
  await page.getByLabel("Choose a password").fill("longbutweak");
  await page.getByLabel("Confirm password").fill("longbutweak");
  /* The button stays asleep while the rule is unmet; Enter still submits, and the form says why. */
  await expect(page.getByRole("button", { name: "Create my account" })).toHaveAttribute("aria-disabled", "true");
  await page.getByLabel("Confirm password").press("Enter");
  await expect(page.getByText("Add a capital, a number and a symbol.")).toBeVisible();
  expect((await db.query(`SELECT redeemed_at FROM invitations WHERE email = $1`, [email])).rows[0].redeemed_at).toBeNull();
  await page.getByRole("button", { name: "Suggest one" }).click();
  const made = await page.getByLabel("Choose a password").inputValue();
  expect(made).toMatch(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z\d]).{16}$/);
  expect(await page.getByLabel("Confirm password").inputValue()).toBe(made);
  await expect(page.locator(".au-meter")).toHaveAttribute("data-bars", "4");
});

test("accepting makes a verified account for that address, signs in, and spends the link", async ({ page }) => {
  const email = addr("accept");
  const token = await invite(email);
  await acceptWithPassword(page, token, "A-long-enough-passw0rd");
  await page.waitForURL((u) => !u.pathname.startsWith("/invite/"), { timeout: 30_000 });
  await page.waitForLoadState("networkidle");

  const user = await db.query(`SELECT "id", "role", "emailVerified", "name" FROM "user" WHERE "email" = $1`, [email]);
  expect(user.rows[0]).toMatchObject({ role: "client", emailVerified: true, name: "Ada Test" });
  const cred = await db.query(`SELECT 1 FROM "account" WHERE "userId" = $1 AND "providerId" = 'credential'`, [user.rows[0].id]);
  expect(cred.rowCount).toBe(1);
  const inv = await db.query(`SELECT redeemed_at, redeemed_user_id FROM invitations WHERE email = $1`, [email]);
  expect(inv.rows[0].redeemed_at).not.toBeNull();
  expect(inv.rows[0].redeemed_user_id).toBe(user.rows[0].id);
  const sessions = await db.query(`SELECT 1 FROM "session" WHERE "userId" = $1`, [user.rows[0].id]);
  expect(sessions.rowCount, "signed straight in").toBeGreaterThan(0);

  /* The same link again, in a fresh browser: spent. */
  await page.context().clearCookies();
  await page.goto(`/invite/${token}`, { waitUntil: "load" });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("This invitation has been used");
});

test("two tabs racing the same link make one account", async ({ browser }) => {
  const email = addr("race");
  const token = await invite(email);
  const [a, b] = await Promise.all([browser.newPage(), browser.newPage()]);
  await Promise.all([a.goto(`/invite/${token}`, { waitUntil: "networkidle" }), b.goto(`/invite/${token}`, { waitUntil: "networkidle" })]);
  for (const p of [a, b]) {
    await p.getByLabel("Choose a password").fill("A-long-enough-passw0rd");
    await p.getByLabel("Confirm password").fill("A-long-enough-passw0rd");
  }
  await Promise.all([a, b].map((p) => p.getByRole("button", { name: "Create my account" }).click()));
  await expect.poll(async () => (await db.query(`SELECT redeemed_at FROM invitations WHERE email = $1`, [email])).rows[0].redeemed_at, { timeout: 30_000 }).not.toBeNull();
  const users = await db.query(`SELECT 1 FROM "user" WHERE "email" = $1`, [email]);
  expect(users.rowCount).toBe(1);
  await Promise.all([a.close(), b.close()]);
});

test("an expired link says so and makes nothing", async ({ page }) => {
  const email = addr("expired");
  const token = await invite(email, { expiredDays: 1 });
  await page.goto(`/invite/${token}`, { waitUntil: "load" });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("This invitation has expired");
  expect((await db.query(`SELECT 1 FROM "user" WHERE "email" = $1`, [email])).rowCount).toBe(0);
});

test("an address that already has an account is not taken over", async ({ page }) => {
  const email = addr("exists");
  await db.query(`INSERT INTO "user" ("id", "name", "email", "emailVerified", "role") VALUES ($1, 'Already', $2, true, 'client')`, [randomUUID(), email]);
  const token = await invite(email, { role: "staff" });
  await acceptWithPassword(page, token, "A-long-enough-passw0rd");
  await expect(page.locator(".au__error")).toContainText("already an account", { timeout: 15_000 });
  const u = await db.query(`SELECT "role" FROM "user" WHERE "email" = $1`, [email]);
  expect(u.rows[0].role, "the invitation did not promote the existing account").toBe("client");
  expect((await db.query(`SELECT redeemed_at FROM invitations WHERE email = $1`, [email])).rows[0].redeemed_at).toBeNull();
});

test("a made-up token is refused without a database hit worth having", async ({ page }) => {
  await page.goto(`/invite/${randomBytes(32).toString("base64url")}`, { waitUntil: "load" });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("This link is not valid");
});

test.describe("from the admin", () => {
  test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");

  test("inviting a client binds the invitation to their record and address", async ({ page }) => {
    await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
    await db.query(`DELETE FROM invitations WHERE email = 'tobi@mooredesigns.ng'`);
    await page.goto("/admin/clients/c1", { waitUntil: "networkidle" });
    const panel = page.locator("section.ad__panel", { has: page.getByRole("heading", { name: "Portal access" }) });
    await expect(panel).toBeVisible({ timeout: 30_000 });
    await panel.getByRole("button", { name: "Invite to the portal" }).click();
    /* The panel's new state is the confirmation; the button's message goes with the button. */
    await expect(panel.getByRole("status").filter({ hasText: "by WDC Admin; the link works until" })).toBeVisible({ timeout: 15_000 });

    const row = await db.query(`SELECT role, client_id, invited_by, token_hash FROM invitations WHERE email = 'tobi@mooredesigns.ng' AND revoked_at IS NULL`);
    expect(row.rows[0]).toMatchObject({ role: "client", client_id: "c1", invited_by: "WDC Admin" });
    expect(row.rows[0].token_hash).toMatch(/^[0-9a-f]{64}$/);

    page.on("dialog", (d) => d.accept());
    await panel.getByRole("button", { name: "Withdraw" }).click();
    await expect(panel.getByRole("status").filter({ hasText: "The last invitation was withdrawn." })).toBeVisible({ timeout: 15_000 });
    const revoked = await db.query(`SELECT revoked_by FROM invitations WHERE email = 'tobi@mooredesigns.ng'`);
    expect(revoked.rows[0].revoked_by).toBe("WDC Admin");
  });
});
