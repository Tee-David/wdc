// node fullcap.js <url> <out.png> : full-length 2x desktop capture with reduced motion, slow scroll so lazy and animated sections render
const { chromium } = require('playwright-core');
(async()=>{const [,,url,out]=process.argv;const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:1440,height:900},deviceScaleFactor:2,reducedMotion:'reduce'});const p=await ctx.newPage();
try{await p.goto(url,{waitUntil:'networkidle',timeout:60000})}catch(e){}
await p.waitForTimeout(6000);
for(const t of ['Decline','Reject','Reject all','Only necessary']){const l=p.getByRole('button',{name:t,exact:true});if(await l.count()){await l.first().click().catch(()=>{});await p.waitForTimeout(600);break;}}
let H=await p.evaluate(()=>document.documentElement.scrollHeight);
for(let y=0;y<H;y+=350){await p.evaluate(y=>window.scrollTo({top:y,behavior:'instant'}),y);await p.waitForTimeout(450);H=await p.evaluate(()=>document.documentElement.scrollHeight);}
await p.waitForTimeout(1500);
// freeze any scroll-linked animation in its finished state before the full capture
await p.addStyleTag({content:'*,*::before,*::after{animation-play-state:paused!important;transition:none!important} [style*="opacity: 0"]{opacity:1!important}'});
await p.evaluate(()=>window.scrollTo(0,0));await p.waitForTimeout(1200);
await p.screenshot({path:out,fullPage:true});console.log(out,H);await b.close();})();
