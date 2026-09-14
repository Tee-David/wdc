import { expect, test } from "@playwright/test";

/**
 * The phone field and its country picker, on every page that carries one.
 *
 * WHY THIS FILE EXISTS. Both faults it pins were the same kind of fault: a
 * rule written for ONE form, in a component used by TWO.
 *
 * The panel's stylesheet was imported by the onboarding form and by nothing
 * else, so on the contact page the picker opened as an unstyled in-flow list
 * of 245 rows -- no border, no background, no row padding -- which pushed the
 * page down and meant scrolling the whole site instead of the list. And the
 * reset that stops the number input drawing its own border inside the bar's
 * border named `.ob__f`, so the contact form's `.ct-f input:focus` still put a
 * rounded orange ring inside the rounded orange ring.
 *
 * Neither is visible to TypeScript, and neither shows on the page the rule was
 * written for. So the test walks every page that has the control.
 */

const PAGES = [
  { name: "the contact form", path: "/contact", field: "#ct-phone" },
  { name: "the onboarding form", path: "/onboarding", field: '[data-field="phone"] input.ph__num' },
];

/* The onboarding form opens on a welcome screen; a seeded draft lands on the
   step that actually carries the phone field. Same trick onboarding.spec.ts
   uses. */
test.beforeEach(async ({ page }) => {
  await page.route(/jotfor|userway/i, (route) => route.abort());
  await page.addInitScript(() => {
    localStorage.setItem(
      "wdc-onboarding-draft",
      JSON.stringify({ started: true, service: "web", step: 0, answers: {} }),
    );
  });
});

for (const { name, path, field } of PAGES) {
  test(`${name}: the picker opens as a panel, not as part of the page`, async ({ page }) => {
    await page.goto(path);

    const bar = page.locator(".ph__cc").first();
    await bar.scrollIntoViewIfNeeded();
    await bar.click();

    const pop = page.locator(".pk__pop").first();
    await expect(pop).toBeVisible();

    /* THE THREE THINGS AN UNSTYLED PANEL GETS WRONG, checked as computed
       style rather than by eye: it sits in the page flow, it has no ground of
       its own, and it has no elevation. Any one of them failing means the
       stylesheet did not reach this page. */
    const panel = await pop.evaluate((el) => {
      const c = getComputedStyle(el);
      return { position: c.position, background: c.backgroundColor, shadow: c.boxShadow, radius: c.borderTopLeftRadius };
    });
    expect(panel.position, "the panel is in the page flow").not.toBe("static");
    expect(panel.background, "the panel has no background of its own").not.toBe("rgba(0, 0, 0, 0)");
    expect(panel.shadow, "the panel has no elevation").not.toBe("none");
    expect(parseFloat(panel.radius)).toBeGreaterThan(4);

    /* THE LIST SCROLLS ITSELF. `overscroll-behavior: contain` is the property
       that stops the page taking the gesture over at either end, which is the
       "I have to scroll through my entire site" complaint. */
    const list = await page.locator(".pk__list").first().evaluate((el) => {
      const c = getComputedStyle(el);
      return {
        overflowY: c.overflowY,
        overscroll: c.overscrollBehaviorY,
        touch: c.touchAction,
        scrolls: el.scrollHeight > el.clientHeight + 10,
        lenis: el.hasAttribute("data-lenis-prevent"),
      };
    });
    expect(list.overflowY).toBe("auto");
    expect(list.overscroll).toBe("contain");
    expect(list.touch).toBe("pan-y");
    expect(list.scrolls, "245 countries should overflow the list box").toBe(true);
    expect(list.lenis, "the smooth-scroll library will steal this gesture").toBe(true);

    /* The search icon is sized by the panel's own stylesheet. Unstyled, a
       lucide glyph renders at whatever the inherited font-size makes of a
       24-unit viewBox, which was a magnifier the height of three rows. */
    const icon = await page.locator(".pk__search svg").first().boundingBox();
    expect(icon!.width).toBeLessThan(26);
    expect(icon!.height).toBeLessThan(26);
  });

  test(`${name}: the number input draws no border of its own`, async ({ page }) => {
    await page.goto(path);

    const num = page.locator(field).first();
    await num.scrollIntoViewIfNeeded();
    await num.click();
    await num.fill("8021234567");

    /* THE BOX INSIDE THE BOX. The bar draws the border and the focus ring for
       the whole control; the input inside it must draw neither, or focusing
       the number puts a second rounded orange rectangle inside the first. */
    const own = await num.evaluate((el) => {
      const c = getComputedStyle(el);
      return {
        border: c.borderTopWidth,
        radius: c.borderTopLeftRadius,
        shadow: c.boxShadow,
        outline: c.outlineStyle,
        background: c.backgroundColor,
      };
    });
    expect(own.border).toBe("0px");
    expect(own.radius).toBe("0px");
    expect(own.shadow).toBe("none");
    expect(own.outline).toBe("none");
    expect(own.background).toBe("rgba(0, 0, 0, 0)");

    /* And the bar itself DOES draw one, so the control still reads as focused. */
    const barShadow = await page.locator(".ph__bar").first()
      .evaluate((el) => getComputedStyle(el).boxShadow);
    expect(barShadow).not.toBe("none");
  });
}

