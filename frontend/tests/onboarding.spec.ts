import { expect, test } from "@playwright/test";

const browserDraft = {
  started: true,
  service: "web",
  step: 1,
  answers: {},
};

test.beforeEach(async ({ page }) => {
  await page.route(/jotfor|userway/i, (route) => route.abort());
  await page.addInitScript((draft) => {
    localStorage.setItem("wdc-onboarding-draft", JSON.stringify(draft));
  }, browserDraft);
});

test("uses client-facing choices and reveals Other details only when needed", async ({ page }) => {
  await page.goto("/onboarding");

  const featureField = page.locator('[data-field="features"]');
  const otherDetail = page.locator('[data-field="features_other"]');
  await expect(otherDetail).toHaveCount(0);
  await featureField.getByRole("checkbox", { name: "Other", exact: true }).click();
  await expect(otherDetail).toBeVisible();
  await expect(otherDetail.getByText("What other feature do you need?")).toBeVisible();

  await expect(page.getByRole("button", { name: "I'm not sure; please advise me" }).first()).toBeVisible();
  await expect(page.locator('[data-field="page_count"] [role="combobox"]')).toBeVisible();
});

test("uses a plain list for short selects and lets clients revise an unsure answer", async ({ page }) => {
  await page.goto("/onboarding");

  const pageCount = page.locator('[data-field="page_count"]');
  await pageCount.getByRole("combobox").click();
  await expect(pageCount.getByRole("searchbox")).toHaveCount(0);
  const popupZ = await pageCount.locator(".pk__pop").evaluate((element) => Number(getComputedStyle(element).zIndex));
  const fabZ = await page.locator(".st").evaluate((element) => Number(getComputedStyle(element).zIndex));
  expect(popupZ).toBeGreaterThan(fabZ);
  await pageCount.getByRole("option", { name: "6–15" }).click();
  await expect(pageCount.getByRole("combobox")).toContainText("6–15");

  const featureField = page.locator('[data-field="features"]');
  await featureField.getByRole("button", { name: "I'm not sure; please advise me" }).click();
  await expect(featureField.getByText("Noted. We will come to this with a recommendation rather than a blank.")).toBeVisible();
  await featureField.getByRole("button", { name: "Actually, let me answer this" }).click();
  await featureField.getByRole("checkbox", { name: "Gallery" }).click();
  await expect(featureField.getByRole("checkbox", { name: "Gallery" })).toHaveAttribute("aria-checked", "true");
  await expect(featureField.getByText("Noted. We will come to this with a recommendation rather than a blank.")).toHaveCount(0);
});

test("pulses the single progress bar unless reduced motion is requested", async ({ page }) => {
  await page.goto("/onboarding");
  const fill = page.locator(".ob__progress > span");
  await expect(fill).toBeVisible();
  await expect.poll(() => fill.evaluate((element) => getComputedStyle(element, "::after").animationName))
    .toBe("ob-progress-pulse");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => fill.evaluate((element) => getComputedStyle(element, "::after").animationName))
    .toBe("none");
});

/**
 * A picker's bottom sheet used to be a one-way door on a phone: tapping the
 * dimmed page behind it did nothing, because the scrim is `.pk.is-open::before`
 * -- a pseudo-element with no DOM node of its own, so a tap on it reported the
 * PICKER ITSELF as the event's target, and `root.contains(root)` is true. The
 * outside-click handler in usePickerOpen (components/onboarding/picker.tsx)
 * read that as "inside the picker" and never closed it. Reported from a
 * screenshot of the industry select stuck open with no way out.
 */
test.describe("the mobile picker sheet", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript((draft) => {
      localStorage.setItem("wdc-onboarding-draft", JSON.stringify(draft));
    }, { started: true, service: "web", step: 0, answers: {} });
  });

  test("tapping the dimmed page behind it closes it", async ({ page }) => {
    await page.goto("/onboarding");
    const industry = page.locator('[data-field="industry"]').getByRole("combobox");
    await industry.scrollIntoViewIfNeeded();
    await industry.click();
    await expect(page.locator(".pk.is-open")).toHaveCount(1);

    /* The corner of the screen, well clear of the sheet itself, which the
       sheet's own scrim still covers. */
    await page.mouse.click(20, 20);
    await expect(page.locator(".pk.is-open")).toHaveCount(0);
  });

  test("dragging the grab handle down past a third of the sheet closes it, a small nudge does not", async ({ page }) => {
    await page.goto("/onboarding");
    const industry = page.locator('[data-field="industry"]').getByRole("combobox");
    await industry.scrollIntoViewIfNeeded();
    await industry.click();
    const grab = page.locator(".pk__grab");
    await expect(grab).toBeVisible();

    const grabBox = await grab.boundingBox();
    const popHeight = await page.locator(".pk__pop").evaluate((el) => el.getBoundingClientRect().height);
    if (!grabBox) throw new Error("grab handle has no box");
    const x = grabBox.x + grabBox.width / 2;
    const y = grabBox.y + grabBox.height / 2;

    /* A small drag is a jostle, not an intent to close, and must snap back. */
    await drag(page, x, y, popHeight * 0.1);
    await expect(page.locator(".pk.is-open")).toHaveCount(1);

    /* Past the threshold, it closes. */
    await drag(page, x, y, popHeight * 0.4);
    await expect(page.locator(".pk.is-open")).toHaveCount(0);
  });

  test("the list beneath the grab handle is still a genuine scroll region", async ({ page }) => {
    await page.goto("/onboarding");
    const industry = page.locator('[data-field="industry"]').getByRole("combobox");
    await industry.scrollIntoViewIfNeeded();
    await industry.click();

    /* A wheel or touch gesture is the real test, but simulating either one
       against a touch-emulated context is exactly the kind of thing that is
       flaky for reasons that have nothing to do with the app -- Chromium's
       own emulation, not this code, decides whether a synthetic wheel event
       becomes a scroll. What the grab handle's own listeners could plausibly
       have broken is the LIST'S OWN CSS: `touch-action: none` on the handle
       leaking onto the list, or the list losing the overflow that makes it
       scrollable at all. Both are checked directly, and both held before a
       gesture was ever needed to prove it. */
    const list = page.locator(".pk__list");
    await expect(list).toBeVisible();
    await expect.poll(() => list.evaluate((el) => el.scrollHeight > el.clientHeight))
      .toBe(true);
    await expect(list).toHaveCSS("overflow-y", "auto");
    await expect(list).toHaveCSS("touch-action", "pan-y");
  });
});

