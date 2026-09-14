import { expect, test } from "@playwright/test";
import jsQR from "jsqr";
import { PNG } from "pngjs";

/**
 * Printing the money documents, onto one sheet and onto several.
 *
 * WHY THIS IS A TEST AND NOT AN EYEBALL. A print stylesheet is invisible in
 * normal use: nobody opens the page and sees it, and the first person who
 * finds a bug in it is a client holding a piece of paper. Every rule in the
 * `@media print` block of components/money/document.css was written against a
 * real rendered PDF, and three of them were written because the PDF showed
 * something the screen never could:
 *
 *   - the site's skip link printed as a navy button at the top of sheet one;
 *   - a document printed from a dark session came out with a black border on
 *     every sheet, because `color-scheme: dark` paints the page canvas;
 *   - a two-line invoice spilled a second sheet carrying nothing but the
 *     footer, because `min-height: 100dvh` is a full page of height on paper
 *     and the colophon wrapped into a 218px band.
 *
 * So these cases generate actual PDFs and count actual pages. The DOM-level
 * assertions underneath them exist to say WHICH rule broke when a count goes
 * wrong, because "the invoice is two pages now" on its own is a long evening.
 */

const MM = 96 / 25.4;
/* Must match `@page` in components/money/document.css. */
const MARGIN_MM = 12;
const PRINT_W = Math.round((210 - 2 * MARGIN_MM) * MM);
const PRINT_H = Math.round((297 - 2 * MARGIN_MM) * MM);

/* The seeded records in lib/admin/store.ts. i5 exists for this file: a
   retainer with two dozen line items, which is the only way a pagination bug
   is ever found. */
const SHORT = "seedInv1AAAAAAAAAAAAAAA";
const LONG = "seedInv5AAAAAAAAAAAAAAA";
const RECEIPT = "seedRct1AAAAAAAAAAAAAAA";

test.describe.configure({ timeout: 120_000 });

