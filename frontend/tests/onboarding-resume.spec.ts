import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import pg from "pg";

/**
 * A RETURNING CLIENT IS NEVER LEFT AT A BLANK FORM (the empty-states audit,
 * D1 and D2). A resume link already used offers a fresh one; a link to a brief
 * already sent says so and offers a new brief, and "Start a new brief" really
 * lets go of the old draft instead of autosaving into it.
 */
const CONNECTION = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
test.skip(!CONNECTION, "Needs a database.");
test.describe.configure({ mode: "serial", timeout: 120_000 });

let db: pg.Pool;
test.beforeAll(() => {
  const url = new URL(CONNECTION!);
  url.searchParams.delete("sslmode");
  db = new pg.Pool({ connectionString: url.toString(), ssl: { rejectUnauthorized: false }, max: 2 });
});
test.afterAll(async () => { await db.end(); });

/** A saved draft and a resume link to it, made the way the form makes them. */
async function draftWithLink(baseURL: string, request: import("@playwright/test").APIRequestContext) {
  const r = await request.post("/api/onboarding/draft", {
    headers: { origin: baseURL },
    data: { service: "web", currentStep: 1, answers: { business_name: `Resume test ${randomUUID().slice(0, 6)}` }, rotateLink: true },
  });
  expect(r.ok(), await r.text()).toBeTruthy();
  const body = await r.json();
  expect(body.resumeUrl).toContain("resume=");
  return new URL(body.resumeUrl).searchParams.get("resume")!;
}

test("a resume link opened a second time offers to send a fresh one", async ({ browser, request, baseURL }) => {
  const token = await draftWithLink(baseURL!, request);
  const first = await browser.newContext();
  await (await first.newPage()).goto(`/onboarding?resume=${token}`, { waitUntil: "networkidle" });
  await first.close();

  const second = await browser.newContext();
  const page = await second.newPage();
  await page.goto(`/onboarding?resume=${token}`, { waitUntil: "networkidle" });
  const notice = page.locator(".ob__notice");
  await expect(notice).toContainText("already been used");
  await notice.getByRole("textbox", { name: "The email address you used" }).fill("someone@example.com");
  await notice.getByRole("button", { name: "Send me a new link" }).click();
  await expect(notice.locator(".ob__saved")).toContainText("If that address has an unfinished form");
  await second.close();
});

test("a link to a brief already sent says so, and Start a new brief lets go of it", async ({ browser, request, baseURL }) => {
  const token = await draftWithLink(baseURL!, request);
  await db.query(`UPDATE onboarding_submissions SET status = 'submitted' WHERE id = (SELECT submission_id FROM onboarding_resume_tokens WHERE token_hash = encode(sha256($1::bytea), 'hex'))`, [token]);
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`/onboarding?resume=${token}`, { waitUntil: "networkidle" });
  const notice = page.locator(".ob__notice");
  await expect(notice).toContainText("This brief was already sent.");
  await notice.getByRole("button", { name: "Start a new brief" }).click();
  await expect(page.locator(".ob__notice")).toHaveCount(0);
  /* The browser has let go of the sent draft: nothing is restored on reload. */
  await expect.poll(async () => (await ctx.cookies()).some((c) => c.name.includes("onboarding") && c.value)).toBe(false);
  await ctx.close();
});
