import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5175/tests/browser/mobility-worker-cancellation.html');
 await page.waitForFunction(()=>window.cancellationReady||window.cancellationError,null,{timeout:120000});
 const error=await page.evaluate(()=>window.cancellationError);if(error)throw Error(error);
 const results=[];
 for(const cancel of [false,true])for(const mode of ['single','cooperative','channel','channel','cooperative','single']){
  const row=await page.evaluate(({mode,cancel})=>window.runCancellationAudit(mode,cancel),{mode,cancel});results.push(row);console.log(JSON.stringify(row));
 }
 const completed=results.filter(r=>!r.cancel);if(completed.some(r=>r.hash!==completed[0].hash))throw Error('Completed output differs');if(errors.length)throw Error(errors.join('\n'));
 await writeFile('docs/lighting/tree-near-retexture/performance/mobility-worker-cancellation-abba.json',JSON.stringify({scope:'Synthetic read-only native route batches in an isolated Worker. Cooperative variants yield by timer or MessageChannel between 40-query groups, independent of rendering. Results from invalidated single jobs must be discarded by the caller; no authoritative state, gameplay or frame measurement.',results},null,2)+'\n');
}finally{await browser.close();}
