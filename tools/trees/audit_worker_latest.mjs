import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(process.env.MOBILITY_LATEST_URL||'http://127.0.0.1:5175/tests/browser/mobility-worker-latest.html');
 await page.waitForFunction(()=>window.latestReady||window.latestError,null,{timeout:120000});
 const error=await page.evaluate(()=>window.latestError);if(error)throw Error(error);
 const report=await page.evaluate(()=>window.runLatestAudit());if(errors.length)throw Error(errors.join('\n'));
 await writeFile('docs/lighting/tree-near-retexture/performance/mobility-worker-latest-audit.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
