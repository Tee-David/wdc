import { expect, test } from "@playwright/test";
import { blocksToDoc, cleanDoc, docHeadings, safeHref, safeImage } from "../lib/blog-doc";
import { parsePost } from "../lib/blog-validate";

/**
 * WHAT THE EDITOR CAN PUT ON THE PUBLIC PAGE.
 *
 * The body arrives as a ProseMirror document in a form field, which anybody
 * can POST. These pin the whitelist where it is enforced: allowed structure
 * survives exactly, everything else is dropped rather than escaped.
 */

const BUCKET = "https://media.example-bucket.dev";
const t = (text: string) => ({ type: "text", text });

test("allowed structure survives exactly", () => {
  const doc = {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 2 }, content: [t("Where to start")] },
      { type: "paragraph", content: [t("Plain, "), { type: "text", text: "bold", marks: [{ type: "bold" }] }, t(" and "), { type: "text", text: "a link", marks: [{ type: "link", attrs: { href: "https://wedigcreativity.com.ng/services" } }] }] },
      { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [t("One")] }] }] },
      { type: "blockquote", content: [{ type: "paragraph", content: [t("Said once.")] }] },
      { type: "image", attrs: { src: `${BUCKET}/media/2026/09/a.webp`, alt: "A shop front", width: 1200, height: 800 } },
    ],
  };
  expect(cleanDoc(doc, { imageHosts: [BUCKET] })).toEqual(doc);
});

test("an h1, a script, a javascript link and a foreign picture never survive", () => {
  const out = cleanDoc({
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 1 }, content: [t("Promoted to h2, never an h1")] },
      { type: "script", content: [t("alert(1)")] },
      { type: "codeBlock", content: [t("rm -rf")] },
      { type: "paragraph", attrs: { style: "color:red" }, content: [{ type: "text", text: "click", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }, { type: "underline" }] }] },
      { type: "image", attrs: { src: "https://evil.example/x.png", alt: "x" } },
      { type: "image", attrs: { src: "//evil.example/x.png", alt: "x" } },
      { type: "paragraph", content: [] },
    ],
  }, { imageHosts: [BUCKET] });
  expect(out.content).toEqual([
    { type: "heading", attrs: { level: 2 }, content: [t("Promoted to h2, never an h1")] },
    { type: "paragraph", content: [t("click")] },
  ]);
});

test("links and pictures: only safe addresses", () => {
  expect(safeHref("/services/web")).toBe("/services/web");
  expect(safeHref("mailto:hello@wedigcreativity.com.ng")).toBe("mailto:hello@wedigcreativity.com.ng");
  expect(safeHref("//evil.example")).toBeNull();
  expect(safeHref("data:text/html,x")).toBeNull();
  expect(safeImage("/hero/web.jpg", [])).toBe("/hero/web.jpg");
  expect(safeImage(`${BUCKET}/media/a.png`, [BUCKET])).toBe(`${BUCKET}/media/a.png`);
  expect(safeImage(`${BUCKET}/media/a.png`, [])).toBeNull();
  expect(safeImage("http://media.example-bucket.dev/a.png", [BUCKET])).toBeNull();
});

test("a post written in blocks converts with nothing lost", () => {
  const doc = blocksToDoc([
    { kind: "p", text: "Intro." },
    { kind: "h2", text: "Section" },
    { kind: "h3", text: "Sub" },
    { kind: "list", items: ["a", "b"] },
    { kind: "quote", text: "Words.", who: "Somebody" },
    { kind: "callout", title: "Claim", text: "Evidence." },
  ]);
  expect(docHeadings(doc)).toEqual([{ level: 2, text: "Section" }, { level: 3, text: "Sub" }]);
  expect(cleanDoc(doc)).toEqual(doc);
  expect(JSON.stringify(doc)).toContain("Somebody");
  expect(JSON.stringify(doc)).toContain("Claim");
});

test("the outline rule holds for editor posts: no sub-heading before a heading", () => {
  const base = {
    slug: "outline-check", title: "Outline", seoTitle: "Outline", excerpt: "One line.", topic: "seo", cover: "",
    description: "x".repeat(130), status: "draft",
  };
  const r = parsePost({
    ...base,
    body: JSON.stringify({ type: "doc", content: [
      { type: "heading", attrs: { level: 3 }, content: [t("Too early")] },
      { type: "paragraph", content: [t("Text.")] },
    ] }),
  });
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.errors.body).toContain("first heading");
});
