import { expect, test, type Page } from "@playwright/test";

/**
 * THE HOMEPAGE FILM.
 *
 * The hero is the studio's showreel behind the copy, with a chapter bar that
 * names the six services as the film reaches them (a strip on a desktop, story
 * bars on a phone). What these pin is everything that can go wrong WITHOUT the
 * film looking any different in a quick check:
 *
 *  - the film is never in the HTML and never fetched before the page has
 *    loaded, so 4MB of video cannot sit on the critical path;
 *  - each screen shape gets its own cut, chosen in the browser;
 *  - reduced motion never fetches it at all;
 *  - the desktop chapters move when pressed; a phone gets progress bars
 *    and a play control under the buttons, and nothing over the film;
 *  - the hero's own pair is above the fold on the smallest phone we design
 *    for, and the hero never widens the page.
 *
 * NONE OF IT NEEDS THE FILM TO PLAY. Playwright's Chromium ships without the
 * H.264 decoder, so in this suite the video errors and the poster stays up --
 * which is also the case worth proving: the hero has to be complete with the
 * poster alone. Every assertion here reads the hero's own state, not the
 * video's clock.
 */

const skipIntro = (page: Page) =>
  page.addInitScript(() => {
    try { localStorage.setItem("wdc-intro-seen-at", String(Date.now())); } catch { /* private mode */ }
  });

const filmSrc = (page: Page) =>
  page.locator(".hero-film video").evaluate((v: HTMLVideoElement) => v.getAttribute("src") ?? "");

/* BOTH WIDTHS, AND THE DESKTOP ONE IS THE POINT. The homepage once carried two
   `h1`s -- the hero's, and "We Dig Creativity." inside the intro splash -- and
   it never showed on a phone, because the intro does not run on a touch
   device. */
