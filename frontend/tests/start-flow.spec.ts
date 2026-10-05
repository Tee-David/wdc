import { expect, test } from "@playwright/test";

/**
 * START A PROJECT is four screens of two questions, and what it sends is an
 * ordinary enquiry: same endpoint as /contact, the timeline and budget folded
 * into the message. The endpoint is answered here by the test, so nothing is
 * sent and no mail goes out.
 */
const skipIntro = (page: import("@playwright/test").Page) =>
  page.addInitScript(() => { try { localStorage.setItem("wdc-intro-seen-at", String(Date.now())); } catch { /* private mode */ } });

test("the header and hero buttons open /start", async ({ page }) => {
  await skipIntro(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "load" });
  await expect(page.locator("header").getByRole("link", { name: /Start a Project/ })).toHaveAttribute("href", "/start");
  await expect(page.locator(".hero-film").getByRole("link", { name: /Start a Project/ })).toHaveAttribute("href", "/start");
});

test("four screens, a refusal on an empty one, and an enquiry sent to the contact endpoint", async ({ page }) => {
  let posted: Record<string, string> | null = null;
  await page.route("**/api/contact", async (route) => {
    posted = JSON.parse(route.request().postData() ?? "{}");
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, confirmation: { message: "Got it, thank you." } }) });
  });
  await page.goto("/start", { waitUntil: "load" });
  const next = page.locator(".cf-acts button[type=submit]");
  const here = () => page.locator(".cf-prog__n").innerText();

  await expect.poll(here).toBe("1 of 4");
  await next.click();
  await expect(page.locator(".ct-error").first()).toBeVisible();
  expect(await here()).toBe("1 of 4");

  await page.getByLabel("Software Engineering & AI").check();
  await page.getByLabel("Tell us about it").fill("A client portal for our logistics team.");
  await next.click();
  await expect.poll(here).toBe("2 of 4");
  await page.getByLabel("As soon as possible").check();
  await next.click();
  await expect.poll(here).toBe("3 of 4");

  /* Back keeps what was typed. */
  await page.locator(".cf-back").click();
  await expect.poll(here).toBe("2 of 4");
  await expect(page.getByLabel("As soon as possible")).toBeChecked();
  await next.click();

  await page.getByLabel("Your first name").fill("Ada");
  await page.getByLabel("Your last name").fill("Obi");
  await next.click();
  await expect.poll(here).toBe("4 of 4");
  await page.locator(".cf").getByLabel("Your email").fill("ada@example.com");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Got it, thank you.")).toBeVisible();

  expect(posted).toMatchObject({ first: "Ada", last: "Obi", email: "ada@example.com", topic: "Software Engineering & AI" });
  expect(posted!.message).toContain("A client portal for our logistics team.");
  expect(posted!.message).toContain("Start: As soon as possible");
});

test("on a phone nothing is wider than the screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/start", { waitUntil: "load" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
