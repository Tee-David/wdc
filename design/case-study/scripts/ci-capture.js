// Runs on GitHub (never on the owner's PC): captures case-study images.
// Live sites: a 1440x1080 cover, desktop, tablet and phone frames, and a full-length page.
// The MGT dashboard: the approved prototype (sample data only, no client records) at laptop, tablet and phone sizes.
// Output: JPEGs in ./capture. Usage: node design/case-study/scripts/ci-capture.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = 'capture';
fs.mkdirSync(OUT, { recursive: true });
const SITES = [['mgt-web', 'https://www.meridianglobaltrainings.com/'], ['harize-web', 'https://harize.vercel.app/']];
const PROTO = 'file://' + path.resolve('design/case-study/src/mgt-daylight.html');
const SCREENS = ['overview', 'courses', 'calendars', 'enquiries', 'certificates', 'money'];

const settle = async (p, ms) => {
  await p.waitForTimeout(ms);
  for (const t of ['Decline', 'Reject', 'Reject all', 'Only necessary', 'Accept', 'Accept all', 'Got it']) {
    const l = p.getByRole('button', { name: t, exact: true });
    if (await l.count()) { await l.first().click().catch(() => {}); await p.waitForTimeout(600); break; }
  }
};
const scrollAll = async (p) => {
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += 450) { await p.evaluate((v) => scrollTo(0, v), y); await p.waitForTimeout(250); }
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(1500);
};
const jpg = (file) => ({ path: path.join(OUT, file), type: 'jpeg', quality: 84 });

(async () => {
  const b = await chromium.launch();
  for (const [name, url] of SITES) {
    for (const [tag, w, h, dsf, mobile] of [['cover', 1440, 1080, 1, false], ['d', 1600, 1000, 1, false], ['t', 800, 1067, 2, true], ['p', 390, 844, 2, true]]) {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf, isMobile: mobile, hasTouch: mobile, reducedMotion: 'no-preference' });
      const p = await ctx.newPage();
      try { await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 }); } catch (e) { console.log(name, tag, 'load', e.message); }
      await settle(p, 7000);
      await p.screenshot(jpg(`${name}-${tag}.jpg`));
      if (tag === 'd') {
        await ctx.close();
        const c2 = await b.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
        const q = await c2.newPage();
        try { await q.goto(url, { waitUntil: 'networkidle', timeout: 60000 }); } catch (e) { /* keep going */ }
        await settle(q, 5000); await scrollAll(q);
        await q.screenshot({ ...jpg(`${name}-full.jpg`), fullPage: true });
        await c2.close();
      } else await ctx.close();
      console.log(name, tag, 'ok');
    }
  }
  for (const [tag, w, h, dsf, mobile] of [['d', 1600, 1000, 1, false], ['t', 800, 1067, 2, true], ['p', 390, 844, 2, true]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf, isMobile: mobile, hasTouch: mobile });
    for (const s of SCREENS) {
      const p = await ctx.newPage();
      await p.goto(PROTO + '#' + s, { waitUntil: 'load' });
      await p.waitForTimeout(2500);
      await p.screenshot(jpg(`mgt-${s}-${tag}.jpg`));
      await p.close();
    }
    await ctx.close();
    console.log('mgt prototype', tag, 'ok');
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
