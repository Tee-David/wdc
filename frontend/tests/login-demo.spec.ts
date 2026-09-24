import { expect, test, type Page } from "@playwright/test";

/**
 * EVERY PATH THROUGH THE LOGIN PAGE, WITHOUT A BACKEND.
 *
 * Runs against a server started with NEXT_PUBLIC_AUTH_DEMO=true, where the
 * demo adapter stands in for Better Auth (lib/auth/demo-adapter.ts). Skips on
 * any other server: the "Demo mode" pill is how it knows. The real backend is
 * covered by auth-flow.spec.ts; this covers everything the person sees and
 * does, which is most of what can go wrong on this page.
 *
 *   NEXT_PUBLIC_AUTH_DEMO=true npx next dev -p 3100
 *   npx playwright test tests/login-demo.spec.ts
 */

test.describe.configure({ timeout: 90_000 });

/**
 * HYDRATED, NOT "ENABLED". The primary button is natively `disabled` only
 * until React is live (see components/auth/use-hydrated.ts); after that it is
 * asleep or awake through `aria-disabled`, which Playwright also counts as
 * disabled. So the signal is the native attribute going away.
 */
const hydrated = (page: Page) =>
  expect(page.locator("button.au__submit").first()).not.toHaveAttribute("disabled", { timeout: 30_000 });

test.beforeEach(async ({ page }) => {
  await page.route(/jotfor|userway/i, (route) => route.abort());
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  const demo = await page.getByText("Demo mode", { exact: true }).isVisible().catch(() => false);
  test.skip(!demo, "start the server with NEXT_PUBLIC_AUTH_DEMO=true");
  await hydrated(page);
});

const EMAIL = "tee.david@gmail.com";

async function toMethod(page: Page, email = EMAIL) {
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Choose how to log in" })).toBeVisible();
}

