// node livecap2.js <url> <out-prefix> : 2x captures at desktop/tablet/phone after the page settles; declines cookie banners; also full-length desktop + phone
const { chromium } = require('playwright-core');
(async()=>{const [,,url,out]=process.argv;const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const [n,w,h,m] of [['d',1440,900,false],['t',1024,1366,true],['p',390,844,true]]){const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,isMobile:m,hasTouch:m});const p=await ctx.newPage();
try{await p.goto(url,{waitUntil:'networkidle',timeout:45000})}catch(e){}
await p.waitForTimeout(7000);
for(const t of ['Decline','Reject','Reject all','Only necessary']){const l=p.getByRole('button',{name:t,exact:true});if(await l.count()){await l.first().click().catch(()=>{});await p.waitForTimeout(600);break;}}
await p.screenshot({path:`${out}-${n}.png`});
if(n!=='t'){const H=await p.evaluate(()=>document.documentElement.scrollHeight);for(let y=0;y<H;y+=500){await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(220)}await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(1200);await p.screenshot({path:`${out}-${n}-full.png`,fullPage:true});}
console.log(n,'ok');await ctx.close();}
await b.close();})();
