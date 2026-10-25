// node appcap.js <base> <email> <password> <out-prefix> <path>... : sign in, then capture each path at desktop/tablet/phone (2x), dev overlay hidden
const { chromium } = require('playwright-core');
(async()=>{const [,,base,email,pw,out,...paths]=process.argv;const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const [n,w,h,m] of [['d',1440,900,false],['t',1024,1366,true],['p',390,844,true]]){const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,isMobile:m,hasTouch:m});
 const r=await ctx.request.post(base+'/api/auth/sign-in/email',{data:{email,password:pw},headers:{origin:base}});if(n==='d')console.log('signin',r.status());
 const p=await ctx.newPage();
 for(const path of paths){try{await p.goto(base+path,{waitUntil:'networkidle',timeout:90000})}catch(e){}
  await p.waitForTimeout(4000);
  await p.addStyleTag({content:'nextjs-portal,[data-nextjs-toast],#__next-build-watcher{display:none!important}'}).catch(()=>{});
  for(const t of ['Skip','Skip tour','Close','Not now','Decline']){const l=p.getByRole('button',{name:t,exact:true});if(await l.count()){await l.first().click().catch(()=>{});await p.waitForTimeout(500);}}
  const slug=path.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'')||'home';
  await p.screenshot({path:`${out}-${slug}-${n}.png`});console.log(n,path,'->',p.url().replace(base,''));}
 await ctx.close();}
await b.close();})();
