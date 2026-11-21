import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright'),base=process.env.QA_BASE_URL??'http://127.0.0.1:5192';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{const page=await browser.newPage();await page.goto(base+'/tests/browser/authority-authored-centers.html');await page.waitForFunction(()=>window.ready,{timeout:10000});const result=await page.evaluate(()=>window.audit());if(result.steps!==100||!result.active)throw Error('Incomplete Rapier comparison');console.log(JSON.stringify(result));}finally{await browser.close();}
