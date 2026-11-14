import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1000,height:1800}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(`${process.env.WG_BASE_URL??'http://127.0.0.1:5175'}/tests/browser/shared-material-coverage.html`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.materialCoverageResult?.done,{timeout:180000});const result=await page.evaluate(()=>window.materialCoverageResult);
 if(result.backend!=='WebGPU real'||result.errors.length||errors.length||result.models.length!==10||result.models.some(m=>m.views.length!==4||m.views.some(v=>v.sharedPixels+v.otherPixels<100)))throw Error(JSON.stringify({result,errors}));
 if(process.env.WG_SCREENSHOT)await page.screenshot({path:process.env.WG_SCREENSHOT,fullPage:true});const output=JSON.stringify(result);if(process.env.WG_OUTPUT)await writeFile(process.env.WG_OUTPUT,output);else console.log(output);
}finally{await browser.close();}
