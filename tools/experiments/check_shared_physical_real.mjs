import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:800,height:1600}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(`${process.env.WG_BASE_URL??'http://127.0.0.1:5175'}/tests/browser/shared-physical-real.html${process.env.WG_PERTURB==='1'?'?perturb=1':''}`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.sharedPhysicalRealResult?.done,{timeout:180000});const result=await page.evaluate(()=>window.sharedPhysicalRealResult);
 if(result.backend!=='WebGPU real'||result.errors.length||errors.length||result.models.length!==10||!result.models.some(m=>m.sharedMeshes)||result.models.some(m=>m.objectPixels<100)||(process.env.WG_PERTURB==='1'&&!result.models.some(m=>m.changedOver5>100)))throw Error(JSON.stringify({result,errors}));
 if(process.env.WG_COMPARE_ONLY!=='1'&&process.env.WG_PERTURB!=='1'&&result.models.some(m=>m.objectMeanAbsoluteRgb>0.5||m.changedOver5>m.objectPixels*.01))throw Error('Static physical comparison exceeded tolerance: '+JSON.stringify(result));
 if(process.env.WG_SCREENSHOT)await page.screenshot({path:process.env.WG_SCREENSHOT,fullPage:true});const output=JSON.stringify(result);if(process.env.WG_OUTPUT)await writeFile(process.env.WG_OUTPUT,output);else console.log(output);
}finally{await browser.close();}