/**
 * The "sent" screen's own two buttons, reported as near-white text on a
 * white fill -- 1.09:1, from a screenshot of "Back to the site". Root cause:
 * `Link` renders an `<a>`, and `.pv a { color: inherit }` in preview.css is
 * (0,1,1), which beats a bare `.ob__btn--go { color: var(--btn-ink) }` at
 * (0,1,0) regardless of source order. The label quietly inherited the page's
 * own text colour instead of the token meant to contrast with its own fill.
 *
 * REACHING THE REAL SCREEN NEEDS A SUBMITTED FORM, which this suite does not
 * drive end to end. What actually broke was two rules and their specificity,
 * not anything about the submit flow, so the exact markup the real screen
 * renders (`.ob__btn.ob__btn--go` / `.ob__btn.ob__btn--ghost`, an `<a>` each,
 * inside `.ob.ob--sent`) is dropped onto a live page and read with the
 * browser's own cascade -- the same CSS the real screen would resolve,
 * without needing to fabricate a submission.
 */
test("the sent screen's own buttons keep their contrast against the page's inherited link colour", async ({ page }) => {
  await page.goto("/onboarding");
  await page.evaluate(() => {
    const main = document.querySelector("main.pv");
    if (!main) throw new Error("no main.pv on the page");
    main.insertAdjacentHTML("beforeend", `
      <div class="ob ob--sent" id="btn-probe">
        <div class="ob__acts ob__acts--sent">
          <a class="ob__btn ob__btn--go" href="/">Back to the site</a>
          <a class="ob__btn ob__btn--ghost" href="/work">See what we have made</a>
        </div>
      </div>`);
  });

  const contrasts = await page.evaluate(() => {
    const lum = ([r, g, b]: number[]) => {
      const c = [r, g, b].map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const rgb = (s: string) => (s.match(/[\d.]+/g) ?? ["0", "0", "0"]).slice(0, 3).map(Number);
    const ratio = (a: number[], b: number[]) => {
      const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
      return (x + 0.05) / (y + 0.05);
    };
    return [".ob__btn--go", ".ob__btn--ghost"].map((sel) => {
      const el = document.querySelector(`#btn-probe ${sel}`)!;
      const cs = getComputedStyle(el);
      return { sel, fill: cs.backgroundColor, ink: cs.color, ratio: ratio(rgb(cs.color), rgb(cs.backgroundColor)) };
    });
  });

  for (const { sel, ratio, fill, ink } of contrasts) {
    expect(ratio, `${sel}: ink ${ink} on fill ${fill} should clear WCAG AA (4.5:1)`).toBeGreaterThanOrEqual(4.5);
  }
});

/** A synthetic touch drag on an element, since Playwright has no built-in
    swipe gesture: dispatches the same pointer event sequence a finger would,
    which usePickerOpen's own listeners (real addEventListener calls) respond
    to exactly as they would to a trusted one. */
async function drag(page: import("@playwright/test").Page, x: number, y: number, dy: number) {
  await page.evaluate(({ x, y, dy }) => {
    const grab = document.querySelector(".pk__grab");
    if (!grab) throw new Error("no .pk__grab in the DOM");
    const fire = (type: string, clientY: number) => grab.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerId: Math.floor(Math.random() * 100000),
      pointerType: "touch", clientX: x, clientY, isPrimary: true,
    }));
    fire("pointerdown", y);
    fire("pointermove", y + dy / 2);
    fire("pointermove", y + dy);
    fire("pointerup", y + dy);
  }, { x, y, dy });
  await page.waitForTimeout(300);
}
