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

/* The printer's own structure (components/money/receipt-printer.tsx), with
   sample figures. `rp--run` is what plays it. */
const MARKUP = `
<style>body{margin:0;display:grid;place-items:center;min-height:100vh}${CSS}</style>
<section class="rp rp--run">
  <div class="rp__status"><span class="rp__said"><b>Payment received</b><small>Receipt RCT-2026-005 issued</small></span></div>
  <div class="rp__machine" aria-hidden="true"><div class="rp__bar"><span class="rp__brand">We Dig Creativity</span></div><span class="rp__slot"></span></div>
  <div class="rp__out"><div class="rp__slip">
    <header class="rp__head"><p class="rp__who">We Dig Creativity</p><p class="rp__what">Payment receipt</p></header>
    <dl class="rp__rows rp__meta">
      <div><dt>Receipt</dt><dd>RCT-2026-005</dd></div>
      <div><dt>Date</dt><dd>14 Sept 2026 · 10:42</dd></div>
      <div><dt>Paid by</dt><dd>Paystack</dd></div>
      <div><dt>Invoice</dt><dd>INV-2026-001</dd></div>
    </dl>
    <div class="rp__items"><ul><li><span class="rp__item">Website design and build</span><span class="rp__n">&#8358;630,000.00</span></li></ul></div>
    <dl class="rp__rows rp__sums">
      <div><dt>Subtotal</dt><dd>&#8358;630,000.00</dd></div>
      <div><dt>VAT (7.5%)</dt><dd>&#8358;47,250.00</dd></div>
      <div><dt>Invoice total</dt><dd>&#8358;677,250.00</dd></div>
      <div class="rp__paid"><dt>Paid now</dt><dd>&#8358;300,000.00</dd></div>
    </dl>
    <p class="rp__bal">Balance due <b>&#8358;377,250.00</b></p>
    <div class="rp__code"><p>* RCT-2026-005 *</p></div>
    <p class="rp__ta">Thank you</p>
  </div></div>
</section>`;

/** Restart the animation from zero: a `forwards` animation that has finished
 *  cannot be re-sampled without tearing it down and rebuilding it. */
async function replayThen(page: import("@playwright/test").Page, seconds: number) {
  /* The same restart Replay uses: take the run class off and put it back. */
  await page.evaluate(() => {
    const rp = document.querySelector<HTMLElement>(".rp")!;
    rp.classList.remove("rp--run");
    void rp.offsetWidth;
    rp.classList.add("rp--run");
  });
  await page.waitForTimeout(seconds * 1000);
  return page.evaluate(() => {
    const slip = document.querySelector(".rp__slip")!;
    const win = document.querySelector(".rp__out")!;
    const w = win.getBoundingClientRect();
    return [...slip.querySelectorAll("p, dt, dd")]
      .filter((n) => {
        const r = n.getBoundingClientRect();
        return r.top >= w.top - 1 && r.bottom <= w.bottom + 1;
      })
      .map((n) => n.textContent?.trim() ?? "");
  });
}

test("the paper comes out bottom-first", async ({ page }) => {
  await page.setViewportSize({ width: 520, height: 900 });
  await page.setContent(MARKUP);
  await page.waitForTimeout(150);

  /* The feed starts .4s in and runs 2.4s. Early in it: the foot of the slip
     is out and the head is not. */
  const early = await replayThen(page, 0.6);
  expect(early.join(" | "), "the foot of the slip should clear the slot first")
    .toContain("Thank you");
  expect(early, "the heading must not be out yet — that is top-first")
    .not.toContain("Payment receipt");
  expect(early, "the receipt number at the head must not be out yet")
    .not.toContain("RCT-2026-005");

  /* Mid feed: more of it, still growing upward toward the head. */
  const mid = await replayThen(page, 0.9);
  expect(mid.length).toBeGreaterThan(early.length);
  expect(mid, "the heading is the last thing to clear the slot")
    .not.toContain("Payment receipt");

  /* Finished: the whole slip, head included. */
  const done = await replayThen(page, 3.3);
  expect(done).toContain("Payment receipt");
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
  expect(state.shown).toContain("Payment receipt");
  expect(state.shown).toContain("Thank you");
});
