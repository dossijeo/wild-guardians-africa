import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const results=[];
try {
 for(const mode of ['main','worker','worker','main']) {
  const page=await browser.newPage({viewport:{width:800,height:600}});
  const errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(process.env.MOBILITY_LAB_URL || 'http://127.0.0.1:5175/tests/browser/mobility-worker-latency.html');
  await page.waitForFunction(()=>window.mobilityWorkerReady||window.mobilityWorkerError,null,{timeout:120000});
  const error=await page.evaluate(()=>window.mobilityWorkerError);
  if(error)throw Error(error);
  const result=await page.evaluate(mode=>window.runMobilityWorkerExperiment(mode),mode);
  if(errors.length)throw Error(errors.join('\n'));
  results.push(result);
  console.log(JSON.stringify({mode,device:result.device,intervals:result.intervals,jobs:result.jobs.map(({duration,elapsed,responseLatencyMs,maxIntervalMs,queries})=>({duration,elapsed,responseLatencyMs,maxIntervalMs,queries})),gpu:result.gpu}));
  await page.close();
 }
 await writeFile('docs/lighting/tree-near-retexture/performance/mobility-worker-latency-abba.json',JSON.stringify({description:'Isolated browser laboratory; synthetic requests to production Wild Engine WASM, fixed visual horizon and static rig. Not game integration.',results},null,2)+'\n');
} finally {await browser.close();}
