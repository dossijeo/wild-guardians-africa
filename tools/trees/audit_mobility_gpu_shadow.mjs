import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const results=[];
 for(let i=0;i<3;i++){
  const page=await browser.newPage({viewport:{width:600,height:600}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:5175/tests/browser/mobility-gpu-shadow-audit.html');await page.waitForFunction(()=>window.mobilityGpuShadowAudit||window.mobilityGpuShadowError,null,{timeout:120000});
  const result=await page.evaluate(()=>({result:window.mobilityGpuShadowAudit,error:window.mobilityGpuShadowError}));if(result.error||errors.length)throw Error(JSON.stringify({result,errors}));results.push(result.result);console.log(JSON.stringify(result.result));await page.close();
 }
 await writeFile('docs/lighting/tree-near-retexture/performance/mobility-gpu-shadow-audit.json',JSON.stringify({results},null,2)+'\n');
}finally{await browser.close();}
