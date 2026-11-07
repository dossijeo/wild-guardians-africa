import {createRequire} from 'node:module';import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{const runs=[];for(let i=0;i<3;i++){const page=await browser.newPage();try{await page.goto('http://127.0.0.1:5175/tests/browser/mobility-worker-window.html');await page.waitForFunction(()=>window.ready);const row=await page.evaluate(()=>window.audit());runs.push(row);console.log(JSON.stringify(row));}finally{await page.close();}}
await writeFile('docs/lighting/tree-near-retexture/performance/mobility-worker-command-window.json',JSON.stringify({scope:'Edge headless, mangrove islands fixture, 40 ticks, no rendering; sender-side admission only, no recovery from lost acknowledgments.',runs},null,2)+'\n');}finally{await browser.close();}
