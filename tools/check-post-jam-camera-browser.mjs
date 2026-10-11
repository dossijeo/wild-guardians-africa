import assert from 'node:assert/strict';
import {mkdir,writeFile,access} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const [base='http://127.0.0.1:5211',out='docs/qa/post-jam-usability-polish/camera-browser-v3']=process.argv.slice(2);
try{await access(out+'/report.json');throw Error('Refusing to overwrite QA report');}catch(e){if(e.code!=='ENOENT')throw e;}
await mkdir(out,{recursive:true});
const {chromium}=await import(process.env.WG_QA_PLAYWRIGHT_MODULE?pathToFileURL(process.env.WG_QA_PLAYWRIGHT_MODULE).href:'playwright');
const browser=await chromium.launch({headless:true,...(process.env.WG_QA_BROWSER_CHANNEL?{channel:process.env.WG_QA_BROWSER_CHANNEL}:{})}),rows=[];
try{
 for(const test of [...(process.env.WG_QA_CAMERA_CASES?.split(',').map(Number)??[1,2,3,4,5,6,11,16,21,26]).map(index=>({index,width:1280,height:720})),{index:1,width:390,height:844},{index:16,width:844,height:390}]){
  const {index,width,height}=test,id=`case-${index}-${width}x${height}`,page=await browser.newPage({viewport:{width,height},hasTouch:width<1000,reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));let result;
  try{
   await page.goto(`${base}/tests/browser/african-toon.html?case=${index}&q=muy_baja`);
   await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('/30')&&!document.querySelector('#centerClose').disabled,null,{timeout:180000});
   await page.locator('#centerClose').click();await page.waitForFunction(()=>!document.querySelector('#centerClose').disabled,null,{timeout:180000});
   await page.locator('#cameraPath').click();await page.waitForFunction(()=>document.querySelector('#cameraPathReport').textContent.startsWith('{'),null,{timeout:180000});
   const path=JSON.parse(await page.locator('#cameraPathReport').textContent());
   assert.equal(path.simulationUnchanged,true);assert.equal(path.overlaps,0);assert.equal(path.unresolved,0);assert.equal(path.terrainConflicts,0);assert.deepEqual(path.errors,[]);
   await page.locator('#qaControls').evaluate(e=>e.open=false);await page.screenshot({path:`${out}/${id}-roof.png`});
   const canvas=page.locator('#world'),r=await canvas.boundingBox();await page.mouse.move(r.width*.5,r.height*.5);await page.mouse.wheel(0,-650);await page.waitForTimeout(1500);
   await page.mouse.down();await page.mouse.move(r.width*.8,r.height*.6,{steps:12});await page.mouse.up();await page.waitForTimeout(1500);await page.screenshot({path:`${out}/${id}-zoom-orbit.png`});
   await page.locator('#qaControls').evaluate(e=>e.open=true);await page.locator('#cameraReport').click();await page.waitForTimeout(300);const camera=JSON.parse(await page.locator('#cameraExclusionReport').textContent());
   assert.equal(camera.enabled,true);assert.notEqual(camera.motion.unresolved,true);assert.notEqual(camera.motion.terrainConflict,true);assert.deepEqual(errors,[]);
   result={...test,ok:true,path,camera,errors};
  }catch(error){result={...test,ok:false,error:String(error),stack:error.stack,status:await page.locator('#status').textContent(),errors};await page.screenshot({path:`${out}/${id}-failure.png`});}
  rows.push(result);await writeFile(out+'/progress.json',JSON.stringify(rows,null,2));console.log(id,result.ok,result.error??'');await page.close();if(!result.ok)break;
 }
 await writeFile(out+'/report.json',JSON.stringify({rows,limits:'Native authored orbit route plus genuine mouse wheel/drag in Chromium; emulated viewports, not physical Android or isolated performance.'},null,2));assert(rows.every(r=>r.ok));
}finally{await browser.close();}
