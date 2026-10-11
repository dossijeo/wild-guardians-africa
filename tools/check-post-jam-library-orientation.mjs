import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.WG_QA_PLAYWRIGHT_MODULE).href);
const [base='http://127.0.0.1:5211',out='docs/qa/post-jam-usability-polish/library-orientation-v4']=process.argv.slice(2);
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'}),results=[];
try{
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,locale:'en-US'}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.addInitScript(()=>localStorage.setItem('wild-guardians:language','en'));
 await page.goto(base);const menu=page.frameLocator('#native-menu');await menu.locator('#hot-library').waitFor({timeout:60000});await page.waitForTimeout(5000);
 await menu.locator('#hot-library').tap();await page.waitForTimeout(3500);
 const music=menu.locator('#menu-music');const previousMusic=await music.evaluate(a=>({paused:a.paused,volume:a.volume}));
 for(const lab of ['crops','walls','destruction','sfx']){
  await menu.locator(`[data-production-lab=${lab}]`).tap();const frame=menu.frameLocator('.production-lab-frame');await frame.locator('canvas').first().waitFor({timeout:60000});await page.waitForTimeout(2500);
  let read;
  if(lab==='crops'){await frame.locator('#mobileDemo').tap();read=()=>frame.locator('#countPlants').textContent();}
  if(lab==='walls'){await frame.locator('[data-material=piedra]').tap();read=()=>frame.locator('[data-material=piedra]').getAttribute('aria-checked');}
  if(lab==='destruction'){await frame.locator('[data-stage="50"]').tap({timeout:180000});read=()=>frame.locator('#damageValue').textContent();}
  if(lab==='sfx'){assert.equal(await music.evaluate(a=>a.paused),true);await frame.locator('#search').fill('004');read=()=>frame.locator('#search').inputValue();await frame.locator('[data-action=play]').first().tap();await page.waitForTimeout(700);}
  const before=await read();const language=await frame.locator('html').getAttribute('lang');assert.equal(language,'en');
  await page.screenshot({path:`${out}/${lab}-en-390x844.png`});
  await page.setViewportSize({width:844,height:390});await page.waitForTimeout(700);assert.equal(await read(),before);
  if(lab==='walls'){
   const sidebar=frame.locator('.sidebar');await sidebar.evaluate(e=>e.scrollTop=0);await page.screenshot({path:`${out}/walls-en-844x390-initial.png`});
   for(const mode of ['draw','inspect','repair','hit']){
    const button=frame.locator(`[data-mode=${mode}]`);await button.scrollIntoViewIfNeeded();const bounds=await button.boundingBox(),panel=await sidebar.boundingBox();assert(bounds.x>=panel.x-1&&bounds.x+bounds.width<=panel.x+panel.width+1,'Wall tools overflow their sidebar');
    await button.tap();assert.equal(await button.getAttribute('aria-pressed'),'true');
   }
  }
  await page.screenshot({path:`${out}/${lab}-en-844x390.png`});
  await page.setViewportSize({width:360,height:640});await page.waitForTimeout(700);assert.equal(await read(),before);await page.screenshot({path:`${out}/${lab}-en-360x640.png`});
  if(lab==='sfx'){
   await frame.locator('#search').press('Escape');await menu.locator('.production-lab-frame').waitFor({state:'detached'});await page.waitForTimeout(700);
   assert.equal(await music.evaluate(a=>a.volume),previousMusic.volume);if(!previousMusic.paused)assert.equal(await music.evaluate(a=>a.paused),false);
  }else await menu.locator('.production-lab-header button').first().tap();
  results.push({lab,before,afterOrientation:await Promise.resolve(before),language,touch:true,musicRestored:lab==='sfx',errors:[...errors]});assert.deepEqual(errors,[]);
  await page.setViewportSize({width:390,height:844});
 }
 await writeFile(out+'/report.json',JSON.stringify({previousMusic,results},null,2));
}catch(error){await writeFile(out+'/failure.json',JSON.stringify({error:String(error),stack:error.stack,results},null,2));throw error;}finally{await browser.close();}
