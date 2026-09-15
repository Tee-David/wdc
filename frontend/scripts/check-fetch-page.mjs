/**
 * The SSRF guards on `lib/fetch-page.ts`, checked case by case.
 *
 * THIS IS THE ONE PIECE OF THIS PROJECT WHERE A MISS IS NOT A COSMETIC BUG.
 * A fetcher that accepts a URL from a stranger and gets one range wrong hands
 * them our private network, so every block is asserted individually rather
 * than trusting one "it looks blocked" spot check. The cases below are the
 * addresses that actually get used: cloud metadata, loopback in its several
 * spellings, the private ranges, CGNAT, and an IPv4 address wearing an IPv6
 * coat.
 *
 * THE POSITIVE CASES MATTER JUST AS MUCH. A guard that blocks everything is
 * easy and useless, so roughly half of what follows asserts that an ordinary
 * public address is allowed through.
 *
 *   npm run check:fetch-page
 *
 * No network is touched. These are the pure rules from `lib/net-guard.ts`,
 * which is why they live in their own module: `fetch-page.ts` imports
 * `server-only`, which does not resolve outside Next, and a security guard
 * that cannot be run directly is one nobody runs.
 */
import { readUrl, addressIsPublic } from "../lib/net-guard.ts";

let failures = 0;
function report(label, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok  " : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`);
}

const blocked = (ip) => report(`blocks ${ip}`, addressIsPublic(ip) === false);
const allowed = (ip) => report(`allows ${ip}`, addressIsPublic(ip) === true);

console.log("-- addresses that are not the public internet --");
blocked("169.254.169.254");   // the cloud metadata endpoint, the whole reason
blocked("169.254.0.1");
blocked("127.0.0.1");
blocked("127.1.2.3");         // all of 127/8, not just .0.1
blocked("0.0.0.0");
blocked("10.0.0.1");
blocked("10.255.255.255");
blocked("172.16.0.1");
blocked("172.31.255.255");    // top of the /12
blocked("192.168.1.1");
blocked("100.64.0.1");        // CGNAT
blocked("100.127.255.255");
blocked("192.0.2.1");
blocked("198.18.0.1");
blocked("224.0.0.1");         // multicast
blocked("255.255.255.255");
blocked("::1");
blocked("::");
blocked("fc00::1");           // unique local
blocked("fd12:3456::1");
blocked("fe80::1");           // link-local
blocked("ff02::1");           // multicast
blocked("::ffff:127.0.0.1");  // loopback in an IPv6 coat
blocked("::ffff:169.254.169.254");
blocked("2002:7f00:1::");     // 6to4 wrapping 127.0.0.1
blocked("64:ff9b::1");        // NAT64

console.log("\n-- ordinary public addresses, which must still work --");
allowed("8.8.8.8");
allowed("1.1.1.1");
allowed("93.184.216.34");
allowed("172.15.255.255");    // just BELOW the private /12
allowed("172.32.0.1");        // just ABOVE it
allowed("100.63.255.255");    // just below CGNAT
allowed("100.128.0.1");       // just above it
allowed("11.0.0.1");          // just above 10/8
allowed("126.255.255.255");   // just below 127/8
allowed("128.0.0.1");         // just above it
allowed("2606:4700:4700::1111");
allowed("2001:4860:4860::8888");

console.log("\n-- what the URL parser accepts and refuses --");
const reason = (input) => {
  const out = readUrl(input);
  return typeof out === "string" ? out : "ok";
};
report("a bare domain becomes https", reason("example.com") === "ok" && String(readUrl("example.com")).startsWith("https://"));
report("https is fine", reason("https://example.com/a?b=c") === "ok");
report("http is fine", reason("http://example.com") === "ok");
report("refuses file:", reason("file:///etc/passwd") === "blocked-scheme", reason("file:///etc/passwd"));
report("refuses data:", reason("data:text/html,<b>x</b>") === "blocked-scheme", reason("data:text/html,<b>x</b>"));
report("refuses gopher:", reason("gopher://x/1") === "blocked-scheme", reason("gopher://x/1"));
report("refuses credentials in the URL", reason("http://user:pass@example.com") === "bad-url", reason("http://user:pass@example.com"));
report("refuses an odd port", reason("http://example.com:6379/") === "blocked-port", reason("http://example.com:6379/"));
report("refuses 8080 too", reason("http://example.com:8080/") === "blocked-port");
report("allows an explicit :443", reason("https://example.com:443/") === "ok");
report("allows an explicit :80", reason("http://example.com:80/") === "ok");
report("refuses an empty string", reason("") === "bad-url");
report("refuses a 3KB URL", reason(`https://example.com/${"a".repeat(3000)}`) === "bad-url");

console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
