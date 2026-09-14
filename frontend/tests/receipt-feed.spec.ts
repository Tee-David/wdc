import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

/**
 * Which way the receipt comes out of the printer.
 *
 * WHY THIS IS A TEST AND NOT A COMMENT. It was built top-first, argued for on
 * the grounds that a print head lays down the top line first, and asked for
 * bottom-first twice. The brief won, and it should not have taken two asks.
 * A decision reversed once gets reversed again by whoever next reads the
 * animation and thinks they have spotted a bug -- so the requirement is
 * written down as an assertion instead of as an opinion in a comment.
 *
 * THE SLIP ONLY RENDERS ON A VERIFIED PAYMENT, which is the whole point of it
 * and means there is no URL a test can visit to see one. So the real
 * stylesheet is loaded against the real markup and the animation is sampled.
 * It tests the CSS, which is where the behaviour lives.
 */

const CSS = readFileSync("components/money/receipt-printer.css", "utf8");

const MARKUP = `
<style>body{margin:0;display:grid;place-items:center;min-height:100vh}${CSS}</style>
<div class="rp">
  <div class="rp__box" aria-hidden="true"><span class="rp__led"></span><span class="rp__slot"></span></div>
  <div class="rp__out"><div class="rp__slip">
    <p class="rp__k">Payment received</p>
    <p class="rp__big">&#8358;300,000.00</p>
    <dl class="rp__rows">
      <div><dt>Receipt</dt><dd>RCT-2026-005</dd></div>
      <div><dt>Paid</dt><dd>14 Sept 2026</dd></div>
      <div><dt>Method</dt><dd>Paystack</dd></div>
      <div><dt>Against</dt><dd>INV-2026-001</dd></div>
    </dl>
    <p class="rp__state rp__state--part">&#8358;377,250.00 still outstanding</p>
    <p class="rp__ta">Thank you</p>
  </div></div>
</div>`;

/** Restart the animation from zero: a `forwards` animation that has finished
 *  cannot be re-sampled without tearing it down and rebuilding it. */
async function replayThen(page: import("@playwright/test").Page, seconds: number) {
  await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>(".rp__slip")!;
    el.style.animation = "none";
    void el.offsetWidth;
    el.style.animation = "";
  });
  await page.waitForTimeout(seconds * 1000);
  return page.evaluate(() => {
    const slip = document.querySelector(".rp__slip")!;
    const win = document.querySelector(".rp__out")!;
    const w = win.getBoundingClientRect();
    return [...slip.querySelectorAll("p, dt")]
      .filter((n) => {
        const r = n.getBoundingClientRect();
        return r.top >= w.top - 1 && r.bottom <= w.bottom + 1;
      })
      .map((n) => n.textContent?.trim() ?? "");
  });
}

test("the paper comes out bottom-first", async ({ page }) => {
  await page.setViewportSize({ width: 520, height: 720 });
  await page.setContent(MARKUP);
  await page.waitForTimeout(150);

  /* Early in the feed: the foot of the slip is out and the head is not. */
  const early = await replayThen(page, 0.6);
  expect(early.join(" | "), "the foot of the slip should clear the slot first")
    .toContain("Thank you");
  expect(early, "the amount must not be out yet — that is top-first")
    .not.toContain("₦300,000.00");
  expect(early, "the heading must not be out yet — that is top-first")
    .not.toContain("Payment received");

  /* Mid feed: more of it, still growing upward toward the head. */
  const mid = await replayThen(page, 1.05);
  expect(mid.length).toBeGreaterThan(early.length);
  expect(mid, "the amount is the last thing to clear the slot")
    .not.toContain("₦300,000.00");

  /* Finished: the whole slip, head included. */
  const done = await replayThen(page, 1.9);
  expect(done).toContain("Payment received");
  expect(done).toContain("₦300,000.00");
  expect(done).toContain("Thank you");
});

test("it holds still for a reader who asked for less motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 520, height: 720 });
  await page.setContent(MARKUP);
  await page.waitForTimeout(250);

  /* No feed, and the whole slip present: somebody who has turned motion off
     still needs the receipt, which is the part that matters. */
  const state = await page.evaluate(() => {
    const slip = document.querySelector<HTMLElement>(".rp__slip")!;
    const win = document.querySelector(".rp__out")!;
    const w = win.getBoundingClientRect();
    const shown = [...slip.querySelectorAll("p")]
      .filter((n) => {
        const r = n.getBoundingClientRect();
        return r.top >= w.top - 1 && r.bottom <= w.bottom + 1;
      })
      .map((n) => n.textContent?.trim() ?? "");
    return { animation: getComputedStyle(slip).animationName, shown };
  });
  expect(state.animation).toBe("none");
  expect(state.shown).toContain("Payment received");
  expect(state.shown).toContain("Thank you");
});