test("the panel opens upward when the field is near the foot of the window", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/contact");

  const cc = page.locator(".ph__cc").first();
  /* Put the control near the bottom edge, which is where a dropdown that only
     ever drops downward goes off screen. */
  await cc.evaluate((el) => {
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - (window.innerHeight - 150));
  });
  await page.waitForTimeout(400);
  await cc.click();

  const pop = page.locator(".pk__pop").first();
  await expect(pop).toBeVisible();
  const fits = await pop.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, vh: window.innerHeight };
  });
  expect(fits.bottom, "the panel runs off the bottom of the window").toBeLessThanOrEqual(fits.vh);
  expect(fits.top, "the panel runs off the top of the window").toBeGreaterThanOrEqual(0);
});

test("on a phone it is a sheet with a scrim, and the page does not widen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto("/contact");

  const cc = page.locator(".ph__cc").first();
  await cc.scrollIntoViewIfNeeded();
  await cc.click();

  const pop = page.locator(".pk__pop").first();
  await expect(pop).toBeVisible();
  const sheet = await pop.evaluate((el) => {
    const c = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return { position: c.position, left: r.left, width: r.width, bottom: Math.round(r.bottom), vw: window.innerWidth, vh: window.innerHeight };
  });
  expect(sheet.position).toBe("fixed");
  expect(sheet.left).toBeCloseTo(0, 1);
  expect(sheet.width).toBe(sheet.vw);
  expect(sheet.bottom).toBe(sheet.vh);

  /* The scrim is the open control's own pseudo-element, so nothing renders an
     extra node and nothing can forget to. */
  const veil = await page.locator(".pk.is-open").first()
    .evaluate((el) => {
      const c = getComputedStyle(el, "::before");
      return { position: c.position, background: c.backgroundColor };
    });
  expect(veil.position).toBe("fixed");
  expect(veil.background).not.toBe("rgba(0, 0, 0, 0)");

  /* Rows stay tappable at 44px. */
  const row = await page.locator(".pk__opt").first().boundingBox();
  expect(row!.height).toBeGreaterThanOrEqual(44);
});

test("opening the sheet does not widen the page", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto("/contact");

  /* MEASURED AS A DELTA, NOT AGAINST THE VIEWPORT, and the difference matters.
     In a 390px window that is not emulating a real phone, this page already
     reports a document 404px wide with nothing open: the site's slide-in menu
     panel is laid out off to the right and only the mobile layout viewport
     absorbs it. Emulating an actual phone (`isMobile`) it reads 405 against a
     405 viewport, so there is nothing to fix and an absolute assertion here
     would be pinning somebody else's pre-existing number.

     What this control owes is that opening it changes nothing. */
  const cc = page.locator(".ph__cc").first();
  /* Scrolled into place BEFORE the baseline is taken. The off-screen menu
     panel only contributes to the document width once the page has moved, so
     measuring at the top would blame the sheet for the scroll. */
  await cc.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const before = await page.evaluate(() => document.documentElement.scrollWidth);
  await cc.click();
  await expect(page.locator(".pk__pop").first()).toBeVisible();
  const after = await page.evaluate(() => document.documentElement.scrollWidth);

  expect(after, "the sheet widened the page").toBeLessThanOrEqual(before);
});
