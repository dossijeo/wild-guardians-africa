import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.WG_QA_PLAYWRIGHT_MODULE).href);
const [base='http://127.0.0.1:5211',out='docs/qa/post-jam-usability-polish/camera-dynamics-v1']=process.argv.slice(2);await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'}),results=[];
try{
 for(const index of [1,16]){
  const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(`${base}/tests/browser/african-toon.html?case=${index}&q=muy_baja`);await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('/30')&&!document.querySelector('#centerClose').disabled,null,{timeout:180000});
  const samples=[];
  for(const action of ['buried','obstruction','centerClose','rotateCenter','damage','travel','travel']){
   await page.locator('#'+action).tap();await page.waitForFunction(()=>!document.querySelector('#cameraReport').disabled,null,{timeout:180000});await page.waitForTimeout(300);
   await page.locator('#cameraExclusionReport').evaluate(e=>e.textContent='');await page.locator('#cameraReport').tap();await page.waitForFunction(()=>document.querySelector('#cameraExclusionReport').textContent.startsWith('{'),null,{timeout:180000});const report=JSON.parse(await page.locator('#cameraExclusionReport').textContent());assert.equal(report.enabled,true);assert.notEqual(report.motion.unresolved,true);assert.notEqual(report.motion.terrainConflict,true);assert(report.eye.every(Number.isFinite));samples.push({action,report});
  }
  // Real touch sequence through Chromium's browser input backend. It emulates
  // touch routing; it is not acceptance on physical Android hardware.
  const cdp=await page.context().newCDPSession(page);await page.locator('#qaControls').evaluate(e=>e.open=false);
  for(const type of ['touchStart','touchMove','touchMove','touchEnd']){
   const t=type==='touchStart'?[[300,180],[520,180]]:type==='touchMove'?[[250,170],[570,210]]:[];
   await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:t.map(([x,y],id)=>({x,y,id}))});await page.waitForTimeout(80);
  }
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);
  // The isolated fixture has no permanent render loop. Resize clears its
  // drawing buffer, so request a fresh real render before capturing it.
  await page.locator('#qaControls').evaluate(e=>e.open=true);await page.locator('#cameraExclusionReport').evaluate(e=>e.textContent='');await page.locator('#cameraReport').tap();await page.waitForFunction(()=>document.querySelector('#cameraExclusionReport').textContent.startsWith('{'),null,{timeout:180000});const after=JSON.parse(await page.locator('#cameraExclusionReport').textContent());await page.locator('#qaControls').evaluate(e=>e.open=false);await page.screenshot({path:`${out}/case-${index}-touch-portrait.png`});assert.notEqual(after.motion.unresolved,true);assert.notEqual(after.motion.terrainConflict,true);assert.deepEqual(errors,[]);
  results.push({index,samples,after,errors,touchEmulated:true});await writeFile(out+'/progress.json',JSON.stringify(results,null,2));await page.close();
 }
 await writeFile(out+'/report.json',JSON.stringify(results,null,2));
}catch(error){await writeFile(out+'/failure.json',JSON.stringify({error:String(error),stack:error.stack,results},null,2));throw error;}finally{await browser.close();}
