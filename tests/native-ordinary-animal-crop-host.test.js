import test from 'node:test';
import {originalRig} from './helpers/native-animal-crop-rig.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
function fixture(){
const s=deserialize(gunzipSync(readFileSync('tests/fixtures/sabana712-d1-native-active-raid.json.gz')).toString());
const {chunkKeys}=JSON.parse(readFileSync('docs/guardian/performance/native-ordinary-attack-crops-20261121.json'));
const manifest={epoch:'crop',chunks:chunkKeys.map(k=>{const [cx,cz]=k.split(',').map(Number);return {cx,cz,revision:1};})};
return {s,manifest,chunkKeys};
}
test('prepared warthog retains its original rig across the issued crop route and strike',async()=>{
const {s,manifest,chunkKeys}=fixture();
const rig=await originalRig(structuredClone(s),manifest);const ready=[],commits=[],frames=[];
const f=await nativeProductionAuthority(s,{qualifyAnimalCrop:true,chunkKeys,getTerrainManifest:()=>manifest,onPrepare:r=>rig.prepare(r.resources),onReady:r=>new Promise(resolve=>ready.push(resolve)),
 onCommit:(r,data)=>{const proof=data.nativeAnimalCropRouteBinding??data.nativeAnimalCropStrikeBinding;rig.commit(proof,data);commits.push(proof);}});
try{
 const advance=()=>JSON.parse(f.command({kind:'advance',seconds:.05,steps:1,nightFastForward:false}).snapshot);let state=f.snapshot();
 for(const kind of [26,27]){
  await untilProduction(f,()=>ready.length>0);
  const held=state.raid.animals[0];state=advance();
  assert.equal(state.raid.animals[0].x,held.x);assert.equal(state.raid.animals[0].motionPhase,held.motionPhase);
  ready.shift()();await untilProduction(f,()=>commits.at(-1)?.reference.kind===kind);
  await untilProduction(f,()=>f.host.inspect().nativeRouteFrame?.worldBoundary?.ticket===commits.at(-1).reference.worldBoundary.ticket);
  const ref=commits.at(-1).preparedReference,proof=commits.at(-1).reference,first=f.host.inspect().nativeRouteFrame;
  assert(first.bindings.some(b=>b.nativeAnimalCrop?.kind===kind&&b.executionEpoch===proof.worldBoundary.effectiveTime));
  const ages=[];
  for(let i=0;i<400;i++){
   state=advance();rig.update(structuredClone(state));await f.present();const fact=f.host.inspect().nativeRouteFrame?.bindings.find(b=>b.nativeAnimalCrop?.kind===kind);
   if(fact){if(!ages.length){const bad=structuredClone(f.host.inspect());bad.nativeRouteFrame.bindings.find(b=>b.nativeAnimalCrop).nativeAnimalCrop.worldBoundary.authorityEpoch='obsolete';assert.throws(()=>captureNativeRoutePickFrame(bad));}
     if(ages.length%45===0&&state.raid.animals[0].targetId)rig.presented(fact.relativeTime);assert.equal(captureNativeRoutePickFrame(f.host.inspect()).getAnimalCropAge(ref),fact.relativeTime);assert.deepEqual(fact.nativeAnimalCrop,ref);ages.push(fact.relativeTime);}
   if(kind===26&&f.records.length===2||kind===27&&state.events.some(e=>e.type==='AnimalLogicalHit'))break;
  }
  assert(ages.some(age=>age>.1));assert(ages.every((age,i)=>!i||age>=ages[i-1]));
  frames.push({kind,ticket:proof.worldBoundary.ticket,first:first.clockElapsed,ages:ages.length,last:ages.at(-1)});
 }
 assert.equal(state.events.filter(e=>e.type==='AnimalLogicalHit'&&e.attackId==='attack-661').length,1);
 assert.equal(state.raid.animals[0].hitsRemaining,1);assert.deepEqual(f.faults,[]);
 console.log(JSON.stringify({frames,hit:'attack-661',faults:f.faults}));
}catch(e){console.error(f.faults,f.authority.nativeIntentProductionStatus(),f.host.inspect().nativeRouteFrame);throw e;}finally{await f.close();rig.close();}

});

test('ordinary profile finishes a two-step advance across the first hit until the successor is admitted',async()=>{
const {s,manifest,chunkKeys}=fixture();
const f=await nativeProductionAuthority(s,{chunkKeys,getTerrainManifest:()=>manifest});
try{
 let state=f.snapshot(),hits=new Set(),ticks=0;
 while(!hits.size&&ticks++<550){state=f.advance();for(const e of state.events)if(e.type==='AnimalLogicalHit')hits.add(e.attackId);await f.present();}
 assert(hits.size);const after=f.advance();assert(after.elapsed>state.elapsed);assert.equal(f.records.length,0);assert.deepEqual(f.faults,[]);
 console.log(JSON.stringify({twoStepOrdinary:true,ticks,hits:[...hits],elapsedAfterHit:after.elapsed,cropProposals:f.records.length}));
}finally{await f.close();}
});

for(const contention of ['historical','locomotion']){
 test('crop route acquires its original rig during '+contention+' preparation',async()=>{
  const {s,manifest,chunkKeys}=fixture();
  const rig=await originalRig(structuredClone(s),manifest,{contention});
  const f=await nativeProductionAuthority(s,{qualifyAnimalCrop:true,chunkKeys,getTerrainManifest:()=>manifest,
   onPrepare:r=>rig.prepare(r.resources),onCommit:(r,data)=>rig.commit(data.nativeAnimalCropRouteBinding,data)});
  try{
   await untilProduction(f,()=>f.host.inspect().nativeRouteFrame?.bindings.some(b=>b.nativeAnimalCrop?.kind===26));
   assert.deepEqual(f.faults,[]);
  }finally{await f.close();rig.close();}
 });
}
