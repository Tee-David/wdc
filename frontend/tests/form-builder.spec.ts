import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import pg from "pg";
import { checkAnswers, cleanDef } from "../lib/forms/custom-def";

/**
 * THE FORM BUILDER, END TO END: build a form with a conditional question,
 * publish it, answer it as a visitor (a bad answer is refused and said; the
 * condition shows and hides a question), and read the entry in the admin.
 */
const CONNECTION = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
const SLUG = `e2e-${randomUUID().slice(0, 6)}`;

function pool() {
  const url = new URL(CONNECTION!);
  url.searchParams.delete("sslmode");
  const configured = process.env.COCKROACHDB_CERT || "";
  const local = process.env.APPDATA ? path.join(process.env.APPDATA, "postgresql", "root.crt") : "";
  const ca = configured.startsWith("-----BEGIN CERTIFICATE-----") ? configured.replace(/\\n/g, "\n") : local && fs.existsSync(local) ? fs.readFileSync(local, "utf8") : undefined;
  return new pg.Pool({ connectionString: url.toString(), ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) }, max: 2 });
}

test.describe("rules", () => {
  test("an address needs its street, city and a real country; a country field takes only countries", () => {
    const { def } = cleanDef({ title: "Ship", fields: [
      { id: "where", type: "address", label: "Delivery address", required: true },
      { id: "from", type: "country", label: "Where are you based?" },
    ] });
    expect(checkAnswers(def, {}).errors).toEqual({ where: "This one is needed." });
    expect(checkAnswers(def, { where: ["12 Allen Avenue", "", "", "Nigeria"] }).errors).toEqual({ where: "Add the city or town." });
    expect(checkAnswers(def, { where: ["12 Allen Avenue", "Ikeja", "Lagos", "Narnia"] }).errors).toEqual({ where: "Pick the country from the list." });
    const ok = checkAnswers(def, { where: ["12 Allen Avenue", "Ikeja", "", "Nigeria"], from: "Ghana" });
    expect(ok.errors).toEqual({});
    expect(ok.answers.where).toEqual(["12 Allen Avenue", "Ikeja", "", "Nigeria"]);
    expect(checkAnswers(def, { where: ["1 A St", "B", "", "Nigeria"], from: "Atlantis" }).errors).toEqual({ from: "Pick the country from the list." });
  });

  test("a definition is cleaned, and answers are held to their questions", () => {
    const { def, errors } = cleanDef({
      title: "Event", fields: [
        { id: "email", type: "email", label: "Email", required: true },
        { id: "diet", type: "radio", label: "Food", options: ["Meat", "Vegetarian"], required: true },
        { id: "allergy", type: "text", label: "Allergies", showIf: { field: "diet", equals: ["Vegetarian"] }, required: true },
        { id: "evil", type: "script", label: "x" },
      ],
    });
    expect(errors).toEqual([]);
    expect(def.fields.map((f) => f.id)).toEqual(["email", "diet", "allergy"]);
    expect(checkAnswers(def, { email: "nope", diet: "Meat" }).errors).toEqual({ email: "Enter an email like name@example.com." });
    /* The conditional question is only checked when it is showing. */
    expect(checkAnswers(def, { email: "a@b.co", diet: "Meat" }).errors).toEqual({});
    expect(checkAnswers(def, { email: "a@b.co", diet: "Vegetarian" }).errors).toEqual({ allergy: "This one is needed." });
    expect(checkAnswers(def, { email: "a@b.co", diet: "Fish" }).errors.diet).toBe("Pick one of the choices.");
    /* A file answer must be one this form signed. */
    const files = cleanDef({ title: "F", fields: [{ id: "cv", type: "file", label: "CV", required: true }] }).def;
    expect(checkAnswers(files, { cv: [{ key: "elsewhere/x.pdf", name: "x.pdf", size: 10 }] }, "forms/f/").errors.cv).toBe("This one is needed.");
    expect(checkAnswers(files, { cv: [{ key: "forms/f/x.pdf", name: "x.pdf", size: 10 }] }, "forms/f/").errors).toEqual({});
  });
});

