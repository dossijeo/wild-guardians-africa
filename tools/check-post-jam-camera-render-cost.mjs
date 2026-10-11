import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.WG_QA_PLAYWRIGHT_MODULE).href);
const [base='http://127.0.0.1:5211',out='docs/qa/post-jam-usability-polish/camera-render-cost-diagnostic']=process.argv.slice(2);await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'}),arms=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});await page.goto(`${base}/tests/browser/african-toon.html?case=1&q=muy_baja`);await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('/30')&&!document.querySelector('#relief').disabled,null,{timeout:180000});
 await page.locator('#relief').click();await page.waitForTimeout(1000);let enabled=true;
 for(const arm of ['A1','B1','B2','A2']){
  const active=arm.startsWith('B');if(active!==enabled){await page.locator('#cameraBenchmarkArm').click();await page.waitForTimeout(300);enabled=active;}
  await page.locator('#benchmark').click();await page.waitForFunction(()=>document.querySelector('#benchmarkReport').textContent.startsWith('{'),null,{timeout:180000});
  const report=JSON.parse(await page.locator('#benchmarkReport').textContent());assert.equal(report.simulationUnchanged,true);assert.equal(report.cameraStable,true);assert.equal(report.cpuSubmissionMs.count,180,'Only one render loop may contribute samples');assert.deepEqual(report.errors,[]);arms.push({arm,active,report});await writeFile(out+'/progress.json',JSON.stringify(arms,null,2));
 }
 const first=arms[0].report;for(const {report} of arms){assert.deepEqual(report.scenario.camera,first.scenario.camera,'Paired camera poses differ');assert.deepEqual(report.scenario.target,first.scenario.target);assert.equal(report.submittedCalls.mean,first.submittedCalls.mean);assert.equal(report.submittedTriangles.mean,first.submittedTriangles.mean);for(const key of ['geometries','textures','programs'])assert.equal(report.threeResourceCounts[key],first.threeResourceCounts[key]);}
 await writeFile(out+'/report.json',JSON.stringify({arms,limits:'Actual render pipeline ABBA; local machine has a concurrent campaign. Frame timing remains diagnostic, not isolated CPU/GPU acceptance. Draw counts and resources are checked at identical camera/state.'},null,2));
}catch(error){await writeFile(out+'/failure.json',JSON.stringify({error:String(error),stack:error.stack,arms},null,2));throw error;}finally{await browser.close();}
