import { expect, test, type Page } from "@playwright/test";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

/**
 * SIGNING IN, BEING TURNED AWAY, SIGNING OUT, AND FORGETTING A PASSWORD.
 *
 * These are the four things every account on this site does, and none of them
 * had a test. Each assertion below is a failure this flow can have without
 * looking broken:
 *
 *   a protected route that renders for somebody with no session;
 *   a login form that says WHICH half of the credential was wrong, turning it
 *   into a way of finding out who has an account;
 *   a valid session that is not an owner walking into /admin -- the exact
 *   thing the role table exists to prevent;
 *   a sign-out that clears the screen but not the cookie;
 *   a reset request that holds the response open for the 23 seconds this mail
 *   server takes to authenticate, and times out in front of the person.
 *
 * WHAT IT NEEDS. A dev server with the real database, because a session is a
 * row and there is no honest way to fake one. The spec creates its own
 * throwaway account, with the LEAST role there is, and deletes it afterwards;
 * it never touches the owner. Without database credentials it skips, the same
 * way admin-actions.spec.ts skips without its capture token.
 *
 *   node <scratch>/smtp-sink.mjs
 *   SMTP_HOST=127.0.0.1 SMTP_PORT=1025 SMTP_SECURE=false \
 *   BETTER_AUTH_URL=http://localhost:3100 npx next dev -p 3100
 *   npx playwright test tests/auth-flow.spec.ts
 *
 * The SMTP override matters: without it the reset mail is handed to the live
 * server, which is slow, scores outbound content, and has no mailbox at the
 * address this spec invents. The sink accepts it and writes it to a file.
 */

const CONNECTION = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;

test.describe.configure({ mode: "serial", timeout: 120_000 });
test.skip(!CONNECTION, "Needs DATABASE_URL or COCKROACHDB_URL: a session is a database row.");

/* Namespaced and obviously disposable, so a row that survives a crashed run is
   recognisable as this spec's litter rather than somebody's account. */
const EMAIL = `wdc-e2e-${randomUUID().slice(0, 8)}@wedigcreativity.com.ng`;
const PASSWORD = `e2e-${randomUUID()}`;
const NEW_PASSWORD = `e2e-${randomUUID()}`;

function pool() {
  const url = new URL(CONNECTION!);
  url.searchParams.delete("sslmode");
  /* The same certificate resolution lib/db/pool.ts uses: the configured PEM,
     or the one `cockroach cert` leaves in APPDATA on this machine. */
  const configured = process.env.COCKROACHDB_CERT || "";
  const local = process.env.APPDATA ? path.join(process.env.APPDATA, "postgresql", "root.crt") : "";
  const ca = configured.startsWith("-----BEGIN CERTIFICATE-----")
    ? configured.replace(/\\n/g, "\n")
    : local && fs.existsSync(local) ? fs.readFileSync(local, "utf8") : undefined;
  return new pg.Pool({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
    max: 2,
    /* Generous, and measured: the first connection to the cluster from a cold
       process timed out at 15 seconds while the same query took milliseconds
       once it was awake. A test that fails because a serverless database was
       asleep has told us nothing about the code. */
    connectionTimeoutMillis: 40_000,
  });
}

const db = pool();
let userId = "";

/** Retries the first statement of the run, which is the one that wakes the cluster. */
async function query<R extends pg.QueryResultRow>(sql: string, values: unknown[] = []) {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.query<R>(sql, values);
    } catch (error) {
      last = error;
      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
  }
  throw last;
}

/**
 * THE FIRST REQUEST OF A DEV SERVER'S LIFE IS NOT A MEASUREMENT.
 *
 * Cockroach Cloud's first connection from a cold process took longer than the
 * 10-second ceiling lib/db/pool.ts sets on it, so the very first /login render
 * answered 500 and the first assertion in this file failed on a database that
 * was working perfectly two seconds later. Warm it before anything is timed,
 * and fail with a sentence rather than a stray 500 if it never comes up.
 */