for (const width of [390, 1280]) {
  test(`one h1, and it is the headline, at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    /* The intro animates in, so a count taken on the first paint can miss a
       heading that arrives a moment later. */
    await page.waitForTimeout(1500);

    await expect(page.locator("h1")).toHaveCount(1);
    const text = await page.locator("h1").innerText();
    expect(text.replace(/\s+/g, " ").trim()).toBe("Six briefs. One studio.");
  });
}

test("the film is not in the HTML: the first paint is the poster", async ({ request }) => {
  const html = await (await request.get("/")).text();
  expect(html, "a video file is referenced from the server HTML").not.toMatch(/\.mp4/);
  expect(html).toContain("wdc-film-v2-16x9-1280.jpg");
  expect(html).toContain("wdc-film-v2-9x16-720.jpg");
});

test("a desktop gets the wide cut, once the page has loaded", async ({ page }) => {
  await skipIntro(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "load" });
  await expect.poll(() => filmSrc(page), { timeout: 10_000 }).toContain("wdc-film-v2-16x9.mp4");
});

test("the desktop chapters jump to the chapter pressed", async ({ page }) => {
  await skipIntro(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "load" });

  /* The film's src is attached from an effect, so once it is set the hero
     has hydrated and its buttons have handlers. A click before that lands on
     server HTML and does nothing, which is a race in the test, not the page. */
  await expect.poll(() => filmSrc(page), { timeout: 10_000 }).toContain("wdc-film-v2-16x9.mp4");

  const strip = page.getByRole("group", { name: "Chapters of the film" });
  await expect(strip.getByRole("button")).toHaveCount(8);
  /* The film opens inside "The studio". */
  await expect(strip.locator('[aria-current="step"]')).toHaveText("The studio");

  await strip.getByRole("button", { name: "Play the film from Web" }).click();
  await expect(strip.locator('[aria-current="step"]')).toHaveText("Web");

  await strip.getByRole("button", { name: "Play the film from Software & AI" }).click();
  await expect(strip.locator('[aria-current="step"]')).toHaveText("Software & AI");
});

/* ONE BAR AT EVERY WIDTH (the owner's call, 2026-10-04): on a desktop the
   bar is the logo, "Start a project" and the menu button. The links, the
   theme switch and log in live in the menu, as they do on a phone. */
test("on a desktop the bar is the logo, the CTA and the menu, and the menu holds the rest", async ({ page }) => {
  await skipIntro(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "load" });
  await expect.poll(() => filmSrc(page), { timeout: 10_000 }).toContain("wdc-film-v2-16x9.mp4");

  const bar = page.locator("header");
  await expect(bar.getByRole("link", { name: "We Dig Creativity, home" })).toBeVisible();
  await expect(bar.getByRole("link", { name: "Start a project" })).toBeVisible();
  await expect(bar.getByRole("navigation", { name: "Primary" })).toHaveCount(0);
  await expect(bar.getByRole("link", { name: "Log in", exact: true })).toHaveCount(0);

  await bar.getByRole("button", { name: "Open menu" }).click();
  for (const name of ["Go to Our Works", "Go to Services", "Go to Contact Us", "Log in to your account"]) {
    await expect(page.getByRole("link", { name })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: "Switch theme" }).last()).toBeVisible();
});

test.describe("on a phone", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test("it gets the tall cut, and the progress sits under the pair with its play control", async ({ page }) => {
    await skipIntro(page);
    await page.goto("/", { waitUntil: "load" });
    await expect.poll(() => filmSrc(page), { timeout: 10_000 }).toContain("wdc-film-v2-9x16.mp4");

    const hero = page.locator(".hero-film");
    /* The owner took the side arrows and the label row out: nothing sits over
       the film on a phone. */
    await expect(hero.getByRole("button", { name: /chapter of the film/ })).toHaveCount(0);
    await expect(hero.getByText(/ of 8$/)).toHaveCount(0);

    /* The bars and the toggle are one row directly under "See our work". */
    const toggle = hero.locator('button[aria-label$="the film"]:visible');
    await expect(toggle).toHaveCount(1);
    const work = await hero.getByRole("link", { name: "See our work" }).boundingBox();
    const play = await toggle.boundingBox();
    expect(play!.y, "the play control is not under the buttons").toBeGreaterThan(work!.y + work!.height);
    expect(play!.y + play!.height).toBeLessThanOrEqual(844);

    /* The desktop strip is not what a phone gets. */
    await expect(page.getByRole("group", { name: "Chapters of the film" })).toBeHidden();
  });

  test("over the film the header is the mark and the menu, and the CTA comes back on scroll", async ({ page }) => {
    await skipIntro(page);
    await page.goto("/", { waitUntil: "load" });

    const cta = page.locator("header").getByRole("link", { name: /Start a project|Start/ });
    await expect(cta).toBeHidden();
    await expect(page.locator("header").getByRole("button", { name: "Open menu" })).toBeVisible();

    /* Touch emulation does not scroll on a wheel event. A key first: a
       scripted scroll is not intent, so without one the arrival reset in
       components/ui/scroll-reset.tsx can still put the page back at the top,
       and the test only passed when it lost that race. */
    await page.keyboard.press("Shift");
    await page.evaluate(() => window.scrollTo(0, 1200));
    await expect(cta).toBeVisible();
  });
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the film is never fetched, and the play control is there instead", async ({ page }) => {
    await skipIntro(page);
    const videos: string[] = [];
    page.on("request", (r) => { if (/\.mp4(\?|$)/.test(r.url())) videos.push(r.url()); });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "load" });
    await page.waitForTimeout(2500);

    expect(videos).toEqual([]);
    expect(await filmSrc(page)).toBe("");
    /* One play control per layout; the desktop's is the one on screen. */
    await expect(page.locator('.hero-film button[aria-label="Play the film"]:visible')).toHaveCount(1);
  });
});

/* THE SMALLEST PHONE WE DESIGN FOR. The pair is the hero's whole job, so it
   has to be on the first screen, and nothing in the hero may push the page
   sideways at 320px. */
test.describe("at 320 by 568", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 320, height: 568 } });

  test("the pair is above the fold and the page is not widened", async ({ page }) => {
    await skipIntro(page);
    await page.goto("/", { waitUntil: "load" });
    await page.evaluate(() => document.fonts?.ready);

    const hero = page.locator(".hero-film");
    for (const name of ["Start a project", "See our work"]) {
      const box = await hero.getByRole("link", { name }).boundingBox();
      expect(box, `${name} is not on screen`).not.toBeNull();
      expect(box!.y + box!.height, `${name} is below the fold`).toBeLessThanOrEqual(568);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(320);
    }

    const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(wide, "the homepage is wider than the screen").toBe(false);
  });
});

/**
 * The footer's width, and the newsletter's alignment inside it.
 *
 * TWO THINGS THAT BOTH LOOK LIKE NOTHING IN A DIFF. The card carried a 10px
 * inset at every width below 1024, which on a phone left the footer visibly
 * narrower than the full-bleed section above it -- too little to read as a
 * margin, enough to read as a mistake. And the subscribe box was left out of
 * the rule that pulls the footer's content back to a 1280px measure on a wide
 * screen, so it ran the full width of the window while the columns and the
 * copyright line beside it sat 80px in.
 *
 * Neither is visible in a component; both are one selector list away from
 * coming back.
 */
test.describe("the footer", () => {
  test("runs the full width of a phone, like the section above it", async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await page.goto("/contact");

    const card = await page.locator(".ft__card").evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, vw: window.innerWidth };
    });
    expect(card.left).toBeCloseTo(0, 0);
    expect(card.right).toBeCloseTo(card.vw, 0);

    /* Full bleed is not an excuse to run the words into the screen edge: the
       card's own padding still has to hold them off it. */
    const cols = await page.locator(".ft__cols").evaluate((el) => el.getBoundingClientRect().left);
    expect(cols).toBeGreaterThanOrEqual(16);

    const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(wide, "the footer widened the page").toBe(false);
  });

  test("every footer column sits on the same measure", async ({ page }) => {
    /* REWRITTEN, because the layout it described is gone. It used to assert
       that the subscribe box spanned the same edges as `.ft__cols`, which was
       true when the box was a full-width block below the columns. It is a
       COLUMN now, so at 768px it correctly starts at 400 rather than 41 and
       the old assertion failed on a change that was deliberate.

       What is still worth pinning is the thing the original bug was about: the
       subscribe box was once the one block in the footer not pulled back to
       the same measure as everything else. So the assertion is that no column
       escapes the grid, and that the closing line agrees with it. */
    for (const width of [320, 393, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/contact");

      const m = await page.evaluate(() => {
        const cols = document.querySelector(".ft__cols")!.getBoundingClientRect();
        const base = document.querySelector(".ft__base")!.getBoundingClientRect();
        /* Hidden columns are left out: on a phone the Company pills go on
           purpose (the header's menu carries those pages). */
        const children = [...document.querySelectorAll<HTMLElement>(".ft__side, .ft__cols .ft__col")].filter((c) => c.getBoundingClientRect().width > 0).map((c) => {
          const r = c.getBoundingClientRect();
          return {
            name: c.querySelector("h2")?.textContent?.trim() ?? c.className.split(" ")[0],
            escapes: r.left < cols.left - 1 || r.right > cols.right + 1,
          };
        });
        return {
          stray: children.filter((c) => c.escapes).map((c) => c.name),
          baseMatches: Math.abs(base.left - cols.left) < 2 && Math.abs(base.right - cols.right) < 2,
          count: children.length,
        };
      });

      expect(m.stray, `these break the measure at ${width}px`).toEqual([]);
      expect(m.baseMatches, `the closing line is off the measure at ${width}px`).toBe(true);
      expect(m.count, `the footer lost a column at ${width}px`).toBeGreaterThanOrEqual(4);
    }
  });
});


/* ITS OWN CONTEXT, BECAUSE THE RULE UNDER TEST IS `@media (pointer: coarse)`.
   Setting a 393px viewport does not make a browser report a coarse pointer --
   `hasTouch` does. Without it this test passes against a stylesheet it never
   reached, which is worse than not having it. */
test.describe("the footer on a touch screen", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 393, height: 900 } });

  test("the hover underline stops at the end of the words", async ({ page }) => {
    /* THE 44PX TOUCH TARGET AND THE UNDERLINE WERE FIGHTING.

       Under `pointer: coarse` the footer links become `display: flex` with a
       44px minimum height, which is right. What came with it is that a flex
       box there is BLOCK level, so the link's box grew to the whole column --
       and the hover underline is painted as `background-size: 100%` of that
       box. The address got 229px of text under a 353px rule, which read as a
       divider left in by mistake rather than as a hover state.

       Asserted as an overshoot rather than as a width, because the number that
       matters is the gap between the line and the last character. */
    await page.goto("/contact");

    const mail = page.locator(".ft__mail");
    await mail.scrollIntoViewIfNeeded();
    await mail.hover();
    await page.waitForTimeout(400);

    const m = await mail.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(el);
      return {
        overshoot: Math.round(box.width - range.getBoundingClientRect().width),
        height: Math.round(box.height),
        painted: getComputedStyle(el).backgroundSize,
      };
    });

    expect(m.overshoot, "the underline runs past the address").toBeLessThanOrEqual(2);
    expect(m.painted, "the underline did not grow on hover").toContain("100%");
    /* And the target it was widened for is still 44px tall. */
    expect(m.height).toBeGreaterThanOrEqual(44);
  });

});
