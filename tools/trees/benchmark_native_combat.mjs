import fs from 'node:fs';import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const out=process.env.COMBAT_OUT??'docs/lighting/tree-near-retexture/performance/combat-windowed';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const scenarios=[false,true,true,false].map(cache=>({cache,phase:'day'}));scenarios.push({cache:true,phase:'night'});
 for(const [lot,{cache,phase}]of scenarios.entries()){
  const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1}),errors=[];
  page.on('pageerror',e=>errors.push(e.stack??String(e)));
  const query='nativeRaid&lightingReview&characterLod=auto&recoveryClose&profileStages'+(phase==='day'?'&recoveryDay':'')+(cache?'':'&noShadowCache');
  await page.goto('http://127.0.0.1:5175/tests/browser/guardian-combat.html?'+query,{waitUntil:'domcontentloaded'});
  console.log('combat',lot,'loading',cache);
  try{await page.waitForFunction(()=>{try{return JSON.parse(document.querySelector('#status').textContent).combatPhysics;}catch{return false;}},null,{timeout:420000});}
  catch(error){fs.writeFileSync(`${out}/load-failure-${lot}.json`,JSON.stringify({query,errors,status:await page.locator('#status').textContent(),failure:String(error)},null,2));throw error;}
  await page.locator('#species').selectOption('lion');await page.locator('#direction').selectOption('side');
  await page.locator('#benchPhysics').evaluate(b=>b.click());
  try{await page.waitForFunction(()=>{try{return JSON.parse(document.querySelector('#status').textContent).report?.completedSimulation;}catch{return false;}},null,{timeout:240000});}
  catch(error){fs.writeFileSync(`${out}/cycle-failure-${lot}.json`,JSON.stringify({query,errors,status:await page.locator('#status').textContent(),failure:String(error)},null,2));throw error;}
  const data=await page.locator('#status').evaluate(e=>JSON.parse(e.textContent));
  if(data.report.metrics.dt.count!==data.report.frames-1)throw Error('Missing in-window cadence measurement');
  fs.writeFileSync(`${out}/lion-side-${lot}-${cache?'on':'off'}.json`,JSON.stringify({query,lot,cache,phase,errors,...data},null,2)+'\n');
  await page.addStyleTag({content:'header,body>button{display:none!important}'});
  await page.screenshot({path:`${out}/lion-side-${lot}.png`});
  if(errors.length||data.errors.length||data.report.errors.length||data.report.hiddenFrames)throw Error('Invalid native combat measurement');
  console.log('combat',lot,'done',data.report.wallMs,data.report.frames);
  if(phase==='night'){
   await page.locator('#benchStress').evaluate(b=>b.click());
   await page.waitForFunction(()=>{try{const r=JSON.parse(document.querySelector('#status').textContent).report;return Array.isArray(r)&&r.length===4;}catch{return false;}},null,{timeout:240000});
   const stress=await page.locator('#status').evaluate(e=>JSON.parse(e.textContent));
   fs.writeFileSync(`${out}/night-incursion.json`,JSON.stringify({query,scope:'Existing native 20-beast visual stress diagnostic. The fixture advances its presentation clock, not full Game.tick simulation. Four sequential modes; not a paired texture comparison or live-raid gameplay benchmark.',...stress},null,2)+'\n');
   await page.screenshot({path:`${out}/night-incursion.png`});
   if(errors.length||stress.errors.length)throw Error('Native incursion has runtime errors');
   console.log('night incursion done');
  }
  await page.close();
 }
}finally{await browser.close();}
