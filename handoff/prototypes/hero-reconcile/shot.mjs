import { execFileSync } from 'child_process';
import { chromium } from '/home/user/wdc/frontend/node_modules/playwright/index.mjs';
const cache={}; const viaCurl=u=>cache[u]||(cache[u]=execFileSync('curl',['-sS','-m','30','-A','Mozilla/5.0 Chrome/140',u]));
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const only = process.argv[2]||'ABC';
for (const [w,h] of [[1440,900],[390,844]]) for (const th of ['light','dark']) {
  const p = await b.newPage({ viewport:{width:w,height:h}, colorScheme: th });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r=>{const u=r.request().url(); r.fulfill({status:200,body:viaCurl(u),headers:{'content-type':u.includes('googleapis')?'text/css':'font/woff2','access-control-allow-origin':'*'}});});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto('file://'+process.cwd()+'/preview.html'); await p.waitForTimeout(800);
  for (const c of only) {
    await p.evaluate(c=>{window.__hr.setConcept(c); window.__hr.showPiece(c==='C'?1:0,'none');}, c);
    await p.waitForTimeout(6500);
    const el = await p.$('#viewer'); await el.screenshot({ path:`shots/${c}-${w}-${th}.png` });
    if (c==='B') { await p.evaluate(()=>{const i=document.getElementById('scrubIn'); i.value=100; i.dispatchEvent(new Event('input'));}); await p.waitForTimeout(400); await (await p.$('.frames')).screenshot({ path:`shots/B1-${w}-${th}.png` }); }
  }
  const ov = await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  console.log(w, th, 'overflow', ov, errs.slice(0,4).join(' | '));
  await p.close();
}
await b.close();
