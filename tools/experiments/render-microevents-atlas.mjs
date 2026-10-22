import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.WG_QA_PLAYWRIGHT_MODULE).href);
const browser=await chromium.launch({channel:'chrome',headless:true});
try{const page=await browser.newPage();await page.goto((process.env.WG_QA_URL??'http://127.0.0.1:5237')+'/tools/microevent-sprite-authoring.html');await page.locator('#render').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Ready:'),null,{timeout:60000});const data=await page.locator('#download').getAttribute('href');writeFileSync('assets-source/microevents/lowpoly-atlas.png',Buffer.from(data.split(',')[1],'base64'));console.log(await page.locator('#status').textContent());}finally{await browser.close();}
