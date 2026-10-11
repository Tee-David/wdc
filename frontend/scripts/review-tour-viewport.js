/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI evaluates this callback with its page. */
/* Start dev on 3100 with BONEYARD_CAPTURE_TOKEN=local-design-review-only.
   Run: npx --package @playwright/cli playwright-cli run-code --filename scripts/review-tour-viewport.js
   Uses read-only capture access; no client records or payment state are changed. */
async(page)=>{
 const role='client',home='/portal',results=[];
 await page.setExtraHTTPHeaders({'x-boneyard-capture':'local-design-review-only','x-boneyard-capture-role':role,'x-boneyard-capture-client':'c1546837780001984'});
 await page.setViewportSize({width:1440,height:900});await page.emulateMedia({reducedMotion:'reduce'});
 for(const route of ['/portal','/portal/projects','/portal/billing','/portal/support','/portal/settings','/portal/notifications'])await page.goto('http://localhost:3100'+route,{timeout:180000});
 await page.goto('http://localhost:3100'+home,{timeout:180000});
 const close=page.getByRole('button',{name:'Close this tour'});if(await close.isVisible())await close.click();
 await page.getByRole('button',{name:'Tours and help'}).click();await page.getByRole('menuitem',{name:/Full platform walkthrough|Replay the full walkthrough/}).click();
 let finished=false;
 for(let i=0;i<60;i++){
  const card=page.locator('.tourCard');await card.waitFor({state:'visible',timeout:45000});
  const state=await card.evaluate(el=>{const r=el.getBoundingClientRect();return {step:el.querySelector('.tourCard__headText span')?.textContent,inViewport:r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1,target:document.documentElement.dataset.tourTarget};});
  results.push(state);if(!state.inViewport)throw Error('Tour card outside viewport at '+state.step);
  const finish=card.getByRole('button',{name:'Finish',exact:true});if(await finish.isVisible()){await finish.click();finished=true;break;}
  const old=state.step;await card.getByRole('button',{name:'Next',exact:true}).click();await page.waitForFunction(previous=>{const text=document.querySelector('.tourCard__headText span')?.textContent;return text&&text!==previous;},old,{timeout:45000});
 }
 if(!finished)throw Error('Walkthrough did not finish');return {role,finished,seen:results.length,steps:results};
}
