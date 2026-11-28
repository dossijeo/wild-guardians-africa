import fs from 'node:fs';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const staged=process.env.STAGE_COLOR==='1',hold=process.env.HOLD_SHADOW==='1',textures=process.env.STAGE_TEXTURES==='1',resize=process.env.RESIZE_2048==='1';await page.goto('http://127.0.0.1:5175/tests/browser/shadow-program-preparation.html'+(staged?'?stageColor'+(hold?'&holdShadow':'')+(textures?'&stageTextures':'')+(resize?'&resize2048':''):''));
 await page.waitForFunction(()=>window.shadowPreparationResult||window.shadowPreparationError,null,{timeout:120000});
 const result=await page.evaluate(()=>({result:window.shadowPreparationResult,error:window.shadowPreparationError}));
 fs.writeFileSync(`docs/lighting/tree-near-retexture/performance/shadow-program-preparation-probe${textures?'-texture-abba':staged?hold?'-color-shadow-reuse':'-color-first':''}${resize?'-2048':''}${process.env.RUN_SUFFIX??''}.json`,JSON.stringify({...result,errors},null,2));
 console.log(JSON.stringify({...result,errors}));if(result.error||errors.length)process.exitCode=1;
}finally{await browser.close();}
