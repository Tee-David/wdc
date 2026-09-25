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

test("published on today's date is live now, whatever the hour; a later day needs Scheduled", () => {
  const lagosToday = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 10);
  const base = {
    slug: "date-check", title: "Date check", seoTitle: "Date check", excerpt: "One line.", topic: "seo",
    cover: "/hero/ai-key.jpg", description: "x".repeat(130),
  };
  const body = JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [t("Text.")] }] });
  const today = parsePost({ ...base, body, status: "published", publishedAt: lagosToday });
  expect(today.ok).toBe(true);
  if (today.ok) expect(new Date(today.post.publishedAt!).getTime()).toBeLessThanOrEqual(Date.now());

  const later = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
  const future = parsePost({ ...base, body, status: "published", publishedAt: later });
  expect(future.ok).toBe(false);
  if (!future.ok) expect(future.errors.publishedAt).toContain("Choose Scheduled");
  expect(parsePost({ ...base, body, status: "scheduled", publishedAt: later }).ok).toBe(true);
});

test("a picture the whitelist refuses is reported on save, not dropped in silence", () => {
  const base = {
    slug: "picture-check", title: "Pictures", seoTitle: "Pictures", excerpt: "One line.", topic: "seo", cover: "",
    description: "x".repeat(130), status: "draft",
  };
  const r = parsePost({
    ...base,
    body: JSON.stringify({ type: "doc", content: [
      { type: "paragraph", content: [t("Text.")] },
      { type: "image", attrs: { src: "https://elsewhere.example/photo.jpg", alt: "A photo" } },
    ] }),
  });
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.errors.body).toMatch(/One picture or video cannot be used/);
  const ok = parsePost({
    ...base,
    cover: "/hero/ai-key.jpg",
    body: JSON.stringify({ type: "doc", content: [
      { type: "paragraph", content: [t("Text.")] },
      { type: "image", attrs: { src: "/hero/ai-key.jpg", alt: "A key" } },
    ] }),
  });
  expect(ok.ok).toBe(true);
});

test("a cover is one of ours or an upload in our bucket, never another website's", () => {
  const BUCKET = "https://media.example-bucket.dev";
  const base = {
    slug: "cover-check", title: "Covers", seoTitle: "Covers", excerpt: "One line.", topic: "seo",
    description: "x".repeat(130), status: "draft",
    body: JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [t("Text.")] }] }),
  };
  expect(parsePost({ ...base, cover: `${BUCKET}/media/2026/09/shop.webp` }, { imageHosts: [BUCKET] }).ok).toBe(true);
  const other = parsePost({ ...base, cover: "https://elsewhere.example/shop.webp" }, { imageHosts: [BUCKET] });
  expect(other.ok).toBe(false);
  if (!other.ok) expect(other.errors.cover).toMatch(/Upload a cover/);
  expect(parsePost({ ...base, cover: "/hero/ai-key.jpg" }).ok).toBe(true);
});

test("a short video is kept when it is ours, and said when it is not", () => {
  const BUCKET = "https://media.example-bucket.dev";
  const doc = (src: string) => ({ type: "doc", content: [
    { type: "paragraph", content: [t("Before.")] },
    { type: "video", attrs: { src, title: "The site on a phone", width: 1080, height: 1920 } },
    { type: "paragraph", content: [t("After.")] },
  ] });
  const kept = cleanDoc(doc(`${BUCKET}/media/2026/09/tour.mp4`), { imageHosts: [BUCKET] });
  expect(kept.content.map((b) => b.type)).toEqual(["paragraph", "video", "paragraph"]);
  expect(cleanDoc(doc("https://elsewhere.example/tour.mp4"), { imageHosts: [BUCKET] }).content.map((b) => b.type)).toEqual(["paragraph", "paragraph"]);
  /* A picture's address passed off as a video is not a video. */
  expect(cleanDoc(doc(`${BUCKET}/media/2026/09/photo.jpg`), { imageHosts: [BUCKET] }).content.map((b) => b.type)).toEqual(["paragraph", "paragraph"]);
  const refused = parsePost({
    slug: "video-check", title: "Video", seoTitle: "Video", excerpt: "One line.", topic: "seo", cover: "/hero/ai-key.jpg",
    description: "x".repeat(130), status: "draft", body: JSON.stringify(doc("https://elsewhere.example/tour.mp4")),
  }, { imageHosts: [BUCKET] });
  expect(refused.ok).toBe(false);
  if (!refused.ok) expect(refused.errors.body).toMatch(/One picture or video cannot be used/);
});
