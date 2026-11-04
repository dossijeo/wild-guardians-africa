import {pathToFileURL} from 'node:url';
if(!process.env.WG_QA_PLAYWRIGHT_MODULE)throw Error('Set WG_QA_PLAYWRIGHT_MODULE to playwright/index.mjs');
const {chromium}=await import(pathToFileURL(process.env.WG_QA_PLAYWRIGHT_MODULE).href);
import {mkdir,writeFile} from 'node:fs/promises';
const native=process.argv.includes('--native'),three=process.argv.includes('--three'),query=new URLSearchParams();if(native)query.set('native','');if(three)query.set('three','');const out='docs/qa/filament-evaluation/grass-smoke'+(three?'-three':'')+(native?'-native':'');await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1300,height:900}}),messages=[];
page.on('console',m=>messages.push({type:m.type(),text:m.text()}));page.on('pageerror',e=>messages.push({type:'error',text:String(e)}));
try{await page.goto('http://127.0.0.1:5296/tools/filament-evaluation/grass-smoke.html?'+query);await page.waitForFunction(()=>window.grassSmoke?.done,null,{timeout:60000});const result=await page.evaluate(()=>window.grassSmoke);await page.screenshot({path:`${out}/browser.png`,fullPage:true});await writeFile(`${out}/result.json`,JSON.stringify({...result,messages},null,2));console.log(JSON.stringify({...result,messages}));}finally{await browser.close();}