async function warmUp(baseURL: string) {
  let ready = false;
  for (let attempt = 0; attempt < 20 && !ready; attempt += 1) {
    try {
      ready = (await fetch(`${baseURL}/login`, { redirect: "manual" })).ok;
    } catch {
      /* Server not listening yet. */
    }
    if (!ready) await new Promise((resolve) => setTimeout(resolve, 3_000));
  }
  if (!ready) throw new Error("the dev server never served /login successfully");

  /* And compile the rest before anything is timed. In dev, /signed-in was
     still being built when the sign-in that redirects to it had already
     succeeded, so a 30-second navigation wait expired on a Turbopack compile
     rather than on anything this spec is about. */
  await Promise.all(
    ["/", "/signed-in", "/forgot-password", "/reset-password", "/admin"].map((path) =>
      fetch(`${baseURL}${path}`, { redirect: "manual" }).catch(() => undefined),
    ),
  );
}

test.beforeAll(async ({ baseURL }) => {
  /* `describe.configure` sets the TEST timeout; a hook keeps the file default,
     and 30 seconds is not enough to compile five routes on a cold dev server
     and wake a sleeping database. */
  test.setTimeout(240_000);
  await warmUp(baseURL ?? "http://localhost:3100");
  userId = randomUUID();
  const hashed = await hashPassword(PASSWORD);
  /* `emailVerified` true because Better Auth's account-linking rules read it,
     and because this account did not arrive through a form. `role` is left to
     the column default, which 0003_role_default_client.sql makes 'client' --
     so this row also proves the least-access default is what it claims. */
  await query(
    'INSERT INTO "user" ("id", "name", "email", "emailVerified") VALUES ($1,$2,$3,true)',
    [userId, "End To End", EMAIL],
  );
  await query(
    'INSERT INTO "account" ("id","accountId","providerId","userId","password") VALUES ($1,$2,$3,$4,$5)',
    [randomUUID(), userId, "credential", userId, hashed],
  );
});

/* The chat agent and the accessibility widget are third parties with nothing
   to say about signing in, and `waitForURL` defaults to waiting for `load` --
   which a page still fetching either of them may never reach. Blocked here
   for the same reason button-colours.spec.ts blocks them. */
test.beforeEach(async ({ page }) => {
  await page.route(/jotfor|userway/i, (route) => route.abort());
});

test.afterAll(async () => {
  if (userId) {
    /* `session` and `account` cascade from `user`; the reset tokens do not,
       because `verification` is keyed by a string rather than a user id. */
    await db.query('DELETE FROM "verification" WHERE "value" = $1', [userId]);
    await db.query('DELETE FROM "user" WHERE "id" = $1', [userId]);
    await db.query("DELETE FROM tour_progress WHERE user_id = $1", [userId]).catch(() => undefined);
  }
  await db.end();
});

/**
 * Presses the button only once it can do anything.
 *
 * The submit is disabled until the component hydrates -- see
 * components/auth/use-hydrated.ts for the leak that stops. Playwright's
 * actionability check waits for exactly that, so `submit()` is also the spec's
 * way of not racing the page.
 */
const submit = async (page: Page, name: string) => {
  const button = page.getByRole("button", { name });
  await expect(button).toBeEnabled({ timeout: 30_000 });
  await button.click();
};

const signIn = async (page: Page, email: string, password: string) => {
  /* WAIT FIRST, THEN TYPE. These are controlled inputs, so a value written
     before React attaches is reconciled away the instant it hydrates -- the
     email field came back empty and the sign-in failed for a reason that had
     nothing to do with the password. The submit button becoming enabled is the
     signal that hydration has happened. */
  await expect(page.getByRole("button", { name: "Log in" })).toBeEnabled({ timeout: 30_000 });
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await submit(page, "Log in");
};

const sessionCookie = async (page: Page) =>
  (await page.context().cookies()).find((c) => c.name.startsWith("wdc.session_token"));

/**
 * The form's own error line.
 *
 * BY CLASS, NOT BY ROLE, and that cost a run to find out: Next's dev-mode
 * route announcer is an empty element with `role="alert"`, so `getByRole` was
 * satisfied by it and read the empty string off a form that had not answered
 * yet. The role is still asserted below -- it is what makes the message reach
 * a screen reader -- it is just not how the element is found.
 */
