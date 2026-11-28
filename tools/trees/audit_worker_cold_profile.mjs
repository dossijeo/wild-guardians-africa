import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const results=[];
 for(const mode of ['idle','worker','worker','idle']){
  const page=await browser.newPage({viewport:{width:800,height:600}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:5175/tests/browser/mobility-worker-latency.html');await page.waitForFunction(()=>window.mobilityWorkerReady||window.mobilityWorkerError,null,{timeout:120000});
  const error=await page.evaluate(()=>window.mobilityWorkerError);if(error)throw Error(error);
  const row=await page.evaluate(mode=>window.runColdProfileAudit(mode),mode);if(errors.length)throw Error(errors.join('\n'));results.push(row);console.log(JSON.stringify(row));await page.close();
 }
 await writeFile('docs/lighting/tree-near-retexture/performance/mobility-worker-cold-profile-abba.json',JSON.stringify({results},null,2)+'\n');
}finally{await browser.close();}
