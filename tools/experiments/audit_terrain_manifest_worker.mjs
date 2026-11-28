import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(String(error)));
 await page.goto((process.env.QA_BASE_URL??'http://127.0.0.1:5175')+'/tests/browser/authority-terrain-manifest.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.ready,{timeout:60000});const result=await page.evaluate(()=>window.audit());
 if(errors.length)throw Error(JSON.stringify({errors,result}));console.log(JSON.stringify(result));
}finally{await browser.close();}
