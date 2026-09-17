/**
 * The pure half of the broken-link checker: reading `<a href>` out of one
 * page's HTML. Fetching each link is network-dependent and lives behind
 * `lib/fetch-page.ts`'s SSRF guard, so it is not exercised here.
 *
 *   node --experimental-strip-types scripts/check-broken-links.mjs
 */
import { extractLinks, verdictFor } from "../lib/broken-links.ts";

let failures = 0;
function report(label, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok  " : "FAIL"}  ${label}${ok || !detail ? "" : `  ${detail}`}`);
}

const BASE = "https://example.com/page";
const page = (body) => `<!doctype html><html><body>${body}</body></html>`;

console.log("-- reading links off a page --");

const ordinary = extractLinks(page(`
  <a href="/about">About us</a>
  <a href="https://other.example/pricing">Their <b>pricing</b> page</a>
  <a href="mailto:hello@example.com">Email us</a>
  <a href="tel:+2348000000000">Call us</a>
  <a href="#top">Back to top</a>
  <a href="javascript:void(0)">Do nothing</a>
`), BASE);
report("a relative link resolves against the page", ordinary.some((l) => l.href === "https://example.com/about"));
report("an absolute link is kept as-is", ordinary.some((l) => l.href === "https://other.example/pricing"));
report("markup inside the link text is stripped", ordinary.some((l) => l.text === "Their pricing page"));
report("mailto is not a checkable link", !ordinary.some((l) => l.href.startsWith("mailto")));
report("tel is not a checkable link", !ordinary.some((l) => l.href.startsWith("tel")));
report("an in-page anchor is not a checkable link", !ordinary.some((l) => l.href.includes("#top")));
report("javascript: is never a checkable link", !ordinary.some((l) => l.href.startsWith("javascript")));
report("exactly the four real links are found", ordinary.length === 2, JSON.stringify(ordinary.map((l) => l.href)));

const external = extractLinks(page(`<a href="/local">Local</a><a href="https://other.example/">Other</a><a href="https://www.example.com/also-local">Also local</a>`), BASE);
report("a link on the same host is internal", external.find((l) => l.href.endsWith("/local"))?.external === false);
report("a link on a different host is external", external.find((l) => l.href.includes("other.example"))?.external === true);
report("a www. prefix does not count as a different host", external.find((l) => l.href.includes("also-local"))?.external === false);

const dupes = extractLinks(page(`<a href="/a">First</a><a href="/a">Same link again</a><a href="/a#section">Same link, different anchor</a>`), BASE);
report("the same address is only listed once, anchor and all", dupes.length === 1, JSON.stringify(dupes));

const bare = extractLinks(page(`<a href="#">Nothing</a><a>No href at all</a>`), BASE);
report("a bare # and a missing href are both skipped", bare.length === 0);

const long = extractLinks(page(Array.from({ length: 60 }, (_, i) => `<a href="/p${i}">Page ${i}</a>`).join("")), BASE, 10);
report("the limit is respected", long.length === 10);

const noText = extractLinks(page(`<a href="/icon-only"><svg></svg></a>`), BASE);
report("a link with no text falls back to its address", noText[0]?.text === "/icon-only");

console.log("-- turning a status into a verdict --");
report("2xx is ok", verdictFor(200) === "ok" && verdictFor(204) === "ok" && verdictFor(299) === "ok");
report("4xx is broken", verdictFor(404) === "broken");
report("5xx is broken", verdictFor(503) === "broken");
report("no status at all is unverified", verdictFor(null) === "unverified");

console.log(failures === 0 ? "\nAll broken-link checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
