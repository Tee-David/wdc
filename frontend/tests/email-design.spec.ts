import { expect, test } from "@playwright/test";
import { renderDesign, fillTags, mdToHtml, sanitizeEmailHtml, newBlock, tagText, tagUses, validDesign, type Design } from "../lib/email-design";

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

/* ------------------------------------------------ the builder's rich text */

const rich = (text: string, vars: Record<string, string> = {}) => renderDesign(design([{ id: "r", type: "text", text }]), vars);
/* The sanitizer alone: the email shell around it carries its own style block and links. */
const clean = (text: string, vars: Record<string, string> = {}) => sanitizeEmailHtml(text, vars);

test("rich text keeps the allowed tags and drops everything else", () => {
  const mail = rich('<h2>Title</h2><p>One <strong>bold</strong>, <b>b</b>, <em>em</em>, <i>i</i> and <u>under</u><br>next</p><ul><li><p>A</p></li><li><p>B</p></li></ul><ol><li><p>C</p></li></ol><blockquote><p>Said</p></blockquote>');
  for (const t of ["<h2", "<strong>bold</strong>", "<em>em</em>", "<u>under</u>", "<br>", "<ul", "<ol", "<li", "<blockquote"]) expect(mail.html).toContain(t);
  expect(mail.text).toContain("TITLE");
  expect(mail.text).toContain("- A");
  expect(mail.text).toContain("1. C");
  expect(mail.text).toContain("> Said");
});

test("the sanitizer strips script, event handlers, styles and javascript links", () => {
  const out = clean(
    '<p onclick="x()" style="background:url(javascript:1)">Hi<script>alert(1)</script><img src=x onerror=alert(2)><style>p{}</style>'
    + ' <a href="javascript:alert(3)" onclick="x()">bad</a> <a href=" javascript:alert(4)">bad2</a> <a href="data:text/html,x">bad3</a>'
    + ' <a href="https://ok.example/a?b=1&c=2" target="_blank" onmouseover="x()">good</a> <a href="mailto:a@b.co">mail</a></p><iframe src="https://evil"></iframe>',
  );
  expect(out.html).not.toMatch(/<script|onerror|onclick|onmouseover|<img|<style|<iframe|javascript:|data:text|alert\(|background/i);
  expect(out.html).toContain('href="https://ok.example/a?b=1&amp;c=2"');
  expect(out.html).toContain('href="mailto:a@b.co"');
  expect((out.html.match(/<a /g) ?? []).length).toBe(2);
  expect(out.html).toContain("bad3");
  expect(out.text).toContain("good (https://ok.example/a?b=1&c=2)");
  expect(out.text).not.toMatch(/alert|script/);
  /* and the shell around it carries none of it either */
  expect(rich("<p>x<script>alert(1)</script></p>").html).not.toContain("alert(1)");
});

test("rich text escapes loose markup and a merged value cannot become markup", () => {
  const mail = rich("<p>1 < 2 &amp; <b>{{name}}</b> <custom>kept</custom></p>", { name: "<img src=x onerror=1>" });
  expect(mail.html).toContain("1 &lt; 2 &amp;");
  expect(mail.html).toContain("<strong>&lt;img src=x onerror=1&gt;</strong>");
  expect(mail.html).not.toContain("<custom");
  expect(mail.html).toContain("kept");
});

test("a link whose merge tag fills in a safe address works, and an unsafe one is dropped", () => {
  const vars = { "links.x": "https://a.example/x", "links.bad": "javascript:alert(1)" };
  const d = (href: string) => clean(`<p><a href="${href}">go</a></p>`, vars).html;
  expect(d("{{links.x}}")).toContain('href="https://a.example/x"');
  expect(d("{{links.bad}}")).not.toMatch(/<a |javascript/);
  expect(d("{{links.missing}}")).not.toContain("<a ");
});

test("merge tags with a fallback fill in rich HTML and in the plain text", () => {
  const body = '<p>Hi {{client.first_name | "there"}}, about {{project.title}}.</p>';
  const filled = rich(body, { "client.first_name": "Ada", "project.title": "Site" });
  expect(filled.html).toContain("Hi Ada, about Site.");
  expect(filled.text).toContain("Hi Ada, about Site.");
  const empty = rich(body, {});
  expect(empty.html).toContain("Hi there, about .");
  expect(empty.text).toContain("Hi there, about .");
});

test("text alignment survives only as left, centre or right, and empty paragraphs vanish", () => {
  const out = clean('<p style="text-align:center">Mid</p><p style="text-align:expression(x)">Plain</p><p></p><p> </p>');
  expect(out.html).toContain("text-align:center");
  expect(out.html).not.toContain("expression");
  expect((out.html.match(/<p /g) ?? []).length).toBe(2);
});

test("old markdown text still renders as before, and converts to the editor's HTML without loss", () => {
  const old = "Hi {{name}},\n\nread **this** and [there](https://example.com)\nnext line";
  const mail = rich(old, { name: "Ada" });
  expect(mail.html).toContain("Hi Ada,");
  expect(mail.html).toContain("<strong>this</strong>");
  expect(mail.html).toContain('href="https://example.com"');
  expect(mail.html).toContain("<br>next line");
  const converted = rich(mdToHtml(old), { name: "Ada" });
  expect(converted.html).toContain("Hi Ada,");
  expect(converted.html).toContain("<strong>this</strong>");
  expect(converted.html).toContain('href="https://example.com"');
  expect(converted.text).toContain("this");
});

test("old markdown text is escaped around its tags too", () => {
  expect(rich("1 < 2 <script>x</script> {{n}}", { n: "<b>" }).html).not.toMatch(/<script|<b>/);
});

test("columns and small print take rich text, and a condition still hides them", () => {
  const d = design([
    { id: "c", type: "columns", left: "<p>LEFT</p>", right: "<ul><li><p>RIGHT</p></li></ul>" },
    { id: "n", type: "note", text: "<p>SMALL</p>", when: { key: "tag.client", is: "filled" } },
  ]);
  const without = renderDesign(d, {});
  expect(without.html).toContain("LEFT");
  expect(without.html).toContain("RIGHT");
  expect(without.html).not.toContain("SMALL");
  expect(renderDesign(d, { "tag.client": "y" }).html).toContain("SMALL");
});

test("tag helpers write and read the stored form", () => {
  expect(tagText("a.b", 'x"y')).toBe('{{a.b | "xy"}}');
  expect(tagText("a.b")).toBe("{{a.b}}");
  expect(tagUses('{{A.b | "z"}} {{c}}')).toEqual([{ key: "a.b", fallback: "z" }, { key: "c", fallback: undefined }]);
});
