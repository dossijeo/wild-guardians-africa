import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const results=[];
 for(let i=0;i<3;i++){
  const page=await browser.newPage({viewport:{width:800,height:600}}),errors=[];page.on('pageerror',error=>errors.push(String(error)));
  await page.goto('http://127.0.0.1:5175/tests/browser/mobility-worker-latency.html');await page.waitForFunction(()=>window.mobilityWorkerReady||window.mobilityWorkerError,null,{timeout:120000});
  const error=await page.evaluate(()=>window.mobilityWorkerError);if(error)throw Error(error);
  const result=await page.evaluate(()=>window.runGuardedWorldStopAudit());if(errors.length)throw Error(errors.join('\n'));results.push(result);console.log(JSON.stringify(result));await page.close();
 }
 await writeFile('docs/lighting/tree-near-retexture/performance/mobility-guarded-world-stop.json',JSON.stringify({results},null,2)+'\n');
}finally{await browser.close();}
