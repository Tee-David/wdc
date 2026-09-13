/**
 * Re-shoot the homepage link preview card.
 *
 *   npm run build && npx next start -p 3400
 *   node scripts/shoot-og-card.mjs            (defaults to port 3400)
 *
 * WHY A SCRIPT AND NOT A ONE-OFF. The card is a photograph of the hero, so it
 * goes stale the moment the hero changes -- the headline, the buttons, the
 * marquee, the logo. A screenshot nobody can reproduce becomes a picture of a
 * site that no longer exists. This is the reproduction.
 *
 * Three things have to be true at the shutter, and each one failed first:
 *   - the preloader must be gone. Capturing under it produced an 8KB JPEG
 *     twice, which is the weight of a flat overlay rather than a photograph;
 *   - the hero photograph must have decoded, or the card is a dark rectangle;
 *   - the rotating line must have JUST finished typing the phrase. Matching
 *     the string alone caught it one frame into being deleted.
 */
import pw from "playwright";
import sharp from "sharp";
import fs from "node:fs";
const { chromium } = pw;
const PHRASE = process.env.OG_PHRASE ?? "your best decision?";
const PORT = process.env.OG_PORT ?? "3400";

const b = await chromium.launch({ channel: "chrome" });
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
await p.addInitScript(() => { try { localStorage.setItem("wdc-intro-seen-at", String(Date.now())); } catch {} });
await p.goto("`http://localhost:${PORT}/`", { waitUntil: "load", timeout: 90000 });

/* THE PRELOADER COVERS THE PAGE ON EVERY LOAD. Capturing under it is what
   produced an 8KB JPEG twice -- that is the weight of a flat overlay, not of a
   photograph. */
await p.waitForFunction(() => !document.querySelector(".pl"), null, { timeout: 40000 }).catch(() => {});
await p.waitForFunction(() => {
  const img = document.querySelector(".hero-backdrop img, .hero-slat__in img");
  return img && img.complete && img.naturalWidth > 0;
}, null, { timeout: 40000 });

await p.evaluate(() => {
  for (const sel of [".jf-facade", ".st", ".uw--corner", "#uwWidget",
                     ".ai-agent-chat-avatar-container", ".embedded-agent-container"]) {
    document.querySelectorAll(sel).forEach((n) => n.remove());
  }
});

/* FIRE ON THE FRAME THE PHRASE FINISHES TYPING, not merely on the frame it
   matches. Matching alone caught it at the far edge of its pause, one frame
   into being deleted -- the string still matched and the cursor was already
   eating it. Requiring the previous sample to be SHORTER means the phrase has
   just completed, so a full 1.7s pause lies ahead. */
await p.waitForFunction((phrase) => {
  const box = document.querySelector(".text-type");
  if (!box) return false;
  const live = [...box.querySelectorAll("span")]
    .filter((s) => s.offsetParent !== null)
    .map((s) => s.textContent.trim().toLowerCase())
    .filter((t) => phrase.startsWith(t) || t === phrase);
  const now = live.includes(phrase);
  const prev = window.__prevLen ?? 0;
  const len = Math.max(0, ...live.map((t) => t.length));
  window.__prevLen = len;
  return now && prev < phrase.length;
}, PHRASE, { timeout: 90000, polling: 60 });

await p.screenshot({ path: "public/og/home-card.png" });

/* A capture that is nearly flat is a failed capture, not a dark design. */
const stats = await sharp("public/og/home-card.png").stats();
const spread = stats.channels.reduce((a, c) => a + c.stdev, 0) / stats.channels.length;
if (spread < 12) throw new Error(`capture looks blank (stdev ${spread.toFixed(1)}) - did the preloader clear?`);

await sharp("public/og/home-card.png")
  .resize(1200, 630)
  .jpeg({ quality: 84, mozjpeg: true })
  .toFile("public/og/home-card.jpg");
fs.unlinkSync("public/og/home-card.png");
console.log("wrote public/og/home-card.jpg", fs.statSync("public/og/home-card.jpg").size, "bytes");
console.log("captured:", await p.evaluate(() => {
  const box = document.querySelector(".text-type");
  return [...box.querySelectorAll("span")].filter((s) => s.offsetParent !== null).map((s) => s.textContent.trim());
}));
await b.close();
