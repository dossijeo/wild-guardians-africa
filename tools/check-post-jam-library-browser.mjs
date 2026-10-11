import {mkdir,writeFile,access} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.WG_QA_PLAYWRIGHT_MODULE?pathToFileURL(process.env.WG_QA_PLAYWRIGHT_MODULE).href:'playwright');
const [base='http://127.0.0.1:5211',out='docs/qa/post-jam-usability-polish/library-integrated-v3']=process.argv.slice(2);try{await access(out+'/report.json');throw Error('Refusing to overwrite QA report');}catch(e){if(e.code!=='ENOENT')throw e;}await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.WG_QA_BROWSER_CHANNEL?{channel:process.env.WG_QA_BROWSER_CHANNEL}:{})});const results=[];
try{
for(const [width,height] of [[1280,720],[844,390],[390,844],[360,640]]){
 const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/');
 const menu=page.frameLocator('#native-menu');await menu.locator('#hot-library').waitFor({timeout:60000});await page.waitForTimeout(5000);await menu.locator('#hot-library').click();await page.waitForTimeout(3500);
 for(const lab of ['crops','walls','destruction','sfx']){
  await menu.locator(`[data-production-lab=${lab}]`).click();const frame=menu.frameLocator('.production-lab-frame');
  await frame.locator('canvas').first().waitFor({timeout:60000});await page.waitForTimeout(3000);const checks={};
  if(lab==='crops'){
   await frame.locator('.crop-card').nth(1).click();checks.selected=await frame.locator('.crop-card').nth(1).getAttribute('class');assert(checks.selected.includes('active'));
   const demo=width>900?'#demoBtn':height<500?'#demoBtn':'#mobileDemo';await frame.locator(demo).click();await page.waitForTimeout(500);checks.plants=await frame.locator('#countPlants').textContent();assert.equal(checks.plants,'8');
   await frame.locator('#viewToggle').click();await page.waitForTimeout(300);await frame.locator('#viewToggle').click();
   if(width<=900){await frame.locator('.lab-controls-toggle').click();checks.collapsed=await frame.locator('.lab-controls-toggle').getAttribute('aria-expanded');await frame.locator('.lab-controls-toggle').click();}
  }
  if(lab==='walls'){
   await frame.locator('[data-material=piedra]').click();checks.material=await frame.locator('[data-material=piedra]').getAttribute('aria-checked');
   await frame.locator('[data-mode=hit]').click();checks.hitMode=await frame.locator('[data-mode=hit]').getAttribute('aria-pressed');await frame.locator('[data-mode=draw]').click();
   await frame.locator('#tab-library').click();await page.waitForTimeout(300);await frame.locator('#tab-terrain').click();
  }
  if(lab==='destruction'){
   await frame.locator('#buildingSelect').selectOption({index:1});await frame.locator('#damage').waitFor();await frame.locator('[data-stage="50"]').click({timeout:180000});await page.waitForTimeout(400);checks.damage=await frame.locator('#damageValue').textContent();if(checks.damage!=='50')throw Error('Confirmed damage did not reach 50%');
   await frame.locator('#reset').click();await page.waitForTimeout(400);checks.rebuilt=await frame.locator('#damage').inputValue();
  }
  if(lab==='sfx'){
   checks.menuMusicPaused=await menu.locator('#menu-music').evaluate(a=>a.paused);await frame.locator('#search').fill('004');await page.waitForTimeout(200);checks.matches=await frame.locator('.item').count();await frame.locator('[data-action=play]').first().click();await page.waitForTimeout(1500);checks.playTitle=await frame.locator('#nowTitle').textContent();await frame.locator('#volume').fill('35');await frame.locator('#volume').dispatchEvent('input');checks.volume=await frame.locator('#volume').inputValue();await frame.locator('#stop').click();await frame.locator('#search').fill('');
  }
  console.log(lab,width,height,JSON.stringify(checks));await page.screenshot({path:`${out}/${lab}-${width}x${height}.png`});assert.deepEqual(errors,[]);results.push({lab,width,height,checks,errors:[...errors]});await writeFile(out+'/progress.json',JSON.stringify(results,null,2));
  await menu.locator('.production-lab-header button').first().click();await page.waitForTimeout(100);
 }
 await page.close();
}
await writeFile(out+'/report.json',JSON.stringify(results,null,2));
}catch(error){await writeFile(out+'/failure.json',JSON.stringify({error:String(error),stack:error.stack,completed:results},null,2));throw error;}finally{await browser.close();}
