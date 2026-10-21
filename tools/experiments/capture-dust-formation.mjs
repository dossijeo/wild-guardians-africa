import {pathToFileURL} from 'node:url';
import {mkdirSync,writeFileSync} from 'node:fs';
import sharp from 'sharp';
const {chromium}=await import(pathToFileURL(process.env.WG_QA_PLAYWRIGHT_MODULE).href);
// Reproduce a rejected presentation-only variant without changing production files.
const marker="   if(def.id==='fire'){size*=.8+(i%3)*.12;height*=.78+(i%4)*.14;}";
const variant="   if(def.id==='dustdevil'||def.id==='vortex'){size*=1.4;height*=.55;rotation=space.angle(-p.y,p.x,this.world.camera)+Math.PI/2;}";
const out=process.argv[2]??'test-results/dust-formation',tiles=[],rows=[],errors=[];mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const [j,label] of ['before','after'].entries()){
 const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(String(e)));
 if(label==='after')await page.route('**/src/microevents/billboards.js*',async route=>{const response=await route.fetch();const original=await response.text();if(!original.includes(marker))throw Error('Baseline marker changed; review experiment before rerunning');await route.fulfill({response,body:original.replace(marker,marker+'\n'+variant)});});
 await page.goto(`${process.env.WG_QA_URL??'http://127.0.0.1:5267'}/?qa-microevents&qa-microevents-fixture=wood`);
 await page.waitForFunction(()=>!!window.__microevents,null,{timeout:120000});await page.evaluate(()=>window.__microevents.billboards.ready);
 for(const [i,id] of ['dustdevil','vortex'].entries()){
  await page.evaluate(async id=>{const c=window.__microevents;c.cancel('qa');c.qaFrozen=true;c.state.time=100;c.director.random=(()=>{let seed=178;return()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);})();if(!await c.force(id))throw Error(id);for(let i=0;i<45;i++)c.particles.step(1/60,{present:false,owned:false,x:0,y:0,vx:0,vy:0,hold:0});c.refreshQaHit();},id);
  await page.waitForTimeout(200);const file=`${out}/${id}-${label}.webp`;await sharp(await page.screenshot()).webp({lossless:true}).toFile(file);
  tiles.push({input:await sharp(file).extract({left:710,top:180,width:330,height:230}).png().toBuffer(),left:j*330,top:i*230});
  rows.push({id,label,...await page.evaluate(()=>{const c=window.__microevents;return {instances:c.billboards.count,render:c.world.renderer.info.render,particleTime:c.particles.time};})});
 }
 await page.close();
}}finally{await browser.close();}
await sharp({create:{width:660,height:460,channels:4,background:'#1e3022'}}).composite(tiles).webp({lossless:true}).toFile(`${out}/comparison.webp`);
writeFileSync(`${out}/captures.json`,JSON.stringify({seed:178,viewport:[1280,720],rows,errors},null,2));if(errors.length)throw Error(errors.join('\n'));
