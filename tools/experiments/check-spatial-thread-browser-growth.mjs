import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(String(error)));
 // Isolated blank page avoids running the game alongside this native test.
 await page.route('**/pthread-growth-qa',route=>route.fulfill({contentType:'text/html',headers:{'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp'},body:'<!doctype html><title>Shared heap growth QA</title>'}));
 await page.goto(`http://127.0.0.1:${process.env.WG_THREAD_PORT??5299}/pthread-growth-qa`);
 const result=await page.evaluate(async()=>{
  if(!crossOriginIsolated)throw Error('Expected isolated browser');
  const {default:factory}=await import('/wild-engine/spatial-threaded.mjs');
  const {createThreadedSpatialWorld}=await import('/src/world/wild-engine/spatial-thread-runtime.js');
  const {exerciseThreadGrowth}=await import('/tools/experiments/spatial-thread-growth-case.mjs');
  const handle=await createThreadedSpatialWorld(factory);
  const report=await exerciseThreadGrowth(handle);
  return {isolated:crossOriginIsolated,userAgent:navigator.userAgent,report,workersAfterDisposal:{running:Object.keys(handle.runtime.PThread.pthreads).length,unused:handle.runtime.PThread.unusedWorkers.length}};
 });
 if(errors.length)throw Error(JSON.stringify(errors));
 if(result.workersAfterDisposal.running||result.workersAfterDisposal.unused)throw Error('Workers retained after disposal');
 await writeFile('docs/qa/wild-engine-pthreads/thread-browser-growth.json',JSON.stringify({scope:'Actual Chrome native runtime pressure test; no game renderer or GPU accounting',result,errors},null,2)+'\n');
 console.log(JSON.stringify({passes:result.report.passes,workers:result.workersAfterDisposal}));
}finally{await browser.close();}