test.describe("in the browser", () => {
  test.skip(!CONNECTION || !TOKEN, "Needs a database and BONEYARD_CAPTURE_TOKEN.");
  test.describe.configure({ mode: "serial", timeout: 180_000 });
  const db = CONNECTION ? pool() : null;
  test.afterAll(async () => {
    await db?.query("DELETE FROM custom_entries WHERE form_key = $1", [`form-${SLUG}`]).catch(() => undefined);
    await db?.query("DELETE FROM custom_form_versions WHERE form_key = $1", [`form-${SLUG}`]).catch(() => undefined);
    await db?.query("DELETE FROM custom_forms WHERE key = $1", [`form-${SLUG}`]).catch(() => undefined);
    await db?.end();
  });

  async function asOwner(page: Page, baseURL?: string) {
    await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
    await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" }]);
  }

  test("build, publish, answer, and read the entry", async ({ page, browser, baseURL }) => {
    await asOwner(page, baseURL);
    await page.goto("/admin/forms/new", { waitUntil: "networkidle" });
    await page.getByLabel(/^Name/).fill("Workshop sign-up");
    await page.getByLabel(/^Address/).fill(SLUG);
    await page.getByRole("button", { name: "Create and add questions" }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/forms/form-${SLUG}/build`), { timeout: 30_000 });

    /* A choice, and a question shown only for one of its answers. */
    await page.getByRole("button", { name: "Add a question" }).click();
    await page.getByRole("group", { name: "Question types" }).getByRole("button", { name: "One choice" }).click();
    await page.getByLabel("Question", { exact: true }).last().fill("Which session?");
    await page.getByLabel("Choices, one per line").fill("Morning\nAfternoon");
    await page.getByRole("button", { name: "Add a question" }).click();
    await page.getByRole("group", { name: "Question types" }).getByRole("button", { name: "Short answer" }).click();
    await page.getByLabel("Question", { exact: true }).last().fill("Where will you travel from?");
    await page.getByText("Only show this when an earlier answer is").last().click();
    await page.getByRole("checkbox", { name: "Morning" }).check();

    /* The preview follows: the conditional question is hidden until Morning is picked. */
    const preview = page.getByRole("complementary", { name: "Preview" });
    await expect(preview.getByText("Which session?")).toBeVisible();
    await expect(preview.getByText("Where will you travel from?")).toHaveCount(0);
    await preview.getByLabel("Morning").check();
    await expect(preview.getByText("Where will you travel from?")).toBeVisible();

    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(page.locator(".adToast", { hasText: "Published" })).toBeVisible({ timeout: 20_000 });

    /* A visitor, with no admin session. */
    const visitor = await (await browser.newContext({ baseURL })).newPage();
    await visitor.goto(`/f/${SLUG}`, { waitUntil: "networkidle" });
    await expect(visitor.getByRole("heading", { level: 1, name: "Workshop sign-up" })).toBeVisible();
    await visitor.getByLabel(/^Your name/).fill("Ada Okafor");
    await visitor.getByLabel(/^Email/).fill("not-an-email");
    await visitor.getByLabel("Afternoon").check();
    await expect(visitor.getByLabel(/^Where will you travel from/)).toHaveCount(0);
    await visitor.getByRole("button", { name: "Send" }).click();
    await expect(visitor.getByText("Enter an email like name@example.com.")).toBeVisible();
    await visitor.getByLabel(/^Email/).fill("ada@example.com");
    await visitor.getByLabel("Morning").check();
    await visitor.getByLabel(/^Where will you travel from/).fill("Ikeja");
    await visitor.getByRole("button", { name: "Send" }).click();
    await expect(visitor.getByText("Sent.")).toBeVisible({ timeout: 20_000 });

    const row = await db!.query<{ id: string; answers: Record<string, string>; version: string }>("SELECT id, answers, version FROM custom_entries WHERE form_key = $1", [`form-${SLUG}`]);
    expect(row.rowCount).toBe(1);
    expect(Object.values(row.rows[0].answers)).toEqual(expect.arrayContaining(["Ada Okafor", "ada@example.com", "Morning", "Ikeja"]));
    expect(Number(row.rows[0].version)).toBe(1);

    /* In the admin: listed, and readable with the questions it answered. */
    await page.goto(`/admin/forms/form-${SLUG}`, { waitUntil: "networkidle" });
    await expect(page.getByText("ada@example.com").first()).toBeVisible();
    await page.goto(`/admin/forms/form-${SLUG}/entries/${row.rows[0].id}`, { waitUntil: "networkidle" });
    await expect(page.getByText("Where will you travel from?")).toBeVisible();
    await expect(page.getByText("Ikeja")).toBeVisible();
  });
});