async function toPassword(page: Page) {
  await toMethod(page);
  await page.getByRole("tab", { name: "Password" }).click();
  await expect(page.getByRole("tab", { name: "Password" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
}

async function tryPassword(page: Page, value: string) {
  const field = page.getByLabel("Password", { exact: true });
  await field.fill(value);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
}

const curtain = (page: Page) => page.getByRole("dialog", { name: "Demo complete" });

test("the first screen asks only for an email, and says what is wrong only when asked", async ({ page }) => {
  const email = page.getByLabel("Email", { exact: true });
  const button = page.getByRole("button", { name: "Continue", exact: true });

  /* Asleep, but never disabled: it can be pressed, and pressing it explains. */
  await expect(button).toHaveAttribute("aria-disabled", "true");
  await email.fill("tee.david@gm");
  await expect(email).not.toHaveAttribute("aria-invalid", "true");
  /* `force`, because Playwright will not press an aria-disabled button. A
     person can, and that is the point of never disabling it. */
  await button.click({ force: true });
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Enter a full email address, like name@company.com.")).toBeVisible();
  await expect(email).toBeFocused();

  /* Fixing it clears the error while typing, and wakes the button. */
  await email.pressSequentially("ail.com");
  await expect(email).not.toHaveAttribute("aria-invalid", "true");
  await expect(button).not.toHaveAttribute("aria-disabled", "true");
});

test("the method step is the same for every address and remembers nothing it should not", async ({ page }) => {
  await toMethod(page, `nobody-${Date.now()}@example.com`);
  const tabs = page.getByRole("tab");
  await expect(tabs).toHaveCount(3);
  await expect(page.getByText("Last used")).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Link" })).toHaveAttribute("aria-selected", "true");

  /* Arrow keys move between the tabs and choose as they go, and focus stays
     on the tabs even when the choice is Password, which is a step of its own. */
  await page.getByRole("tab", { name: "Link" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.nth(1)).toBeFocused();
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(tabs.nth(2)).toBeFocused();
  await expect(page.getByRole("button", { name: "Use my passkey" })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.first()).toBeFocused();
  await expect(page.getByRole("button", { name: "Email me a link" })).toBeVisible();
});

test("only the chosen tab shows its label, and it is never cut short", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.route(/jotfor|userway/i, (route) => route.abort());
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await hydrated(page);
  await toMethod(page);
  for (const name of ["Link", "Password", "Passkey"]) {
    await page.getByRole("tab", { name }).click();
    /* Past the width animation. */
    await page.waitForTimeout(500);
    const labels = await page.getByRole("tab").evaluateAll((els) =>
      els.map((el) => {
        const label = el.querySelector(".lx__tabLabel > span") as HTMLElement;
        const icon = el.querySelector("svg")!.getBoundingClientRect();
        return {
          selected: el.getAttribute("aria-selected") === "true",
          clipped: label.scrollWidth > label.clientWidth + 1,
          shown: label.getBoundingClientRect().width > 1,
          icon: icon.width > 0 && icon.right <= el.getBoundingClientRect().right,
        };
      }),
    );
    for (const tab of labels) {
      expect(tab.icon, "every tab keeps its icon").toBe(true);
      expect(tab.shown, "a label shows only on the chosen tab").toBe(tab.selected);
      if (tab.selected) expect(tab.clipped, `${name} is cut short`).toBe(false);
    }
  }
  await context.close();
});

test("on a short phone the greeting's caption stays above the sheet, and the code shows its six boxes", async ({ browser }) => {
  for (const colorScheme of ["light", "dark"] as const) {
    const context = await browser.newContext({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, colorScheme });
    const page = await context.newPage();
    await page.route(/jotfor|userway/i, (route) => route.abort());
    await page.addInitScript((theme) => localStorage.setItem("theme", theme), colorScheme);
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await hydrated(page);
    await toMethod(page);
    await page.getByRole("button", { name: "Email me a link" }).click();
    await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible({ timeout: 10_000 });
    await page.evaluate(() => window.scrollTo(0, 0));

    const caption = await page.locator(".greet__caption").boundingBox();
    const sheet = await page.locator(".au__panel").boundingBox();
    expect(caption!.y + caption!.height, `${colorScheme}: caption under the sheet`).toBeLessThanOrEqual(sheet!.y);

    /* The boxes are what a person reads; the real input over them must not paint over them. */
    const boxes = page.locator(".au-code__box");
    await expect(boxes).toHaveCount(6);
    for (const box of await boxes.all()) await expect(box).toBeVisible();
    const cover = await page.locator(".au-code__input").evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(cover, `${colorScheme}: the input paints over the boxes`).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
    await context.close();
  }
});

test("a wrong password shakes its head, keeps the value and, after three, offers a link", async ({ page }) => {
  await toPassword(page);
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await tryPassword(page, "oops");
    const field = page.getByLabel("Password", { exact: true });
    await expect(field).toHaveAttribute("aria-invalid", "true", { timeout: 10_000 });
    await expect(page.getByText("That email and password don't match. Check both and try again.")).toBeVisible();
    await expect(field).toHaveValue("oops");
    await expect(field).toBeFocused();
    if (attempt < 3) await expect(page.getByText("Having trouble?", { exact: false })).toHaveCount(0);
  }
  await expect(page.getByText("Having trouble? We can email you a sign-in link instead.")).toBeVisible();
  await page.locator(".lx__suggest").getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible({ timeout: 10_000 });
});

test("rate limits and network failures are never called a wrong password", async ({ page }) => {
  await toPassword(page);
  await tryPassword(page, "limit");
  await expect(page.getByText("Too many attempts. Wait a few minutes, or use a sign-in link instead.")).toBeVisible({ timeout: 10_000 });
  /* The link is offered straight away, not after three tries. */
  await expect(page.locator(".lx__suggest")).toBeVisible();

  await tryPassword(page, "offline");
  await expect(page.getByText("We couldn't reach the server. Check your connection and try again.")).toBeVisible({ timeout: 10_000 });
});

test("the ring waits for a slow answer, never closes early, and never flickers on a fast one", async ({ page }) => {
  await toPassword(page);
  const ring = page.locator(".orb__ring");
  await page.getByLabel("Password", { exact: true }).fill("slow");
  const started = Date.now();
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(ring).toHaveAttribute("data-mode", "progress");

  /* The curve is 80 x (1 - e^(-t/600ms)), then a creep toward 90. It is
     well on its way after a second, near 80 before the answer arrives at
     3s, and never above 90 while the server is still thinking. */
  const progress = () => page.locator(".orb__arc").evaluate((arc) => 100 - parseFloat((arc as SVGElement).style.strokeDashoffset));
  await page.waitForTimeout(Math.max(0, started + 1200 - Date.now()));
  expect(await progress()).toBeGreaterThan(60);
  await page.waitForTimeout(Math.max(0, started + 2700 - Date.now()));
  const late = await progress();
  expect(late).toBeGreaterThan(78);
  expect(late).toBeLessThanOrEqual(90);
  await expect(ring).toHaveAttribute("data-mode", "progress");

  await expect(ring).toHaveAttribute("data-mode", "complete", { timeout: 10_000 });
  expect(Date.now() - started).toBeGreaterThanOrEqual(3000);
  await expect(curtain(page)).toBeVisible({ timeout: 10_000 });
});

test("the emailed code signs in; a wrong one is cleared and explained", async ({ page }) => {
  await toMethod(page);
  await page.getByRole("button", { name: "Email me a link" }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("link", { name: /Open Gmail/ })).toHaveAttribute("href", /mail\.google\.com/);
  await expect(page.getByRole("button", { name: /Resend in 0:\d\d/ })).toBeDisabled();

  const code = page.getByLabel("Or enter the 6-digit code from the email");
  await code.pressSequentially("111111");
  await expect(page.getByText("That code didn't work. Check the email and try again.")).toBeVisible({ timeout: 10_000 });
  await expect(code).toHaveValue("");

  /* Paste of a whole code works as well as typing it. */
  await code.fill("123456");
  await expect(curtain(page)).toBeVisible({ timeout: 10_000 });
});

test("the waiting screen moves on by itself when the link is opened elsewhere", async ({ page }) => {
  await toMethod(page);
  await page.getByRole("button", { name: "Email me a link" }).click();
  await page.getByRole("button", { name: "Simulate opening the link" }).click();
  await expect(curtain(page)).toBeVisible({ timeout: 10_000 });
});

test("a cancelled passkey says no problem and offers the ways back", async ({ page }) => {
  await page.getByRole("button", { name: "Sign in with a passkey" }).click();
  await expect(page.getByRole("heading", { name: "Use your passkey" })).toBeVisible();
  await expect(page.locator(".orb__ring")).toHaveAttribute("data-mode", "indeterminate");
  await page.getByRole("button", { name: "Simulate cancel" }).click();
  await expect(page.getByText("No problem. Try again, or choose another way.")).toBeVisible();
  await page.getByRole("button", { name: "Choose another way" }).click();
  await expect(page.getByRole("heading", { name: "Log in to WDC" })).toBeVisible();
});

test("browser Back walks back through the steps and keeps the address", async ({ page }) => {
  await toPassword(page);
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Choose how to log in" })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Log in to WDC" })).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(EMAIL);
  expect(new URL(page.url()).pathname).toBe("/login");
  expect(page.url()).not.toContain("tee.david");
});

