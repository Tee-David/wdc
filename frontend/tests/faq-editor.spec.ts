import { expect, test } from "@playwright/test";
import { parseFaqs } from "../lib/faq-validate";
import { sayYes } from "./say-yes";

/**
 * The FAQ is edited in the admin and shown everywhere it appears, including
 * the structured data, and a reset brings back what shipped.
 */

const CONNECTION = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;

test("the parser keeps text, drops markup-shaped nonsense in services, and refuses half a pair", () => {
  expect(parseFaqs([{ q: "  Why?  ", a: "Because.", services: ["seo", "nope", "seo"] }]))
    .toEqual({ ok: true, faqs: [{ q: "Why?", a: "Because.", services: ["seo"] }] });
  expect(parseFaqs([{ q: "Why?", a: "" }]).ok).toBe(false);
  expect(parseFaqs([]).ok).toBe(false);
  expect(parseFaqs("not json").ok).toBe(false);
});

test.describe("in the admin", () => {
  test.skip(!CONNECTION, "Needs a database: an edit is a row.");
  test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
  test.describe.configure({ mode: "serial", timeout: 150_000 });

  test("an edited question is live on /contact and in its FAQPage data, and a reset puts it back", async ({ page, baseURL, request }) => {
    await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
    await page.context().addCookies([
      { name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" },
    ]);
    const shipped = "What does WDC actually do?";
    const edited = `What does WDC do, in one sentence? ${Date.now()}`;

    await page.goto("/admin/settings/faq", { waitUntil: "load" });
    const first = page.getByLabel("Question 1", { exact: true });
    await expect(first).toHaveValue(shipped);
    await first.fill(edited);
    await page.getByRole("button", { name: "Save the FAQ" }).click();
    await expect(page.locator(".ad__msg.is-ok")).toContainText("Saved.");

    const contact = await (await request.get("/contact")).text();
    expect(contact).toContain(edited);
    const ld = [...contact.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join("");
    expect(ld).toContain(edited);
    expect(await (await request.get("/")).text()).toContain(edited);

    await page.reload({ waitUntil: "load" });
    await sayYes(page);
    /* The reset form leaves the page once there is nothing to reset, so the
       page's own line is what says it worked. Retried for hydration. */
    await expect(async () => {
      await page.getByRole("button", { name: "Reset to what shipped" }).click({ timeout: 2_000 });
      await expect(page.getByText("Showing the questions that shipped")).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 60_000 });
    const after = await (await request.get("/contact")).text();
    expect(after).toContain(shipped);
    expect(after).not.toContain(edited);
  });
});
