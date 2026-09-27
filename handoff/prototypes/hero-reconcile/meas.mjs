import { execFileSync } from 'child_process';
import fs from 'fs';
import { chromium } from '/home/user/wdc/frontend/node_modules/playwright/index.mjs';
const cache={}; const viaCurl=u=>cache[u]||(cache[u]=execFileSync('curl',['-sS','-m','30','-A','Mozilla/5.0 Chrome/140',u]));
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const out={};
const TIMES=[0.5,1.5,2.5,3.5,4.5,5.5,6.5,7.5,8.5,9.5,11,13];
for (const th of ['light','dark']) {
  const p = await b.newPage({ viewport:{width:1600,height:1400}, colorScheme: th });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r=>{const u=r.request().url(); r.fulfill({status:200,body:viaCurl(u),headers:{'content-type':u.includes('googleapis')?'text/css':'font/woff2','access-control-allow-origin':'*'}});});
  await p.goto('file://'+process.cwd()+'/preview.html'); await p.waitForTimeout(800);
  await p.addStyleTag({content:'.h1,.h1 *{color:transparent!important;text-shadow:none!important}.caret{visibility:hidden!important}.frames{grid-template-columns:390px 1fr!important}'});
  for (const c of (process.env.ONLY||'AB').split('')) {
    await p.evaluate(c=>window.__hr.setConcept(c), c);
    let worst={L:0};
    for (let i=0;i<10;i++) for (const t of TIMES) {
      await p.evaluate(([i,t])=>{ for (const s of window.__hr.stages){ s.setPlaying(false); s.show(i,{from:t}); } },[i,t]);
      await p.waitForTimeout(60);
      for (const sel of ['#devP .h1','#devD .h1']) {
        const el = await p.$(sel); const buf = await el.screenshot();
        const L = await p.evaluate(async b64=>{ const img=new Image(); img.src='data:image/png;base64,'+b64; await img.decode(); const c=document.createElement('canvas'); c.width=img.width;c.height=img.height; const g=c.getContext('2d'); g.drawImage(img,0,0); const d=g.getImageData(0,0,c.width,c.height).data; const ls=[]; const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)}; for(let k=0;k<d.length;k+=4) ls.push(.2126*f(d[k])+.7152*f(d[k+1])+.0722*f(d[k+2])); ls.sort((a,b)=>a-b); return ls[Math.floor(ls.length*.98)]; }, buf.toString('base64'));
        if (L>worst.L) worst={L,i,t,sel};
      }
    }
    const names = await p.evaluate(()=>window.__hr.SET_D.map(d=>d.name));
    out[c]=out[c]||{frames:240, piece:''};
    out[c][th]=+(1.05/(worst.L+.05)).toFixed(2);
    out[c]['w_'+th]=`${names[worst.i]} at ${worst.t}s, ${worst.sel.includes('devP')?'phone':'desktop'}`;
    console.log(th,c,out[c][th],out[c]['w_'+th]);
  }
  await p.close();
}
for (const c of Object.keys(out)) { const o=out[c]; const w = o.light<o.dark? o.w_light : o.w_dark; out[c]={light:o.light,dark:o.dark,frames:240,piece:'worst: '+w+'; 98th-percentile pixel behind the words'}; }
fs.writeFileSync('meas.json', JSON.stringify(out));
await b.close();
