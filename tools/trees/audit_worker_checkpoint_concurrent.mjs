import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const results=[];
 for(let i=0;i<3;i++){
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:5175/tests/browser/mobility-worker-checkpoint-concurrent.html');await page.waitForFunction(()=>window.concurrentCheckpointReady||window.concurrentCheckpointError,null,{timeout:120000});
  const error=await page.evaluate(()=>window.concurrentCheckpointError);if(error)throw Error(error);
  const result=await page.evaluate(()=>window.runConcurrentCheckpointAudit());if(errors.length)throw Error(errors.join('\n'));results.push(result);console.log(JSON.stringify(result));await page.close();
 }
 await writeFile(process.env.OUTPUT??'docs/lighting/tree-near-retexture/performance/mobility-worker-checkpoint-consumer.json',JSON.stringify({results},null,2)+'\n');
}finally{await browser.close();}
