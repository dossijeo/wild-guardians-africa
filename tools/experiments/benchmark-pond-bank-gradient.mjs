import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';

const origin=process.env.WG_QA_URL??'http://127.0.0.1:5188';
const variants=(process.env.WG_ABBA_VARIANTS??'0,1,1,0').split(',');
const cases=(process.env.WG_ABBA_CASES??'1').split(',').map(Number);
const browser=await chromium.launch({channel:'chrome',headless:true});
const records=[];
try{
  for(const sceneCase of cases)for(const variant of variants){
    const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
    await page.goto(`${origin}/tests/browser/african-toon.html?case=${sceneCase}&q=media&visualLab=${variant}&visualLabReference=1`,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.qaVisualReference&&document.querySelector('#status')?.textContent.includes('/30 ·'),null,{timeout:120000});
    if(sceneCase===1&&variant==='pond-bank-gradient')await page.evaluate(async()=>{const {applyPondBankGradient}=await import('/tools/experiments/qa-pond-bank-gradient.js');return applyPondBankGradient(window.qaVisualReference.world)});
    for(const phase of ['day','night']){
      if(phase==='night')await page.locator('#night').evaluate(e=>e.click());
      await page.waitForFunction(t=>window.qaVisualReference.state.time===t&&!document.querySelector('#night').disabled,phase==='day'?150:350);
      await page.waitForTimeout(250);
      await page.locator('#benchmark').evaluate(e=>e.click());
      await page.waitForFunction(()=>{try{return !!JSON.parse(document.querySelector('#benchmarkReport').textContent).submittedCalls;}catch{return false;}},null,{timeout:120000});
      const report=JSON.parse(await page.locator('#benchmarkReport').textContent());
      const camera=await page.evaluate(()=>{const w=window.qaVisualReference.world;return {position:w.camera.position.toArray(),target:w.controls.target.toArray(),tufts:w.groundDetails?.count??0};});
      records.push({sceneCase,variant,phase,drawCalls:report.submittedCalls.mean,triangles:report.submittedTriangles?.mean,cpuSubmissionMs:report.cpuSubmissionMs.mean,fps:report.averageObservedFps,gpuFrameMs:report.gpuElapsedMs?.mean??null,camera,...(process.env.WG_ABBA_RAW==='1'?{report}:{})});
      await page.locator('#benchmarkReport').evaluate(e=>e.textContent='');
    }
    await page.close();
    console.log(records.slice(-2).map(({report,...r})=>r));
  }
}finally{await browser.close();}
const output=process.env.WG_ABBA_OUTPUT??'docs/qa/global-visual-lab/abba/report.json';
await mkdir(dirname(output),{recursive:true});
await writeFile(output,JSON.stringify({origin,variants,cases,records},null,2)+'\n');
