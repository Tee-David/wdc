import { expect, test } from "@playwright/test";

/**
 * The free CAC business name checker.
 *
 * THE FIRST TEST IS THE WHOLE PRODUCT. "Free" here is not a price, it is an
 * architecture: the rules under CAMA 2020 section 852 are public and the check
 * is arithmetic, so it runs in the visitor's browser and nothing leaves the
 * machine. The day somebody quietly adds a fetch, the tool has a per-call cost,
 * a rate limit, a privacy story to explain and a bad day when it is popular.
 * So the absence of a request is asserted rather than assumed.
 *
 * THE SECOND ONE IS THE HONESTY. A checker that says "available" about a name
 * it has not looked up in the register is how somebody pays to file a name
 * that was never theirs. The word must not appear, and the panel saying what
 * was NOT checked has to be there whether the name passed or failed.
 */

const URL = "/tools/business-name";

/** Fills the box and presses the button. Returns nothing; read the DOM after. */
async function check(page: import("@playwright/test").Page, name: string, company = false) {
  const tool = page.locator(".tl");
  await tool.waitFor();
  if (company) await tool.getByRole("radio", { name: /A company/ }).click();
  await tool.getByRole("textbox").fill(name);
  await tool.getByRole("button", { name: /Check it/ }).click();
  await expect(page.locator(".tl__out")).toBeVisible();
}

test("answers without sending the name anywhere", async ({ page }) => {
  const outbound: string[] = [];
  /* Everything except the documents, scripts and styles the page itself is
     made of. A name typed into this box must not appear in any of it. */
  page.on("request", (r) => {
    const type = r.resourceType();
    if (type === "fetch" || type === "xhr" || type === "websocket") outbound.push(r.url());
  });

  await page.goto(URL);
  await check(page, "Federal Holdings Ltd");

  expect(outbound, `unexpected outbound request: ${outbound.join(", ")}`).toHaveLength(0);
});

test("never claims a name is free, and offers the step that would say", async ({ page }) => {
  await page.goto(URL);
  /* A name with nothing wrong with it is the dangerous case: it is the one a
     careless tool would call available. */
  await check(page, "Wendi Loveee Limited", true);

  const out = page.locator(".tl__out");
  await expect(out).toContainText("Nothing in Wendi Loveee Limited breaks the rules");
  await expect(out).not.toContainText(/available/i);
  await expect(out).not.toContainText(/free to (use|register)/i);

  /* STEP TWO IS SHOWN WHETHER THE NAME PASSED OR FAILED. The commonest way a
     tool like this misleads people is by being right about the small half and
     silent about the big one, and the fix is a next step rather than a
     disclaimer: same fact, and something the reader can act on. */
  await expect(out.locator(".tl__step")).toBeVisible();
  await expect(out).toContainText("Is it already taken?");
  await expect(out.getByRole("link", { name: /Open CAC register/ })).toBeVisible();
});

test("reads the section 852 rules, and the entity decides which apply", async ({ page }) => {
  await page.goto(URL);

  /* Both restricted words reported, plus the ending a business name may not
     wear. Three separate findings from one string. */
  await check(page, "Federal Holdings Ltd");
  const findings = page.locator(".tl__findname");
  await expect(findings).toHaveCount(3);
  await expect(page.locator(".tl__out")).toContainText("A business name cannot end in Limited");
  await expect(page.locator(".tl__out")).toContainText("needs the Commission");

  /* THE SAME ENDING ON A COMPANY IS REQUIRED, NOT WRONG. If the entity did not
     change the answer, the question above the box would be decoration. */
  await page.reload();
  await check(page, "Federal Holdings Ltd", true);
  await expect(page.locator(".tl__out")).not.toContainText("cannot end in Limited");
  await expect(page.locator(".tl__findname")).toHaveCount(2);
});

test("keeps every button on one line down to 320px", async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(URL);
    await check(page, "Federal Building Society");

    /* A WRAPPED BUTTON IS STILL ONE BOX, so counting element rects finds
       nothing. A Range over the label's own text node counts LINE boxes,
       which is the thing that actually looks wrong. */
    const wrapped = await page.evaluate(() => {
      const lines = (el: Element) => {
        const node = [...el.childNodes].find(
          (n) => n.nodeType === 3 && n.textContent?.trim(),
        );
        if (!node) return 1;
        const range = document.createRange();
        range.selectNodeContents(node);
        return range.getClientRects().length;
      };
      return [...document.querySelectorAll(".tl .pv-btn, .tl__go")]
        .filter((b) => lines(b) > 1)
        .map((b) => b.textContent?.trim() ?? "");
    });
    expect(wrapped, `wrapped button at ${width}px`).toEqual([]);
  }
});
