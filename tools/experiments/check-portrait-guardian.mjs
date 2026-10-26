import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='docs/qa/post-beasts-20261026/tutorial';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),rows=[];
try{for(const [width,height] of [[390,844],[320,568],[768,1024],[1280,720]])for(const lang of ['es','en']){
 const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(`http://127.0.0.1:5218/tests/browser/tutorial-safe-area.html?capture&message=basic.hiring&lang=${lang}`);
 await page.waitForSelector('#guardian-root.visible');await page.waitForTimeout(1400);
 const data=await page.evaluate(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};};return {portrait:document.querySelector('#stage').classList.contains('portrait'),avatar:rect('#guardian-avatar'),bubble:rect('.bubble'),safe:JSON.parse(document.querySelector('#qa-safe-area').textContent)};});
 assert(data.safe.entireColumnSafe);assert(data.safe.bubbleFits);
 if(data.portrait){assert(data.avatar.bottom<=data.bubble.top+1,'Avatar must be above text');assert(data.avatar.top>=0);}
 assert.deepEqual(errors,[]);await page.screenshot({path:`${out}/${width}-${lang}.png`});rows.push({width,height,lang,...data,errors});
 await page.getByRole('button',{name:'Cerrar',exact:true}).click();await page.waitForTimeout(1200);assert.equal(await page.locator('#guardian-root').getAttribute('aria-hidden'),'true');await page.close();
}}finally{await browser.close();await writeFile(out+'/report.json',JSON.stringify(rows,null,2));}
console.log('Portrait guardian, text and HUD checks passed:',rows.length);