/** Pages in a PDF, counted from its own object table. */
function pageCount(pdf: Buffer) {
  return (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
}

test.describe("printing", () => {
  test("a short invoice prints on ONE sheet", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "page.pdf() is Chromium only.");
    await page.setViewportSize({ width: PRINT_W, height: PRINT_H });
    await page.goto(`/i/${SHORT}`, { waitUntil: "networkidle" });
    const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
    expect(pageCount(pdf), "a two-line invoice must not cost two sheets").toBe(1);
  });

  test("a receipt prints on ONE sheet", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "page.pdf() is Chromium only.");
    await page.setViewportSize({ width: PRINT_W, height: PRINT_H });
    await page.goto(`/r/${RECEIPT}`, { waitUntil: "networkidle" });
    expect(pageCount(await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true }))).toBe(1);
  });

  test("a long invoice paginates, and every sheet says whose it is", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "page.pdf() is Chromium only.");
    await page.setViewportSize({ width: PRINT_W, height: PRINT_H });
    await page.goto(`/i/${LONG}`, { waitUntil: "networkidle" });
    const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
    expect(pageCount(pdf)).toBeGreaterThan(1);

    await page.emulateMedia({ media: "print" });
    const print = await page.evaluate(() => {
      const g = (sel: string, prop: string) => {
        const el = document.querySelector(sel);
        return el ? getComputedStyle(el).getPropertyValue(prop) : "";
      };
      const rows = [...document.querySelectorAll(".doc__lines tbody tr")];
      return {
        /* This one rule is what reprints the column headings after a break.
           Without it, sheet two is a column of money with nothing saying which
           number is the quantity and which is the price. */
        thead: g(".doc__lines thead", "display"),
        /* And this is what puts the invoice number on sheet two, which is
           otherwise anonymous the moment a stapled copy comes apart. */
        runningHead: g(".doc__run", "display"),
        runningHeadText: document.querySelector(".doc__run th")?.textContent?.trim() ?? "",
        /* A row split across the fold puts a description on one sheet and its
           amount on the next. */
        rowsThatMaySplit: rows.filter((r) => getComputedStyle(r).breakInside !== "avoid").length,
        tfoot: g(".doc__lines tfoot", "break-before"),
      };
    });
    expect(print.thead).toBe("table-header-group");
    expect(print.runningHead).toBe("table-row");
    expect(print.runningHeadText).toContain("INV-2026-005");
    expect(print.rowsThatMaySplit, "no line item may be cut in half by a page break").toBe(0);
    expect(print.tfoot, "the totals belong with the items they total").toBe("avoid");
  });

  test("the stamp and the code land on the LAST sheet, once", async ({ page }) => {
    await page.setViewportSize({ width: PRINT_W, height: PRINT_H });
    await page.goto(`/i/${SHORT}`, { waitUntil: "networkidle" });
    await page.emulateMedia({ media: "print" });
    const where = await page.evaluate((H) => {
      const sheet = (sel: string) => {
        const el = document.querySelector(sel);
        if (!el) return -1;
        const r = el.getBoundingClientRect();
        return Math.floor((r.top + scrollY) / H);
      };
      return {
        stamps: document.querySelectorAll(".doc__stamp").length,
        codes: document.querySelectorAll(".doc__qr").length,
        /* ABSOLUTE POSITIONING IN PAGED MEDIA RESOLVES AGAINST THE PAGE ITS
           CONTAINING BLOCK STARTS ON. On screen the stamp is absolute in the
           sheet's bottom-right corner; left that way it printed on page ONE of
           a three-page invoice, over the line items. In print it is static and
           floated, which is why this checks the computed value and not just
           where the box happens to be. */
        stampPosition: getComputedStyle(document.querySelector(".doc__stamp")!).position,
        stampSheet: sheet(".doc__stamp"),
        codeSheet: sheet(".doc__qr"),
        lastSheet: Math.floor((document.querySelector(".doc")!.getBoundingClientRect().height - 1) / H),
      };
    }, PRINT_H);
    expect(where.stamps).toBe(1);
    expect(where.codes).toBe(1);
    expect(where.stampPosition).toBe("static");
    expect(where.stampSheet).toBe(where.lastSheet);
    expect(where.codeSheet).toBe(where.lastSheet);
  });

  test("nothing belonging to the site prints on the document", async ({ page }) => {
    await page.setViewportSize({ width: PRINT_W, height: PRINT_H });
    await page.goto(`/i/${SHORT}`, { waitUntil: "networkidle" });
    await page.emulateMedia({ media: "print" });
    const shell = await page.evaluate(() => {
      const disp = (sel: string) => {
        const el = document.querySelector(sel);
        return el ? getComputedStyle(el).display : "absent";
      };
      const root = getComputedStyle(document.documentElement);
      return {
        /* Hidden by position on screen, so a print picks it up and puts a navy
           button at the top of sheet one. */
        skip: disp(".skip-link"),
        accessibility: disp(".uw"),
        scrollTop: disp(".st"),
        /* The dark theme is what actually darkened the paper: the canvas
           outside the page's margin box is painted from the colour scheme, not
           from the element's background. */
        scheme: root.colorScheme,
        htmlBg: root.backgroundColor,
        bodyBg: getComputedStyle(document.body).backgroundColor,
        /* A full viewport of height on paper is a full sheet of paper. */
        docMinHeight: getComputedStyle(document.querySelector(".doc")!).minHeight,
      };
    });
    expect(shell.skip).toBe("none");
    expect(shell.accessibility).toBe("none");
    expect(shell.scrollTop).toBe("none");
    expect(shell.scheme).toBe("light");
    expect(shell.htmlBg).toBe("rgb(255, 255, 255)");
    expect(shell.bodyBg).toBe("rgb(255, 255, 255)");
    expect(shell.docMinHeight).toBe("auto");
  });

  test("the code still decodes at the size it PRINTS", async ({ browser }) => {
    /* The printed code is vector, so what decides whether it scans is its
       physical size and the resolution of whatever is reading it -- not the
       CSS pixel count the screen test uses. 34mm of paper read at about 300dpi
       is the same information as this box at a device pixel ratio of 3, which
       is what this context asks for. Decoded from the real print layout, since
       the print rules are what shrink the box in the first place. */
    const ctx = await browser.newContext({ deviceScaleFactor: 3, viewport: { width: PRINT_W, height: PRINT_H } });
    const page = await ctx.newPage();
    await page.goto(`/i/${SHORT}`, { waitUntil: "networkidle" });
    await page.emulateMedia({ media: "print" });
    const box = page.locator(".doc__qr").first();
    await box.waitFor();
    const png = PNG.sync.read(await box.screenshot({ type: "png" }));
    const found = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    expect(found, "the printed code does not decode").not.toBeNull();
    expect(found!.data.endsWith(`/i/${SHORT}`)).toBe(true);
    await ctx.close();
  });
});