test("forgot password flips the card, leaves one email field, and flips back", async ({ page }) => {
  await toPassword(page);
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
  await expect(page.locator(".lx__flip")).toHaveAttribute("data-face", "back");
  /* Once the turn has finished, the face that looks away is gone, so a
     password manager never sees a second, hidden address field. */
  await expect(page.locator('input[type="email"]:not([hidden])')).toHaveCount(1, { timeout: 2_000 });
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(EMAIL);

  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/If tee\.david@gmail\.com has a WDC account, a reset link is on its way/)).toBeVisible();

  await page.getByRole("button", { name: "Back to log in" }).click();
  await expect(page.getByRole("tab", { name: "Password" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  await expect(page.locator(".lx__flip")).toHaveAttribute("data-face", "front");
});

test("/forgot-password opens on the back of the card", async ({ page }) => {
  await page.goto("/forgot-password", { waitUntil: "domcontentloaded" });
  await hydrated(page);
  await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
  await expect(page.locator(".lx__flip")).toHaveAttribute("data-face", "back");
  await page.getByRole("button", { name: "Back to log in" }).click();
  await expect(page.getByRole("heading", { name: "Log in to WDC" })).toBeVisible();
});

test("the orb turns its back while the password is masked, and faces you when it is shown", async ({ page }) => {
  await toPassword(page);
  const field = page.getByLabel("Password", { exact: true });
  const orb = page.locator(".orb");
  await expect(field).toBeFocused();
  await expect(orb).toHaveAttribute("data-facing", "away");
  await field.pressSequentially("secret");

  /* Every press of the eye, not only the first: shown faces you, masked turns away. */
  for (let round = 0; round < 2; round += 1) {
    await page.getByRole("button", { name: "Show password" }).click();
    await expect(field).toHaveAttribute("type", "text");
    await expect(orb).toHaveAttribute("data-facing", "you");
    await expect(field).toBeFocused();
    await page.getByRole("button", { name: "Hide password" }).click();
    await expect(field).toHaveAttribute("type", "password");
    await expect(orb).toHaveAttribute("data-facing", "away");
  }

  /* From the keyboard too: tabbing to the eye is not leaving the field. */
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Show password" })).toBeFocused();
  await page.waitForTimeout(200);
  await expect(orb).toHaveAttribute("data-facing", "away");
  await page.keyboard.press("Enter");
  await expect(orb).toHaveAttribute("data-facing", "you");
  await page.keyboard.press("Enter");
  await expect(orb).toHaveAttribute("data-facing", "away");
});

test("a returning visitor is greeted by name, and 'Not Tee?' forgets them", async ({ page }) => {
  await toPassword(page);
  await tryPassword(page, "right-password");
  await expect(curtain(page)).toBeVisible({ timeout: 10_000 });

  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Good to see you again, Tee.")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Welcome back, Tee", { exact: true })).toBeAttached();

  await toMethod(page);
  /* The way in that worked last time opens first. */
  await expect(page.getByRole("tab", { name: "Password" })).toHaveAttribute("aria-selected", "true");

  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Not Tee?" }).click();
  await expect(page.getByText("Use your email to continue.")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("wdc.auth.hint"))).toBeNull();
});

