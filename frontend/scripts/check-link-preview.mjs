/**
 * The tag reading behind /tools/link-preview, against pages written to break
 * it.
 *
 * WHY A SCRIPT. `lib/link-preview.ts` is pure: HTML in, cards and findings
 * out. Booting a browser to hand a function a string proves nothing the
 * function cannot prove faster, and the cases that matter here are the ugly
 * ones -- single quotes, `name=` where the specification says `property=`, an
 * entity in a title, a relative image path, a meta tag sitting in the body of
 * a page ABOUT Open Graph tags. None of those need a network.
 *
 * WHAT THE ROUTE ADDS, and therefore what this cannot check: fetching the page
 * at all, the SSRF guards around that (`npm run check:fetch-page`), and
 * reading the image's header. The browser half -- does a card appear, is a
 * private address refused politely -- is `tests/link-preview.spec.ts`.
 *
 *   npm run check:link-preview
 */
import {
  PLATFORMS, readTags, cardsFor, findingsFor, truncate, decodeEntities, domainOf,
} from "../lib/link-preview.ts";

let failures = 0;
function report(label, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok  " : "FAIL"}  ${label}${ok || !detail ? "" : `  ${detail}`}`);
}

const BASE = "https://example.com/blog/post";

const page = (head, body = "") => `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;

/* --------------------------------------------------------- reading the tags */

console.log("-- the tags, however they are written --");

const plain = readTags(page(`
  <title>A page title</title>
  <meta property="og:title" content="The Open Graph title">
  <meta property="og:description" content="What the page is about.">
  <meta property="og:image" content="/social/card.png">
  <meta name="twitter:card" content="summary_large_image">
`), BASE);
report("og:title wins over the document title", plain.title === "The Open Graph title");
report("a relative image is made absolute",
  plain.image === "https://example.com/social/card.png", plain.image);
report("the card type is read and lower-cased", plain.twitterCard === "summary_large_image");
report("the source of each field is recorded", plain.from.title === "og:title");

const singleQuoted = readTags(page(`<meta property='og:title' content='Quoted with apostrophes'>`), BASE);
report("single quotes are read", singleQuoted.title === "Quoted with apostrophes");

/* Plenty of real pages use `name=` for Open Graph, which the specification
   does not allow and every crawler accepts. */
const wrongAttribute = readTags(page(`<meta name="og:title" content="Written with name=">`), BASE);
report("og tags written with name= are read", wrongAttribute.title === "Written with name=");

const reordered = readTags(page(`<meta content="Content first" property="og:title">`), BASE);
report("attribute order does not matter", reordered.title === "Content first");

const entities = readTags(page(`<meta property="og:title" content="Ada &amp; Sons &#8212; est. 1994">`), BASE);
report("entities are decoded for display",
  entities.title === "Ada & Sons — est. 1994", entities.title);

const spaced = readTags(page(`<title>  A   title   with
  line breaks </title>`), BASE);
report("whitespace is collapsed", spaced.title === "A title with line breaks", spaced.title);

/* A page that DOCUMENTS these tags would otherwise be read as having them. */
const inBody = readTags(page(`<title>How to write og tags</title>`,
  `<code>&lt;meta property="og:title" content="Not real"&gt;</code>
   <meta property="og:title" content="Also not real">`), BASE);
report("a meta tag in the body is not read as the page's own",
  inBody.title === "How to write og tags", inBody.title);

const fallbacks = readTags(page(`
  <title>Only a title</title>
  <meta name="description" content="Only a meta description.">
`), BASE);
report("the document title is the fallback", fallbacks.title === "Only a title");
report("and it is recorded as a fallback", fallbacks.from.title === "<title>");
report("meta description is the last resort", fallbacks.description === "Only a meta description.");

const empty = readTags(page(""), BASE);
report("an empty head gives empty tags, not a crash", empty.title === "" && empty.image === "");
report("a page with no head at all is survived",
  readTags("<p>not a document</p>", BASE).title === "");

/* ------------------------------------------------------------- truncation */

console.log("-- truncation --");
report("short text is untouched", truncate("Nine words", 60).cut === false);
const SENTENCE = "The quick brown fox jumps over the lazy dog and keeps running";
const long = truncate(SENTENCE, 20);
report("long text is cut", long.cut === true);
/* Cut at a word means: what is left is a prefix of the original, and the
   character the original carries on with is a space. Every one of these
   platforms breaks on a word, so a cut mid-syllable would be showing the
   reader something no platform renders. */
const kept = long.text.slice(0, -1);
report("it is cut at a word, not mid-syllable",
  long.text.endsWith("…") && SENTENCE.startsWith(kept) && SENTENCE[kept.length] === " ",
  long.text);
report("and it is no longer than the limit plus the ellipsis", long.text.length <= 21, long.text);
/* A single word longer than the limit has no space to cut at. */
report("one enormous word still gets cut",
  truncate("Supercalifragilisticexpialidocious", 10).text.length <= 11);
report("entities decode before they are counted",
  decodeEntities("A &amp; B") === "A & B");

/* ------------------------------------------------------------- the cards */

console.log("-- the four cards --");
const tags = readTags(page(`
  <meta property="og:title" content="${"Long title ".repeat(20)}">
  <meta property="og:description" content="${"Long description ".repeat(30)}">
  <meta property="og:image" content="https://example.com/card.png">
