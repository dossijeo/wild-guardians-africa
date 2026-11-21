import fs from 'node:fs';import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const out='docs/lighting/tree-near-retexture',errors=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 page.on('pageerror',e=>{errors.push(String(e));console.log('pageerror',String(e));});
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:5175/tests/browser/african-toon.html?case=1&q=media&visualLabReference=1',{waitUntil:'domcontentloaded',timeout:60000});
 console.log('World page opened');
 let failure;
 try{await page.waitForFunction(()=>window.qaVisualReference&&document.querySelector('#status')?.textContent.includes('/30 ·'),null,{timeout:180000});}catch(error){failure=String(error);}
 const report=await page.evaluate(()=>{const w=window.qaVisualReference?.world;return {status:document.querySelector('#status')?.textContent,ready:!!w,camera:w?.camera.position.toArray(),nearBatches:w?[...w.chunks.values()].flatMap(g=>g.userData.lodBatches??[]).filter(b=>b.prototype.nearTextureDistance).map(b=>({slot:b.slot,counts:b.meshes.map(m=>m.count)})):[]};});
 await page.addStyleTag({content:'body{margin:0}body>header,body>details,body>aside{display:none!important}canvas#world{position:fixed;inset:0;width:100vw;height:100vh}'});
 await page.screenshot({path:`${out}/world-initial.png`});
 fs.writeFileSync(`${out}/world-initial.json`,JSON.stringify({report,errors,failure},null,2)+'\n');
 console.log(JSON.stringify({ready:report.ready,status:report.status?.slice(0,300),errors,failure}));
}finally{await browser.close();}
