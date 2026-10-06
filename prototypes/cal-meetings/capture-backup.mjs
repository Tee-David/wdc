// Called with the existing browser/tab handles from the supported browser tool.
// No authentication, environment variables, database or provider requests.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
export async function captureBackup(browser,tab){
 const viewport=await browser.capabilities.get('viewport');
 const output=path.join(here,'captures');await fs.mkdir(output,{recursive:true});
 const checks=[];
 for(const dark of [false,true]){
  const current=await tab.playwright.locator('html').getAttribute('class');
  if(Boolean(current?.split(' ').includes('dark'))!==dark)await tab.playwright.locator('#theme').click();
  for(const width of [320,768,1440]){
   await viewport.set({width,height:1000});
   await tab.pressKey(null,'ctrl+Home');
   const result=await tab.playwright.evaluate(()=>({viewport:innerWidth,pageWidth:document.documentElement.scrollWidth}));
   if(result.pageWidth>result.viewport)throw new Error(`Page overflow at ${width}px`);
   const file=path.join(output,`backup-${width}-${dark?'dark':'light'}.png`);
   await fs.writeFile(file,await tab.screenshot({fullPage:true}));checks.push({width,dark,...result,file});
  }
 }
 await tab.playwright.locator('#theme').click();
 await viewport.reset();await tab.markDeliverable();return checks;
}