const errorLine = (page: Page) => page.locator("p.au__error");

const errorText = async (page: Page) => {
  const line = errorLine(page);
  await expect(line).toBeVisible({ timeout: 30_000 });
  await expect(line).toHaveAttribute("role", "alert");
  return (await line.textContent())?.trim() ?? "";
};

test("a protected route with no session goes to the login page, carrying where it was going", async ({ page }) => {
  await page.goto("/admin/projects", { waitUntil: "domcontentloaded" });

  const url = new URL(page.url());
  expect(url.pathname).toBe("/login");
  expect(url.searchParams.get("redirect")).toBe("/admin/projects");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

/**
 * THE REGRESSION THIS SUITE ACTUALLY CAUGHT.
 *
 * Filling and submitting the form faster than the page could hydrate sent the
 * browser to `/login?email=...&password=...` -- a GET, because a `<form>` with
 * no method and no handler yet does exactly that. The password then lives in
 * the browser's history, in the `Referer` of the next request, and in every
 * access log on the way. Asserted against the SERVER-RENDERED html, because
 * that is the document the gap exists in.
 */
for (const path of ["/login", "/forgot-password", "/reset-password"]) {
  test(`${path} cannot put a credential in a URL before it hydrates`, async ({ request }) => {
    const html = await (await request.get(path)).text();
    const forms = [...html.matchAll(/<form\b[^>]*class="au__form"[^>]*>/g)].map((m) => m[0]);
    expect(forms.length, `${path} renders no form`).toBeGreaterThan(0);
    for (const form of forms) expect(form, `${path}: ${form}`).toContain('method="post"');
    /* And it does not get that far: the submit is disabled in the markup the
       server sends, and enabled by the effect that runs once React is live. */
    expect(html).toMatch(/class="au__submit"[^>]*\bdisabled\b/);
  });
}

/**
 * A REFUSED GOOGLE SIGN-IN HAS TO SAY SO.
 *
 * lib/auth-google.ts decides who gets in and tests/google-admission.spec.ts
 * proves the decision; this is the other half, and it is the half the person
 * experiences. Better Auth returns a refusal by redirecting to the error URL
 * with `?error=<code>`, which lands them back on a login form that looks
 * EXACTLY as it did before they pressed the button. Without the map in
 * login-form.tsx that reads as the button being broken, and the honest answer
 * -- "that account is not one of ours" -- is never said out loud.
 */
for (const [code, expected] of [
  ["not_approved", /not connected to a We Dig Creativity account/i],
  ["signup_disabled", /not connected to a We Dig Creativity account/i],
  ["account_not_linked", /not connected to a We Dig Creativity account/i],
  ["verification_unavailable", /could not check that account/i],
  ["email_required", /did not share an email address/i],
  /* An unknown code still has to produce a sentence rather than silence. */
  ["something_new_from_better_auth", /did not complete/i],
] as const) {
  test(`a Google refusal of "${code}" is explained on the login form`, async ({ page }) => {
    await page.goto(`/login?error=${code}`, { waitUntil: "domcontentloaded" });
    await expect(errorLine(page)).toContainText(expected, { timeout: 30_000 });
    await expect(errorLine(page)).toHaveAttribute("role", "alert");
  });
}

test("a wrong password and an unknown address give the same answer", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await signIn(page, EMAIL, "not-the-password-at-all");
  const wrongPassword = await errorText(page);

  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await signIn(page, `nobody-${randomUUID().slice(0, 8)}@wedigcreativity.com.ng`, "not-the-password-at-all");
  const noAccount = await errorText(page);

  expect(wrongPassword).toBeTruthy();
  /* Identical, on purpose: two different messages would answer "does this
     person have an account here?" for anybody who asked. */
  expect(noAccount).toBe(wrongPassword);
  expect(new URL(page.url()).pathname).toBe("/login");
  expect(await sessionCookie(page)).toBeUndefined();
});

test("a correct password signs in and lands on the page that decides where to go", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await signIn(page, EMAIL, PASSWORD);

  /* This account is a client, so /signed-in sends them on to the portal,
     which is their door now that it is built -- not to a 404 and never to
     the admin. It used to stop on /signed-in, when the portal did not exist. */
  await page.waitForURL((url) => url.pathname === "/portal", { timeout: 30_000, waitUntil: "domcontentloaded" });
  await expect(page.locator(".ad")).toBeVisible();
  expect(await sessionCookie(page)).toBeTruthy();
});

