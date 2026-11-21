import fs from 'node:fs';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright'),browser=await chromium.launch({channel:'msedge',headless:true}),runs=[];
try{
 for(const cached of [false,true]){
  const page=await browser.newPage({viewport:{width:960,height:540}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  const query='biome=gran-canon&culture=mapungubwe&lightingReview&productionFarWarm&treeReview&slopeTrial&recoveryDay&wildEngineThreads=0';
  await page.goto('http://127.0.0.1:5175/tests/browser/guardian-combat.html?'+query);
  await page.waitForFunction(()=>window.treeReview&&document.querySelector('#status')?.textContent.includes('"ready": true'),null,{timeout:180000});
  await page.locator('#species').selectOption('rhino');await page.evaluate(()=>{document.querySelector('#beast').click();window.treeReview.setManual(true);});
  await page.waitForFunction(()=>{const r=window.treeReview,a=r.state.raid?.animals[0];r.world.sync(0);return a&&r.world.mixers.has(a.id);},null,{timeout:90000});
  const result=await page.evaluate(cached=>{
   const r=window.treeReview,w=r.world,state=r.state,a=state.raid.animals[0],data=w.mixers.get(a.id),records=[];r.setManual(true);data.cachedSkinning=cached?2:false;
   state.elapsed=3000;a.motionPhase=0;a.status='attacking';a.animation='Right_Hand_Sword_Slash';a.attackDuration=100;a.attackRemaining=100;a.attackId='qa-fixed';a.targetId=state.structures.find(s=>s.kind==='center')?.id??null;
   w.sync(0);const ground=r.nav.field.surface(a.x,a.z),start=state.elapsed;a.magicImpact={at:start,impactAt:start,direction:{x:1,y:.2,z:0},intensity:1,point:{x:a.x,y:ground+.7,z:a.z},ground};
   for(let i=0;i<720;i++){
    state.elapsed=start+(i+1)/60;w.beastPhysics.step(state,1/60);w.sync(1/60);
    const entry=w.beastPhysics.entries.get(a.id);records.push({phase:a.magicDown?.phase??'standing',x:a.x,z:a.z,height:data.model.position.y,pose:entry?Array.from(entry.actor.pose):null});
   }
   return {authority:r.authority,biome:state.biome,initial:{x:a.spawn.x,z:a.spawn.z},records,rejected:w.beastPhysics.stats.rejected,phases:[...new Set(records.map(row=>row.phase))]};
  },cached);
  if(errors.length||result.authority!=='spatial-wasm'||result.rejected)throw Error(JSON.stringify({cached,errors,result:{authority:result.authority,rejected:result.rejected}}));
  runs.push({cached,...result});await page.close();
 }
 let maxDelta=0,mismatchedPhases=0,mismatchedPosePresence=0,differentValues=0;
 for(let i=0;i<runs[0].records.length;i++){
  const a=runs[0].records[i],b=runs[1].records[i];if(a.phase!==b.phase)mismatchedPhases++;if(Boolean(a.pose)!==Boolean(b.pose))mismatchedPosePresence++;
  for(const [x,y] of [[a.x,b.x],[a.z,b.z],[a.height,b.height],...(a.pose&&b.pose?a.pose.map((v,j)=>[v,b.pose[j]]):[])]){if(x!==y)differentValues++;maxDelta=Math.max(maxDelta,Math.abs(x-y));}
 }
 const summary={scope:'Fixed-step single-animal Rapier and render-pose comparison on native canyon slope; no navigation tick, no GPU timing.',steps:runs[0].records.length,phases:runs.map(x=>x.phases),mismatchedPhases,mismatchedPosePresence,differentValues,maxDelta};
 fs.writeFileSync('docs/lighting/tree-near-retexture/performance/animal-ground-determinism-canyon.json',JSON.stringify({summary,runs},null,2));console.log(JSON.stringify(summary));
 if(mismatchedPhases||mismatchedPosePresence||maxDelta>1e-7||!runs.every(x=>x.phases.includes('recovering')))process.exitCode=1;
}finally{await browser.close();}
