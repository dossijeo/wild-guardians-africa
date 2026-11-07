import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.QA_BASE_URL??'http://127.0.0.1:5187',browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-webgpu']});
try{const page=await browser.newPage();try{await page.goto(`${base}/tests/browser/worker-webgpu-auto-loss.html`);await page.waitForFunction(()=>window.ready,{timeout:10000});const result=await page.evaluate(()=>window.audit());if(result.backend!=='WebGPU'||result.attached<result.base)throw Error('Automatic recovery did not reach the checkpoint');console.log(JSON.stringify(result));}finally{await page.close();}}finally{await browser.close();}