test("a valid session that is not an owner still cannot reach the admin", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await signIn(page, EMAIL, PASSWORD);
  await page.waitForURL((url) => url.pathname === "/portal", { timeout: 30_000, waitUntil: "domcontentloaded" });
  expect(await sessionCookie(page)).toBeTruthy();

  await page.goto("/admin", { waitUntil: "domcontentloaded" });
  /* The cookie gets past the middleware, which only checks that one exists.
     The layout reads the role and turns them round, and `safeDestination`
     refuses to honour ?redirect=/admin for a role whose door is not /admin --
     so they end up on their own page, not on somebody else's. */
  expect(new URL(page.url()).pathname).toMatch(/^\/(login|signed-in|portal)$/);
  /* The admin's own navigation, not `.ad`: the portal shares the admin's
     design system and its root class. */
  await expect(page.getByRole("navigation", { name: "Admin sections" })).toHaveCount(0);

  /* AND THE SAME REFUSAL WHEN THE PATH IS HANDED IN RATHER THAN WALKED TO.
     /signed-in is the only page allowed to spend a ?redirect=, and it runs it
     past `safeDestination` first. A client asking to be forwarded into the
     admin is not forwarded: the open redirect and the privilege escalation are
     the same bug, and this is the assertion that catches either.

     Reusing the session established above on purpose. Every sign-in in this
     file counts against the real twenty-per-five-minutes limiter in
     lib/auth.ts, and a suite that trips its own rate limit fails for a reason
     that has nothing to do with the code -- which is exactly what happened
     when this started life as a test with a sign-in of its own. */
  const site = new URL(page.url()).origin;

  /* A client's door is the portal, so a refused redirect lands there. */
  await page.goto("/signed-in?redirect=%2Fadmin%2Fprojects", { waitUntil: "domcontentloaded" });
  expect(new URL(page.url()).pathname).toBe("/portal");

  /* A protocol-relative path is the other half of the same question: it starts
     with a slash, so a careless check calls it relative, and the browser calls
     it somebody else's website. */
  await page.goto("/signed-in?redirect=%2F%2Fexample.com%2Fowned", { waitUntil: "domcontentloaded" });
  expect(new URL(page.url()).origin, "the redirect left our own site").toBe(site);
  expect(new URL(page.url()).pathname).toBe("/portal");
});

test("tour progress belongs to the account, not the browser", async ({ page, request, baseURL }) => {
  /* Nobody signed in: nothing to read and nothing to write. */
  expect((await request.get("/api/tours")).status()).toBe(204);

  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await signIn(page, EMAIL, PASSWORD);
  await page.waitForURL((url) => url.pathname === "/portal", { timeout: 30_000, waitUntil: "domcontentloaded" });

  const origin = baseURL ?? "http://localhost:3100";
  const wrote = await page.request.post("/api/tours", {
    headers: { origin }, data: { tour: "client-walkthrough@1", status: "skipped" },
  });
  expect(wrote.status()).toBe(200);
  const row = await query<{ status: string }>("SELECT status FROM tour_progress WHERE user_id = $1 AND tour = $2", [userId, "client-walkthrough@1"]);
  expect(row.rows[0]?.status).toBe("skipped");

  /* And it reads back for this account, which is what another device's
     portal copies into its own storage (see tests/tour-sync.spec.ts). */
  const read = await page.request.get("/api/tours");
  expect(read.status()).toBe(200);
  expect((await read.json()).records["client-walkthrough@1"]).toMatchObject({ status: "skipped" });

  /* A write without our own origin is refused before the session is read. */
  const foreign = await page.request.post("/api/tours", {
    headers: { origin: "https://example.com" }, data: { tour: "client-walkthrough@1", status: "cleared" },
  });
  expect(foreign.status()).toBe(403);
});