`), BASE);

const big = cardsFor(tags, { url: "x", bytes: 120 * 1024, width: 1200, height: 630, contentType: "image/png" }, BASE);
report("one card per platform", big.length === PLATFORMS.length);
report("every card is cut somewhere", big.every((c) => c.titleCut));
report("each platform cuts at its own length",
  new Set(big.map((c) => c.title.length)).size > 1);
report("every card carries the domain", big.every((c) => c.domain === "example.com"));
report("all four show the image at 120KB", big.every((c) => c.showsImage));

/* The rule that matters most in this market. */
const heavy = cardsFor(tags, { url: "x", bytes: 900 * 1024, width: 1200, height: 630, contentType: "image/jpeg" }, BASE);
const whatsapp = heavy.find((c) => c.platform.key === "whatsapp");
report("WhatsApp drops an image over 300KB", whatsapp.showsImage === false);
report("and says why, in kilobytes", /900KB/.test(whatsapp.imageReason), whatsapp.imageReason);
report("the other three still show it",
  heavy.filter((c) => c.platform.key !== "whatsapp").every((c) => c.showsImage));

const tiny = cardsFor(tags, { url: "x", bytes: 4_000, width: 64, height: 64, contentType: "image/png" }, BASE);
report("nothing renders an image under 100px", tiny.every((c) => c.showsImage === false));

const noCardType = cardsFor(readTags(page(`<meta property="og:image" content="/a.png">`), BASE), null, BASE);
report("X falls back to the small card without twitter:card",
  noCardType.find((c) => c.platform.key === "x").large === false);
report("the other three are unaffected by twitter:card",
  noCardType.filter((c) => c.platform.key !== "x").every((c) => c.large));

const noImage = cardsFor(readTags(page(`<title>Bare</title>`), BASE), null, BASE);
report("no og:image means no picture anywhere", noImage.every((c) => c.showsImage === false));
report("and the reason names the missing tag",
  noImage.every((c) => /og:image/.test(c.imageReason)));

report("the domain is read without www", domainOf("https://www.example.com/a/b") === "example.com");

/* ---------------------------------------------------------- the findings */

console.log("-- what to fix --");
const good = findingsFor(
  readTags(page(`
    <meta property="og:title" content="A title of about fifty characters, comfortably">
    <meta property="og:description" content="One clear sentence that says what the page is for and stops.">
    <meta property="og:image" content="/card.png">
    <meta property="og:image:alt" content="The studio's mark on a navy field">
    <meta name="twitter:card" content="summary_large_image">
  `), BASE),
  { url: "x", bytes: 180 * 1024, width: 1200, height: 630, contentType: "image/png" },
);
report("a page that has done the work is told so",
  good.every((f) => f.verdict === "good"), JSON.stringify(good.filter((f) => f.verdict !== "good")));

const bare = findingsFor(readTags(page(`<title>Bare page</title>`), BASE), null);
report("a bare page is told about the image first", bare[0].id === "image");
report("the missing image is the loudest verdict", bare[0].verdict === "missing");
report("the missing description is reported", bare.some((f) => f.id === "description" && f.verdict === "missing"));
/* Nothing to say about an alt on an image that does not exist. */
report("no alt finding where there is no image", bare.every((f) => f.id !== "alt"));

const fallbackTitle = findingsFor(readTags(page(`<title>Only a document title</title>`), BASE), null);
report("a title borrowed from <title> is flagged as borrowed",
  fallbackTitle.find((f) => f.id === "title").verdict === "weak");

const unreadable = findingsFor(
  readTags(page(`<meta property="og:image" content="/card.png"><title>T</title>`), BASE),
  { url: "x", bytes: null, width: null, height: null, contentType: null },
);
report("an image we could not read is 'unknown', never 'wrong'",
  unreadable.find((f) => f.id === "image").verdict === "unknown");

console.log(failures === 0 ? "\nAll link preview checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
