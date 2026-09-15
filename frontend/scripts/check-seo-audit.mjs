/**
 * The on-page snapshot and the data-cost arithmetic behind /tools/seo.
 *
 * WHY A SCRIPT. Both modules are pure: HTML and a byte count in, findings out.
 * The cases worth writing down are the ones where a page is CORRECT and a
 * careless check would call it broken -- `alt=""` on a decorative image, a
 * robots tag that says something other than noindex, JSON-LD inside an
 * @graph -- because a false alarm on somebody's good page teaches them to
 * ignore the real findings. Roughly half of what follows asserts that nothing
 * was reported.
 *
 *   npm run check:seo-audit
 */
import { read, findings, headline } from "../lib/seo-audit.ts";
import {
  DEFAULT_NAIRA_PER_GB, costOf, waitOf, dataCost, nairaCost, waitLabel, weightLabel,
} from "../lib/data-cost.ts";

let failures = 0;
function report(label, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok  " : "FAIL"}  ${label}${ok || !detail ? "" : `  ${detail}`}`);
}

const URL = "https://example.com/page";
const page = (head, body = "") => `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;
const verdict = (list, id) => list.find((f) => f.id === id)?.verdict;

/* A page that has had the work done. Every check below that asserts "good"
   asserts it against this one. */
const GOOD = page(`
  <title>Business registration in Lagos, done in a week</title>
  <meta name="description" content="We register business names and companies with the CAC, handle the filings, and hand you the certificate. Fixed fee, one week, no trips to Abuja.">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="canonical" href="https://example.com/page">
  <meta property="og:title" content="Business registration in Lagos">
  <meta property="og:description" content="Fixed fee, one week.">
  <meta property="og:image" content="https://example.com/card.png">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"Service","name":"Registration"}</script>
`, `
  <h1>Business registration in Lagos</h1>
  <img src="/a.png" alt="The certificate">
  <img src="/divider.png" alt="">
`);

/* -------------------------------------------------------------- the reading */

console.log("-- what it reads off the page --");
const facts = read(GOOD, URL, 42_000);
report("the title is read", facts.title === "Business registration in Lagos, done in a week");
report("the description is read", facts.description.startsWith("We register business names"));
report("one h1 is found", facts.h1s.length === 1 && facts.h1s[0] === "Business registration in Lagos");
report("the canonical is read", facts.canonical === "https://example.com/page");
report("the viewport is read", facts.viewport.includes("width=device-width"));
report("all three og tags are seen", facts.og.title && facts.og.description && facts.og.image);
report("https is read off the address", facts.https === true);
report("both images are counted", facts.images === 2);
report("an empty alt is not a missing alt", facts.imagesWithoutAlt === 0);
report("the schema type is named", facts.structuredData.join() === "Service");
report("the byte count is carried through", facts.bytes === 42_000);

/* An H1 further down the page is the fault being looked for, so it must be
   found outside the head. */
const twoH1 = read(page(`<title>T</title>`, `<h1>First</h1><section><h1>Second</h1></section>`), URL, 1000);
report("a second h1 anywhere in the body is found", twoH1.h1s.length === 2);
/* Markup inside a heading is not part of the heading's words. */
const markupH1 = read(page(`<title>T</title>`, `<h1>We <em>dig</em> creativity</h1>`), URL, 1000);
report("markup inside an h1 is stripped", markupH1.h1s[0] === "We dig creativity", markupH1.h1s[0]);

const graph = read(page(`<script type="application/ld+json">
  {"@context":"https://schema.org","@graph":[{"@type":"Organization"},{"@type":"WebSite"}]}
