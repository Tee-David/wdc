import { expect, test } from "@playwright/test";
import { renderDesign, fillTags, newBlock, validDesign, type Design } from "../lib/email-design";

/* The builder's renderer, as a pure function: no browser, no server. */
const design = (blocks: Design["blocks"]): Design => ({ subject: "Hi {{name}}", preheader: "pre", heading: "Hello {{name | \"friend\"}}", blocks });

test("tags fill with escaped values and fall back when missing", () => {
  const mail = renderDesign(design([{ id: "a", type: "text", text: "Dear {{name}} and {{other | \"you\"}}" }]), { name: "<b>Ada</b>" });
  expect(mail.html).toContain("&lt;b&gt;Ada&lt;/b&gt;");
  expect(mail.html).not.toContain("<b>Ada</b>");
  expect(mail.html).toContain("and you");
});

test("a missing tag with no fallback is empty, never the raw braces", () => {
  expect(fillTags("Hello {{nobody}}!", {})).toBe("Hello !");
});

test("links and bold work, javascript links do not", () => {
  const mail = renderDesign(design([{ id: "a", type: "text", text: "**Hi** [site](https://example.com) [bad](javascript:alert(1))" }]), {});
  expect(mail.html).toContain("<strong>Hi</strong>");
  expect(mail.html).toContain('href="https://example.com"');
  expect(mail.html).not.toContain('href="javascript');
});

test("a system block appears only when the sender supplies it", () => {
  const d = design([{ id: "s", type: "system", key: "lines" }]);
  expect(renderDesign(d, {}).html).not.toContain("LINES-HERE");
  expect(renderDesign(d, {}, { system: { lines: { html: "<p>LINES-HERE</p>", text: "lines" } } }).html).toContain("LINES-HERE");
});

test("an image needs an https address, and the plain text is written out", () => {
  const mail = renderDesign(design([{ id: "i", type: "image", src: "javascript:x", alt: "x", url: "" }, { id: "b", type: "button", label: "Go", url: "https://a.b/c" }]), {});
  expect(mail.html).not.toContain("<img src=\"javascript");
  expect(mail.text).toContain("Go: https://a.b/c");
});

test("validDesign refuses the wrong shape and absurd sizes", () => {
  expect(validDesign({})).toBe(false);
  expect(validDesign({ subject: "", preheader: "", heading: "", blocks: Array.from({ length: 61 }, () => newBlock("divider")) })).toBe(false);
  expect(validDesign(design([newBlock("text")]))).toBe(true);
});

test("a block with a condition shows only to the people it fits", () => {
  const d = design([
    { id: "a", type: "text", text: "FOR CLIENTS", when: { key: "tag.client", is: "filled" } },
    { id: "b", type: "text", text: "FOR EVERYONE ELSE", when: { key: "tag.client", is: "empty" } },
  ]);
  expect(validDesign(d)).toBe(true);
  const client = renderDesign(d, { "tag.client": "yes" });
  expect(client.html).toContain("FOR CLIENTS");
  expect(client.html).not.toContain("FOR EVERYONE ELSE");
  const other = renderDesign(d, {});
  expect(other.html).toContain("FOR EVERYONE ELSE");
  expect(other.html).not.toContain("FOR CLIENTS");
});
