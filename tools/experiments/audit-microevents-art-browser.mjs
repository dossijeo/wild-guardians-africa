import {mkdirSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.WG_QA_PLAYWRIGHT_MODULE).href);
const browser=await chromium.launch({channel:'chrome',headless:true});
const selected=process.argv[3]?.split(',');
const base=process.env.WG_QA_URL??'http://127.0.0.1:5237';
const out=process.argv[2]??'test-results/microevents-art';mkdirSync(out,{recursive:true});const rows=[];
try{for(const fixture of (selected?['wood']:['wood','wet','rocks'])){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1,...(process.env.WG_QA_VIDEO==='1'?{recordVideo:{dir:out,size:{width:1280,height:720}}}:{})});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(`${base}/?qa-microevents&qa-microevents-fixture=${fixture}`,{waitUntil:'domcontentloaded',timeout:180000});
 await page.waitForFunction(()=>!!window.__microevents,null,{timeout:120000});await page.evaluate(async()=>{await window.__microevents.billboards.ready;});
 const ids=await page.evaluate(async fixture=>{const {EVENTS}=await import('/src/microevents/definitions.js');return Object.keys(EVENTS).filter(id=>fixture==='wet'?id==='fog'||id==='fireflies':fixture==='rocks'?id==='fallingdebris':!['fog','fireflies','fallingdebris'].includes(id));},fixture);
 for(const id of ids.filter(id=>!selected||selected.includes(id))){
  const result=await page.evaluate(async id=>{const c=window.__microevents;const {EVENTS}=await import('/src/microevents/definitions.js');c.cancel('qa');c.qaFrozen=true;c.state.time=EVENTS[id].night?310:100;c.director.random=(()=>{let seed=178;return()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);})();const forced=await c.force(id);if(!forced)return {forced,blocked:c.blocked()};for(let i=0;i<45;i++)c.particles.step(1/60,{present:false,owned:false,x:0,y:0,vx:0,vy:0,hold:0});c.refreshQaHit();return {forced};},id);
  await page.waitForTimeout(150);const metrics=await page.evaluate(()=>{const c=window.__microevents;return {instances:c.billboards.count,renderer:c.diagnostic.dataset.renderer,render:c.world.renderer.info.render,particleTime:c.particles.time,anchor:c.active?.anchor.entity.id};});
  await page.screenshot({path:`${out}/${id}.png`});rows.push({id,fixture,...result,...metrics,errors:[...errors]});console.log(id,result.forced,metrics.instances);
  if(process.env.WG_QA_VIDEO==='1'&&result.forced){await page.evaluate(()=>{window.__microevents.qaFrozen=false;});await page.waitForTimeout(2500);await page.evaluate(()=>{window.__microevents.qaFrozen=true;});await page.screenshot({path:`${out}/${id}-motion.png`});}
  if(process.env.WG_QA_GESTURES==='1'&&result.forced){
   await page.evaluate(()=>{delete document.querySelector('[aria-label="QA Gesture result"]').dataset.report;});
   await page.getByText('QA Primary interaction',{exact:true}).click();
   await page.waitForFunction(()=>!!document.querySelector('[aria-label="QA Gesture result"]')?.dataset.report,null,{timeout:20000});
   rows.at(-1).gesture=await page.evaluate(()=>JSON.parse(document.querySelector('[aria-label="QA Gesture result"]').dataset.report));
  }
 }await page.close();
}}finally{await browser.close();writeFileSync(`${out}/results.json`,JSON.stringify(rows,null,2));}

if(rows.some(row=>!row.forced||!row.instances||row.errors.length||row.gesture&&(!row.gesture.completed||row.gesture.usedFallback)))process.exitCode=1;