test("reduced motion still signs in, with no flip, shake or zoom in the way", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.route(/jotfor|userway/i, (route) => route.abort());
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await hydrated(page);
  await toPassword(page);
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
  await page.getByRole("button", { name: "Back to log in" }).click();
  await tryPassword(page, "fine");
  await expect(curtain(page)).toBeVisible({ timeout: 10_000 });
  await context.close();
});

test("no dashes in anything the page says", async ({ page }) => {
  const seen: string[] = [];
  const read = async () => seen.push(await page.locator("main").innerText());
  await read();
  await toMethod(page);
  await read();
  await page.getByRole("tab", { name: "Password" }).click();
  await tryPassword(page, "oops");
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("aria-invalid", "true", { timeout: 10_000 });
  await read();
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await read();
  for (const text of seen) expect(text).not.toMatch(/[–—]/);
});

test("the page never scrolls sideways at 320px, and every control is a 44px target", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.route(/jotfor|userway/i, (route) => route.abort());
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await hydrated(page);
  await page.getByLabel("Email", { exact: true }).fill("a.very.long.address.that.keeps.going@some-long-company-domain.co.uk");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Choose how to log in" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

  const small = await page.locator(".au button:visible, .au a:visible").evaluateAll((els) =>
    els
      .map((el) => ({ label: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 40), box: el.getBoundingClientRect() }))
      .filter(({ box }) => box.width > 0 && box.height < 43.5)
      .map(({ label, box }) => `${label} (${Math.round(box.height)}px)`),
  );
  /* Inline links inside a sentence (the legal line) are exempt under 2.5.8. */
  expect(small.filter((s) => !/^Terms \(|Privacy Policy|Talk to us/.test(s))).toEqual([]);

  /* The footer is two lines: the way back and the way in share one row, and
     the legal line fits on the next. */
  const back = await page.locator(".au__back--foot").boundingBox();
  const newHere = await page.locator(".au__new").boundingBox();
  expect(Math.abs(back!.y + back!.height / 2 - (newHere!.y + newHere!.height / 2))).toBeLessThan(4);
  expect(newHere!.x).toBeGreaterThan(back!.x + back!.width);
  const legal = await page.locator(".au__legal").evaluate((el) => el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight));
  expect(legal).toBeLessThan(1.5);
  await context.close();
});
