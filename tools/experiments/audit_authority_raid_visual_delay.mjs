import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{const page=await browser.newPage();await page.goto((process.env.QA_BASE_URL??'http://127.0.0.1:5187')+'/tests/browser/authority-raid-visual-delay.html');await page.waitForFunction(()=>window.ready,{timeout:10000});const result=await page.evaluate(()=>window.audit());if(result.spawnTick===null||!result.animals||result.held.acknowledged!==0)throw Error('Incomplete visual-delay raid test');console.log(JSON.stringify(result));}finally{await browser.close();}