</script>`), URL, 1000);
report("types inside an @graph are found", graph.structuredData.includes("Organization") && graph.structuredData.includes("WebSite"));

const arrayLd = read(page(`<script type="application/ld+json">[{"@type":"BreadcrumbList"},{"@type":"FAQPage"}]</script>`), URL, 1000);
report("an array of blocks is read", arrayLd.structuredData.length === 2);

const brokenLd = read(page(`<script type="application/ld+json">{ not json at all }</script>`), URL, 1000);
report("JSON-LD that will not parse counts as none, like Google treats it",
  brokenLd.structuredData.length === 0);

report("a page with no head at all is survived", read("<p>bare</p>", URL, 10).title === "");

/* ------------------------------------------------------------- the findings */

console.log("-- a page that has done the work --");
const clean = findings(read(GOOD, URL, 42_000));
report("nothing is reported as missing", clean.every((f) => f.verdict !== "missing"),
  JSON.stringify(clean.filter((f) => f.verdict === "missing")));
report("every check comes back good", clean.every((f) => f.verdict === "good"),
  JSON.stringify(clean.filter((f) => f.verdict !== "good").map((f) => [f.id, f.verdict])));
report("the headline says so", /rarer than it should be/.test(headline(clean)));

console.log("-- a page that has not --");
const bare = findings(read(page(`<title>Home</title>`, `<img src="/a.png"><img src="/b.png">`), "http://example.com", 2_000_000));
report("no description is reported missing", verdict(bare, "description") === "missing");
report("no h1 is reported missing", verdict(bare, "h1") === "missing");
report("no viewport is reported missing", verdict(bare, "viewport") === "missing");
report("plain http is reported missing", verdict(bare, "https") === "missing");
report("no canonical is reported weak", verdict(bare, "canonical") === "weak");
report("no sharing tags are reported missing", verdict(bare, "og") === "missing");
report("images with no alt are reported weak", verdict(bare, "alt") === "weak");
report("no structured data is reported weak", verdict(bare, "schema") === "weak");
report("a short title is reported weak", verdict(bare, "title") === "weak");

console.log("-- the ones that must not cry wolf --");
/* `noindex` is the only robots value that matters here. A page saying
   "max-image-preview:large" is a page doing something clever, not a fault. */
const clever = findings(read(page(`<title>${"x".repeat(40)}</title><meta name="robots" content="max-image-preview:large, max-snippet:-1">`), URL, 1000));
report("a robots tag without noindex is good", verdict(clever, "robots") === "good");
const hidden = findings(read(page(`<title>T</title><meta name="robots" content="noindex, follow">`), URL, 1000));
report("noindex is the loudest finding on the page", hidden[0].id === "robots" && hidden[0].verdict === "missing");

const onlyDecoration = findings(read(page(`<title>T</title>`, `<img src="/line.png" alt="">`), URL, 1000));
report("a page of decorative images is not scolded", verdict(onlyDecoration, "alt") === "good");
const noImages = findings(read(page(`<title>T</title>`), URL, 1000));
report("a page with no images at all is 'could not tell', not 'wrong'",
  verdict(noImages, "alt") === "unknown");

const longTitle = findings(read(page(`<title>${"Business registration and company formation services in Lagos Nigeria and everywhere else besides"}</title>`), URL, 1000));
report("an over-long title is weak, not missing", verdict(longTitle, "title") === "weak");

/* ------------------------------------------------------------- the data cost */

console.log("-- what it costs a visitor --");
report("the default price is the reviewed one", DEFAULT_NAIRA_PER_GB === 250);
/* One gigabyte at the default rate is the default rate. */
report("a gigabyte costs the price of a gigabyte",
  Math.abs(costOf(1024 * 1024 * 1024) - DEFAULT_NAIRA_PER_GB) < 0.001);
report("half a gigabyte costs half", Math.abs(costOf(512 * 1024 * 1024) - 125) < 0.001);
report("a dearer bundle costs more", costOf(1_000_000, 4_600) > costOf(1_000_000, 250));
/* 400 kilobits a second is 50 kilobytes a second, so a megabyte is about 21
   seconds. Arithmetic, asserted so a changed constant cannot pass unnoticed. */
report("a megabyte takes about twenty seconds on slow 3G",
  Math.abs(waitOf(1024 * 1024) - 20.97) < 0.1, String(waitOf(1024 * 1024)));

const cost = dataCost(2 * 1024 * 1024);
report("a thousand visits is a thousand times one", Math.abs(cost.perThousand - cost.naira * 1000) < 1e-9);
report("two megabytes is not free", cost.naira > 0.4);

console.log("-- the words --");
report("under a naira is said in kobo", nairaCost(0.49) === "49 kobo");
report("a few naira keeps its kobo", nairaCost(4.25) === "₦4.25");
report("hundreds are rounded and grouped", nairaCost(1250.4) === "₦1,250");
report("a long wait is said in minutes", waitLabel(120) === "2 minutes");
report("a middling wait is whole seconds", waitLabel(21) === "21 seconds");
report("a short wait keeps a decimal", waitLabel(1.24) === "1.2 seconds");
report("weight over a megabyte reads in MB", weightLabel(2_200_000) === "2.1MB");
report("weight under a megabyte reads in KB", weightLabel(42_000) === "41KB");

console.log(failures === 0 ? "\nAll SEO snapshot checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
