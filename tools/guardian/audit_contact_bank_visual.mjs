import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const page=await browser.newPage({viewport:{width:800,height:600}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5175/tests/browser/contact-bank-visual.html');
 await page.waitForFunction(()=>window.contactBankVisual||window.contactBankVisualError,null,{timeout:180000});
 const {result,error}=await page.evaluate(()=>({result:window.contactBankVisual,error:window.contactBankVisualError}));
 if(error||errors.length||result?.rows?.length!==5)throw Error(JSON.stringify({error,errors}));
 for(const [name,data] of Object.entries(result.pictures))await writeFile(`docs/guardian/gpu-animation/contact-bank-${name}.png`,Buffer.from(data.split(',')[1],'base64'));
 delete result.pictures;
 await writeFile('docs/guardian/gpu-animation/contact-bank-visual.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result));
} finally {await browser.close();}
