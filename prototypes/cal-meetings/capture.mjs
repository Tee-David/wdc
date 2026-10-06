// Import and call from the Browser skill's supported browser session.
// Reproducible design evidence; the fixture never sends booking requests.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export async function captureDesign(browser, tab, {themes=[false,true], widths=[320,390,640,768,1024,1440], screens=['Booking','Meetings','Availability','Users'], restoreScreen='Meetings'}={}) {
  const output=path.join(path.dirname(fileURLToPath(import.meta.url)),'captures');
  await fs.mkdir(output,{recursive:true});
  const viewport=await browser.capabilities.get('viewport');
  const results=[];
  try {
    for(const dark of themes) {
      const switchName=dark?'Switch to dark theme':'Switch to light theme';
      const theme=tab.playwright.getByRole('button',{name:switchName,exact:true});
      if(await theme.count())await theme.click();
      for(const width of widths) {
        await viewport.set({width,height:1000});
        for(const screen of screens) {
          await tab.playwright.getByRole('button',{name:screen,exact:true}).click();
          if(screen==='Meetings')await tab.playwright.getByRole('button',{name:'Month',exact:true}).click();
          const dimensions=await tab.playwright.evaluate(()=>({width:document.documentElement.clientWidth,content:document.documentElement.scrollWidth}));
          if(dimensions.content>dimensions.width)throw Error(`${screen} overflows at ${width}px`);
          const filename=`${screen.toLowerCase()}-${width}-${dark?'dark':'light'}.png`;
          await fs.writeFile(path.join(output,filename),await tab.screenshot({fullPage:true}));
          results.push({screen,width,dark,filename});
        }
      }
    }
  } finally {
    const light=tab.playwright.getByRole('button',{name:'Switch to light theme',exact:true});
    if(await light.count())await light.click();
    await tab.playwright.getByRole('button',{name:restoreScreen,exact:true}).click();
    await viewport.reset();
    await tab.markDeliverable();
  }
  return results;
}
