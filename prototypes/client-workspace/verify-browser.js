async (page) => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:3150');
  const failures=[],checks=[];
  const measure=async(label)=>{const v=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,h1:document.querySelectorAll('h1').length,buttons:[...document.querySelectorAll('main button')].filter(b=>b.getBoundingClientRect().width>0&&b.getBoundingClientRect().height<43).map(b=>b.textContent.trim())}));checks.push({label,...v});if(v.scroll>v.width||v.h1!==1||v.buttons.length)failures.push({label,...v});};
  for(const role of ['Studio','Client portal']){
    await page.getByRole('button',{name:role,exact:true}).click();
    await page.getByRole('button',{name:'Open work',exact:true}).first().click();
    for(const name of ['Social media','Branding','Website','Mobile app','Software & AI','SEO','Paid advertising']){
      await page.getByRole('button',{name,exact:true}).click();
      for(const tab of ['Overview','Work','Review','Handover']){
        await page.locator('.work-tabs[aria-label="Project sections"]').getByRole('button',{name:tab,exact:true}).click();
        await measure(role+'/'+name+'/'+tab+'/desktop');
      }
    }
  }
  await page.getByRole('button',{name:'Studio',exact:true}).click();
  for(const dark of [false,true]){
    if(dark)await page.locator('#theme-toggle').click();
    for(const width of [320,768,1440]){
      await page.setViewportSize({width,height:1000});
      for(const view of ['Overview','Inbox','Team & handovers','Communication coverage']){
        await page.locator('[aria-label="Studio workspace sections"]').getByRole('button',{name:view,exact:true}).click();await measure(view+'/'+width+'/'+(dark?'dark':'light'));
      }
      await page.getByRole('button',{name:'Overview',exact:true}).first().click();
      await page.getByRole('button',{name:'Open work',exact:true}).first().click();
      await page.getByRole('button',{name:'Work',exact:true}).click();await measure('social/'+width+'/'+(dark?'dark':'light'));
      await page.waitForTimeout(600);
      await page.screenshot({path:'output/playwright/client-workspace-'+width+'-'+(dark?'dark':'light')+'.png'});
    }
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.getByRole('button',{name:'Team & handovers',exact:true}).click();
  await page.getByRole('button',{name:'Accept handover',exact:true}).click();
  if(await page.getByRole('button',{name:'Complete sample task',exact:true}).isDisabled())throw new Error('Handover did not unblock task');
  await page.getByRole('button',{name:'Complete sample task',exact:true}).click();
  await page.getByRole('button',{name:'Communication coverage',exact:true}).click();
  await page.getByRole('searchbox',{name:'Search flows'}).fill('approval');
  await page.getByRole('button',{name:'Inspect flow',exact:true}).first().click();
  if(!await page.locator('#preview-dialog').evaluate(d=>d.open))throw new Error('Flow dialog did not open');
  await page.getByRole('button',{name:'Close dialog',exact:true}).click();
  await page.getByRole('button',{name:'Client portal',exact:true}).click();
  await page.getByRole('button',{name:'Open inbox',exact:true}).click();
  if(await page.getByRole('heading',{name:'Accept the website handover',exact:true}).count())throw new Error('Internal handover exposed');
  await page.getByRole('button',{name:'Email preferences',exact:true}).click();
  await page.getByRole('checkbox',{name:'Weekly routine progress summary'}).uncheck();
  await page.getByRole('button',{name:'Save preferences',exact:true}).click();
  if(await page.getByRole('checkbox',{name:'Weekly routine progress summary'}).isChecked())throw new Error('Preference did not save');
  if(failures.length||errors.length)throw new Error(JSON.stringify({failures,errors}));
  return {screens:checks.length,failures,pageErrors:errors,interactions:'handover gate, completion, flow search/inspect, client privacy, preference save passed'};
}
