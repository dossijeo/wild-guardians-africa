import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{const page=await browser.newPage();await page.goto((process.env.QA_BASE_URL??'http://127.0.0.1:5194')+'/tests/browser/guardian-origin-worker.html');await page.waitForFunction(()=>window.ready,{timeout:10000});console.log(JSON.stringify(await page.evaluate(()=>window.audit())));}finally{await browser.close();}
