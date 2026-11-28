import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:800,height:600}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(process.env.MOBILITY_LAB_URL||'http://127.0.0.1:5175/tests/browser/mobility-worker-latency.html');
 await page.waitForFunction(()=>window.mobilityWorkerReady||window.mobilityWorkerError,null,{timeout:120000});
 const error=await page.evaluate(()=>window.mobilityWorkerError);if(error)throw Error(error);
 const results=[];
 for(const count of [450,700])for(const mode of ['full','sliced','sliced','full']){
  const row=await page.evaluate(({mode,count})=>window.runWorkerBudgetExperiment(mode,count),{mode,count});results.push(row);console.log(JSON.stringify(row));
 }
 for(const count of [450,700]){const rows=results.filter(r=>r.count===count),first=rows[0];if(rows.some(r=>r.queries!==count||r.hash!==first.hash||r.found!==first.found||r.unknown!==first.unknown))throw Error(`Route outputs differ for ${count}`);}
 if(errors.length)throw Error(errors.join('\n'));
 await writeFile('docs/lighting/tree-near-retexture/performance/mobility-worker-frame-budget-abba.json',JSON.stringify({results},null,2)+'\n');
}finally{await browser.close();}
