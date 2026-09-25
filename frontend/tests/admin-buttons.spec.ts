import { expect, test } from "@playwright/test";

/**
 * THE ADMIN'S PRIMARY BUTTON READS, whether it is a <button> or a link.
 *
 * The admin's link reset was written as ".ad a { color: inherit }", which
 * outranks ".ad__btn--primary", so every primary that was a link ("New post",
 * "Write the first post", "Add client") took the colour of what it sat in:
 * navy on a navy fill in light mode, a faded lilac on orange in dark. The
 * label is measured against its own fill, in both themes, on the pages that
 * carry link-buttons.
 */
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
test.use({ extraHTTPHeaders: { "x-boneyard-capture": TOKEN ?? "" } });

for (const theme of ["light", "dark"] as const) {
  test(`every primary button's label reads on its fill (${theme})`, async ({ page }) => {
    for (const path of ["/admin/blog", "/admin/clients", "/admin/money", "/admin/projects"]) {
      await page.goto(path, { waitUntil: "load" });
      await page.evaluate((t) => document.documentElement.classList.toggle("dark", t === "dark"), theme);
      await page.waitForTimeout(500); /* the buttons ease their colours */
      const ratios = await page.locator(".ad__btn--primary:visible").evaluateAll((els) => {
        const rgb = (v: string) => (v.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
        const lum = (c: number[]) => {
          const [r, g, b] = c.map((x) => { const s = x / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        return els.map((el) => {
          const cs = getComputedStyle(el);
          const [a, b] = [lum(rgb(cs.color)), lum(rgb(cs.backgroundColor))];
          return { text: (el.textContent ?? "").trim(), ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
        });
      });
      for (const r of ratios) expect(r.ratio, `${path}: "${r.text}"`).toBeGreaterThanOrEqual(4.5);
    }
  });
}