test("signing out removes the session, not just the screen", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await signIn(page, EMAIL, PASSWORD);
  await page.waitForURL((url) => url.pathname === "/portal", { timeout: 30_000, waitUntil: "domcontentloaded" });

  /* The portal's own sign-out, in the sidebar, which lands on /login. Pressed
     from the keyboard: in development Next's own badge sits over the corner
     it lives in and would take a pointer click. */
  const out = page.locator(".ad__side").getByRole("button", { name: "Sign out" });
  /* Retried, because a press that lands before hydration does nothing. */
  await expect(async () => {
    await out.focus();
    await page.keyboard.press("Enter");
    await page.waitForURL((url) => url.pathname === "/login", { timeout: 5_000, waitUntil: "domcontentloaded" });
  }).toPass({ timeout: 60_000 });
  expect(await sessionCookie(page)).toBeUndefined();

  await page.goto("/admin", { waitUntil: "domcontentloaded" });
  expect(new URL(page.url()).pathname).toBe("/login");
});

test("a reset link is requested, answered immediately, emailed, and works once", async ({ page }) => {
  await page.goto("/forgot-password", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Email reset link" })).toBeEnabled({ timeout: 30_000 });
  await page.getByLabel("Email address").fill(EMAIL);

  const started = Date.now();
  await submit(page, "Email reset link");
  await expect(page.getByText("Check your inbox.")).toBeVisible({ timeout: 20_000 });
  const elapsed = Date.now() - started;

  /* THE POINT OF THE MEASUREMENT. This mail server needs about 23 seconds just
     to authenticate. `advanced.backgroundTasks` in lib/auth.ts hands the send
     to Next's `after()`, so the answer arrives before the mail does. If this
     ever exceeds the handshake again, somebody has removed that wiring and the
     next person to forget their password watches a spinner instead. */
  expect(elapsed, `the reset request answered in ${elapsed}ms`).toBeLessThan(10_000);

  /* The token is written BEFORE the send is queued, which is what makes losing
     the send survivable. Read it the way the mail would have delivered it. */
  const token = await test.step("find the issued reset token", async () => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const result = await db.query<{ identifier: string }>(
        `SELECT "identifier" FROM "verification"
         WHERE "value" = $1 AND "identifier" LIKE 'reset-password:%'
         ORDER BY "createdAt" DESC LIMIT 1`,
        [userId],
      );
      const identifier = result.rows[0]?.identifier;
      if (identifier) return identifier.replace("reset-password:", "");
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error("no reset token was issued");
  });

  /* Through the same door the emailed link opens: Better Auth checks the token
     server-side and redirects to the form with it. */
  await page.goto(`/api/auth/reset-password/${token}?callbackURL=%2Freset-password`, { waitUntil: "domcontentloaded" });
  expect(new URL(page.url()).pathname).toBe("/reset-password");
  expect(new URL(page.url()).searchParams.get("token")).toBe(token);

  await expect(page.getByRole("button", { name: "Update password" })).toBeEnabled({ timeout: 30_000 });
  await page.getByLabel("New password").fill(NEW_PASSWORD);
  await page.getByLabel("Confirm password").fill(NEW_PASSWORD);
  await submit(page, "Update password");
  await expect(page.getByText("Password updated.")).toBeVisible({ timeout: 30_000 });

  /* ONCE. A reset link that still works after it has been used is a password
     sitting in somebody's inbox for an hour. */
  await page.goto("/reset-password?token=" + token, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Update password" })).toBeEnabled({ timeout: 30_000 });
  await page.getByLabel("New password").fill(NEW_PASSWORD);
  await page.getByLabel("Confirm password").fill(NEW_PASSWORD);
  await submit(page, "Update password");
  await expect(errorLine(page)).toContainText(/invalid or has expired/i, { timeout: 30_000 });

  /* And the new password is the one that works now. */
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await signIn(page, EMAIL, PASSWORD);
  await expect(errorLine(page)).toBeVisible({ timeout: 30_000 });

  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await signIn(page, EMAIL, NEW_PASSWORD);
  await page.waitForURL((url) => url.pathname === "/portal", { timeout: 30_000, waitUntil: "domcontentloaded" });
  expect(await sessionCookie(page)).toBeTruthy();
});
