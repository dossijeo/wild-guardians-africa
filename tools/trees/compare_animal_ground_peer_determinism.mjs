import fs from 'node:fs';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright'),browser=await chromium.launch({channel:'msedge',headless:true}),runs=[];
try{
 for(const cached of [false,true]){
  const page=await browser.newPage({viewport:{width:960,height:540}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:5175/tests/browser/guardian-combat.html?biome=gran-canon&culture=mapungubwe&lightingReview&productionFarWarm&treeReview&slopeTrial&recoveryDay&wildEngineThreads=0');
  await page.waitForFunction(()=>window.treeReview&&document.querySelector('#status')?.textContent.includes('"ready": true'),null,{timeout:180000});
  await page.locator('#species').selectOption('rhino');await page.evaluate(()=>{
   document.querySelector('#beast').click();const r=window.treeReview;r.setManual(true);const a=r.state.raid.animals[0];let site;
   for(let radius=3;radius<=10&&!site;radius+=1)for(let i=0;i<24&&!site;i++){const theta=i*Math.PI/12,x=a.x+Math.cos(theta)*radius,z=a.z+Math.sin(theta)*radius;if(r.nav.walkable(x,z,1.1,null,false))site={x,z};}
   if(!site)throw Error('No walkable peer position');r.state.raid.animals.push({...structuredClone(a),id:'qa-fixed-warthog',species:'warthog',radius:1.1,...site});r.nav.setState(r.state);
  });
  await page.waitForFunction(()=>{const r=window.treeReview;r.world.sync(0);return r.state.raid.animals.every(a=>r.world.mixers.has(a.id));},null,{timeout:90000});
  const result=await page.evaluate(cached=>{
   const r=window.treeReview,w=r.world,state=r.state,animals=state.raid.animals,records=[];state.elapsed=3000;
   for(const a of animals){w.mixers.get(a.id).cachedSkinning=cached?2:false;a.motionPhase=0;a.status='attacking';a.animation='Right_Hand_Sword_Slash';a.attackDuration=100;a.attackRemaining=100;a.attackId='qa-fixed-'+a.id;a.targetId=state.structures.find(s=>s.kind==='center')?.id??null;}
   w.sync(0);const start=state.elapsed,dx=animals[1].x-animals[0].x,dz=animals[1].z-animals[0].z,length=Math.hypot(dx,dz);
   for(let i=0;i<animals.length;i++){const a=animals[i],ground=r.nav.field.surface(a.x,a.z),sign=i===0?1:-1;a.magicImpact={at:start,impactAt:start,direction:{x:sign*dx/length,y:.1,z:sign*dz/length},intensity:1,point:{x:a.x,y:ground+.7,z:a.z},ground};}
   for(let i=0;i<720;i++){
    state.elapsed=start+(i+1)/60;w.beastPhysics.step(state,1/60);w.sync(1/60);
    let peerContacts=0;const entries=animals.map(a=>w.beastPhysics.entries.get(a.id));
    if(entries.every(Boolean)){const other=new Set(entries[1].actor.parts.map(({body})=>body.collider(0).handle));for(const {body} of entries[0].actor.parts)entries[0].solver.world.contactPairsWith(body.collider(0),collider=>{if(other.has(collider.handle))peerContacts++;});}
    records.push({peerContacts,actors:animals.map(a=>{const entry=w.beastPhysics.entries.get(a.id),data=w.mixers.get(a.id);return {phase:a.magicDown?.phase??'standing',x:a.x,z:a.z,height:data.model.position.y,pose:entry?Array.from(entry.actor.pose):null};})});
   }
   return {authority:r.authority,biome:state.biome,records,rejected:w.beastPhysics.stats.rejected};
  },cached);
  if(errors.length||result.authority!=='spatial-wasm'||result.rejected)throw Error(JSON.stringify({cached,errors,authority:result.authority,rejected:result.rejected}));runs.push({cached,...result});await page.close();
 }
 let maxDelta=0,mismatchedPhases=0,mismatchedPosePresence=0,mismatchedContacts=0,differentValues=0;
 for(let i=0;i<runs[0].records.length;i++){
  const x=runs[0].records[i],y=runs[1].records[i];if(x.peerContacts!==y.peerContacts)mismatchedContacts++;
  for(let j=0;j<x.actors.length;j++){const a=x.actors[j],b=y.actors[j];if(a.phase!==b.phase)mismatchedPhases++;if(Boolean(a.pose)!==Boolean(b.pose))mismatchedPosePresence++;
   for(const [v,w] of [[a.x,b.x],[a.z,b.z],[a.height,b.height],...(a.pose&&b.pose?a.pose.map((n,k)=>[n,b.pose[k]]):[])]){if(v!==w)differentValues++;maxDelta=Math.max(maxDelta,Math.abs(v-w));}}
 }
 const summary={scope:'Fixed-step two-animal Rapier comparison on native canyon slope, controlled impulses; no navigation tick or GPU timing.',steps:runs[0].records.length,contactFrames:runs.map(run=>run.records.filter(row=>row.peerContacts>0).length),mismatchedContacts,mismatchedPhases,mismatchedPosePresence,differentValues,maxDelta};
 fs.writeFileSync('docs/lighting/tree-near-retexture/performance/animal-ground-peer-determinism-canyon.json',JSON.stringify({summary,runs},null,2));console.log(JSON.stringify(summary));
 if(mismatchedContacts||mismatchedPhases||mismatchedPosePresence||maxDelta>1e-7||!summary.contactFrames.every(n=>n>0))process.exitCode=1;
}finally{await browser.close();}
