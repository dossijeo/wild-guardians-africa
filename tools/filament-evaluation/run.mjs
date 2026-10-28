import {mkdir, writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const modulePath = process.env.WG_QA_PLAYWRIGHT_MODULE;
if (!modulePath) throw Error('Set WG_QA_PLAYWRIGHT_MODULE to playwright/index.mjs');
const {chromium} = await import(pathToFileURL(modulePath).href);
const out = process.env.WG_FILAMENT_OUT ?? 'docs/qa/filament-evaluation/official-web';
await mkdir(out, {recursive:true});
const browser = await chromium.launch({channel:'chrome', headless:true});
const page = await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1});
const consoleMessages = [];
page.on('console', m => consoleMessages.push({type:m.type(), text:m.text()}));
page.on('pageerror', error => consoleMessages.push({type:'pageerror',text:String(error)}));
try {
  await page.goto('http://127.0.0.1:5296/tools/filament-evaluation/index.html');
  await page.waitForFunction(() => window.filamentGate?.done, null, {timeout:45000});
  const result = await page.evaluate(() => ({...window.filamentGate, userAgent:navigator.userAgent,
    resources:performance.getEntriesByType('resource').map(r=>({name:r.name, duration:r.duration, transferSize:r.transferSize, decodedBodySize:r.decodedBodySize}))}));
  await page.screenshot({path:`${out}/browser.png`, fullPage:true});
  await writeFile(`${out}/result.json`, JSON.stringify({...result,consoleMessages},null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
} finally {await browser.close();}
