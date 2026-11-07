import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:800,height:600}}),errors=[];
 page.on('pageerror',error=>errors.push(String(error)));
 await page.goto(process.env.MOBILITY_LAB_URL||'http://127.0.0.1:5175/tests/browser/mobility-worker-latency.html');
 await page.waitForFunction(()=>window.mobilityWorkerReady||window.mobilityWorkerError,null,{timeout:120000});
 const error=await page.evaluate(()=>window.mobilityWorkerError);if(error)throw Error(error);
 const results=[];
 for(let i=0;i<3;i++)results.push(await page.evaluate(()=>window.runMobilityWorkerInvalidationExperiment()));
 if(errors.length)throw Error(errors.join('\n'));
 const report={description:'Synthetic external invalidation during worker navigation; no game-world authority, production safety or continuity guarantee.',results};
 await writeFile('docs/lighting/tree-near-retexture/performance/mobility-worker-invalidation.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
