import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {gunzipSync} from 'node:zlib';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';
import {nativeCropRouteSubject} from '../src/simulation/raids.js';
import {deserialize} from '../src/persistence/snapshots.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {originalRig} from './helpers/native-animal-crop-rig.js';

const input=gunzipSync(readFileSync('tests/fixtures/sabana712-d1-native-active-raid.json.gz')).toString();
const {chunkKeys}=JSON.parse(readFileSync('docs/guardian/performance/native-ordinary-attack-crops-20261121.json'));

async function settle(f,promise){
 let settled=false;
 promise.finally(()=>settled=true).catch(()=>{});
 for(let i=0;i<500&&!settled;i++)await f.present();
 assert(settled);
 return promise;
}

for(const expiredFirst of [false,true])test(expiredFirst?'remaining hit approaches the same crop after an expired border miss':
 'protected strike repeats from the same border and stays acquired when its shield expires',async()=>{
 const initial=deserialize(input),manifest={epoch:'crop',chunks:chunkKeys.map(key=>{
   const [cx,cz]=key.split(',').map(Number);return {cx,cz,revision:1};
 })};
 const rig=await originalRig(structuredClone(initial),manifest);
 const proofs=[],facts=[];
 let stop,releaseStrike,heldSteps=0,checkedRemoval=false,firstImpact;
 const f=await nativeProductionAuthority(initial,{chunkKeys,qualifyAnimalCrop:true,qualifyShieldExpiry:true,getTerrainManifest:()=>manifest,
  async onPrepare(record){
   if(record.kind.startsWith('animal-crop-'))await rig.prepare(record.resources);
   else if(record.resources.nativeShieldCropStop)stop=await rig.prepareStop(record.resources);
  },
  onCommit(record,data){
   if(record.kind.startsWith('animal-crop-')){
    const proof=data.nativeAnimalCropRouteBinding??data.nativeAnimalCropStrikeBinding;
    rig.commit(proof,data);proofs.push(proof);
   }else if(record.resources.nativeShieldCropStop){stop.commit(data);stop=null;}
  },
  onReady(record){
   if(!expiredFirst&&!releaseStrike&&record.kind==='animal-crop-strike'&&proofs.some(p=>p.reference.kind===27))
    return new Promise(resolve=>{releaseStrike=resolve;});
  }
 });
 try{
  await untilProduction(f,()=>proofs.length===1);
  await f.present();
  let state=f.snapshot();rig.update(structuredClone(state));
  const command={kind:'castShield',id:'shield-protected-strikes',x:90,z:expiredFirst?5.6:7.5};
  await settle(f,f.authority.prepareNativeStructureCommand(command));
  assert.equal((await settle(f,f.structureCommand(command))).value,true);
  await settle(f,f.authority.finishNativeStructureCommand(command));
  const checkpoint=()=>f.command({kind:'snapshot',visualTerrain:true,nativeAuthorityCheckpoint:true});
  await untilProduction(f,()=>proofs.length===2);
  const owner=checkpoint().nativeAuthorityCheckpoint.shieldOwners[0];assert(owner);
  const plant=state.plants.find(p=>p.id==='plant-373'),priorHits=plant.attackHits;
  const pose=a=>[a.x,a.z,a.heading,a.motionPhase];
  for(let i=0;i<850&&state.raid;i++){
   const op=f.command({kind:'advance',seconds:.05,steps:1,nightFastForward:false});
   const result=op.then?await settle(f,op):op;
   state=JSON.parse(result.snapshot);rig.update(structuredClone(state));await f.present();
   const actor=state.raid?.animals[0],events=result.events;
   facts.push(...events.filter(e=>['AnimalLogicalHit','AnimalLogicalMiss','CropHit','CropDestroyed','RaidEnded'].includes(e.type)));
   if(!expiredFirst&&events.some(e=>e.type==='AnimalLogicalHit')){
    firstImpact={pose:pose(actor),rng:state.rng,reservation:actor.reservation};
    assert.equal(actor.approachShieldId,owner.spellId);assert.equal(actor.hitsRemaining,1);
   }
   if(actor?.status==='walking'&&proofs.at(-1)?.reference.kind===26&&proofs.at(-1).reference.purpose!=='retreat'&&state.elapsed>=proofs.at(-1).reference.endTime){
    if(firstImpact)await untilProduction(f,()=>!!releaseStrike);
    else await untilProduction(f,()=>proofs.some(p=>p.reference.kind===27&&p.reference.routeTicket===proofs.findLast(q=>q.reference.kind===26).reference.worldBoundary.ticket));
   }
   if(releaseStrike&&heldSteps<2){
    assert.deepEqual(pose(actor),firstImpact.pose);assert.equal(actor.reservation,firstImpact.reservation);
    assert.equal(state.rng,firstImpact.rng);assert.equal(actor.hitsRemaining,1);
    if(++heldSteps===2){releaseStrike();await untilProduction(f,()=>proofs.filter(p=>p.reference.kind===27).length===2);}
   }
   const removal=f.records.find(r=>r.resources.kind===4&&r.committed);
   if(removal&&!checkedRemoval){
    await settle(f,removal.packet.presented);
    const ref=proofs.at(-1),frame=f.host.inspect().nativeRouteFrame;
    assert.equal(ref.reference.kind,27);assert.equal(actor.attackId,'attack-'+ref.attackId);
    assert.equal(actor.approachShieldId,owner.spellId);
    const {x,z,yaw,phase:motionPhase}=ref.reference;
    assert.deepEqual(pose(actor),[x,z,yaw,motionPhase]);
    assert.equal(state.raid.reservations[actor.reservation],actor.id);
    assert.equal(actor.hitsRemaining,expiredFirst?2:1);
    assert.equal(state.spells.length,0);assert.equal(removal.resources.nativeShield.polygonId,owner.polygonId);
    assert.equal(removal.resources.retainsNativeAssignments,true);assert.deepEqual(frame.worldBoundary,removal.resources.worldBoundary);
    const binding=frame.bindings.find(v=>v.nativeAnimalCrop?.kind===27&&v.semantic==='relative');
    assert.deepEqual(binding.nativeAnimalCrop,ref.preparedReference);
    const age=captureNativeRoutePickFrame(f.host.inspect()).getAnimalCropAge(ref.preparedReference);
    assert.equal(age,binding.relativeTime);assert(age>0);rig.presented(age);
    assert.equal(checkpoint().nativeAuthorityCheckpoint.shieldOwners.length,0);
    const native={mode:3,shieldExpired:true,shieldPolygon:owner.polygonId,shieldContact:{...removal.resources.nativeShield.spell},strike:{attackId:ref.attackId}};
    assert(nativeCropRouteSubject(state,actor,null,native));
    for(const wrong of [{shieldExpired:false},{shieldPolygon:0},{mode:2},{strike:{attackId:ref.attackId+1}},{shieldContact:{...native.shieldContact,id:'other'}}]){
     assert.equal(nativeCropRouteSubject(state,actor,null,{...native,...wrong}),null);
    }
    checkedRemoval=true;
   }
  }
  assert.equal(heldSteps,expiredFirst?0:2);assert(checkedRemoval);assert.equal(state.raid,null);
  const hits=facts.filter(e=>e.type==='AnimalLogicalHit'),misses=facts.filter(e=>e.type==='AnimalLogicalMiss');
  assert.equal(hits.length,1);assert.equal(hits[0].presentation.shield?.id,expiredFirst?undefined:owner.spellId);
  assert.equal(misses.length,1);assert.equal(misses[0].reason,'shield-expired');
  const strikes=proofs.filter(p=>p.reference.kind===27);
  assert.deepEqual(strikes.map(p=>'attack-'+p.attackId),expiredFirst?[misses[0].attackId,hits[0].attackId]:[hits[0].attackId,misses[0].attackId]);
  assert.notEqual(hits[0].attackId,misses[0].attackId);
  assert(proofs.every(p=>p.reference.bodyId===1));assert.deepEqual(proofs.map(p=>p.reference.kind),[26,26,27,26,27,26]);
  assert.equal(proofs.at(-1).reference.purpose,'retreat');
  const crop=state.plants.find(p=>p.id===plant.id);
  for(const event of ['CropHit','CropDestroyed'])assert.equal(facts.filter(e=>e.type===event&&e.targetId===plant.id).length,expiredFirst?1:0);
  assert.equal(crop.alive,!expiredFirst);assert.equal(crop.attackHits,expiredFirst?1:priorHits);
  const resumed=proofs[3].reference,finished=strikes[0].reference;
  for(const key of ['actorId','bodyId','targetId','x','z','yaw','phase'])assert.equal(resumed[key],finished[key],key);
  if(expiredFirst){
    const second=strikes[1].reference;
    assert(Math.abs(Math.hypot(second.x-plant.x,second.z-plant.z)-(second.radius+.6))<2e-6);
    assert(resumed.endTime>resumed.worldBoundary.effectiveTime);
  }else assert.equal(resumed.endTime,resumed.worldBoundary.effectiveTime);
  assert.equal(facts.filter(e=>e.type==='RaidEnded').length,1);assert.deepEqual(f.faults,[]);
 }finally{releaseStrike?.();await f.close();stop?.abort();rig.close();}
});

for(const consumer of ['retains the strike','drew its absence','receives a forged strike ticket'])
 test('Shield expiry cancels a pending protected successor while Draw '+consumer,async()=>{
 const initial=deserialize(input),manifest={epoch:'crop',chunks:chunkKeys.map(key=>{
  const [cx,cz]=key.split(',').map(Number);return {cx,cz,revision:1};
 })};
 const rig=await originalRig(structuredClone(initial),manifest);
 const routes=[],strikes=[],facts=[];
 let stop,held,readyRemoval,releaseRoute,releaseRemoval;
 const f=await nativeProductionAuthority(initial,{chunkKeys,qualifyAnimalCrop:true,qualifyShieldExpiry:true,getTerrainManifest:()=>manifest,
  async onPrepare(record,{signal}={}){
   if(record.kind.startsWith('animal-crop-')){
    record.signal=signal;
    await rig.prepare(record.resources,signal);
   }else if(record.resources.nativeShieldCropStop)stop=await rig.prepareStop(record.resources);
   else if(consumer==='receives a forged strike ticket'&&record.resources.nativeShieldCropExpiry){
    const proof=record.resources.nativeShieldCropExpiry;
    record.resources.nativeShieldCropExpiry={...proof,strikeTicket:proof.strikeTicket-1};
   }
  },
  onCommit(record,data){
   if(record.kind.startsWith('animal-crop-')){
    const proof=data.nativeAnimalCropRouteBinding??data.nativeAnimalCropStrikeBinding;
    rig.commit(proof,data);
    (proof.reference.kind===26?routes:strikes).push(proof);
   }else if(record.resources.nativeShieldCropStop){stop.commit(data);stop=null;}
  },
  onReady(record){
   if(record.kind==='animal-crop-route'&&strikes.length===1&&!held){
    held=record;return new Promise(resolve=>{releaseRoute=resolve;});
   }
   if(record.resources.nativeShieldCropExpiry){
    readyRemoval=record;return new Promise(resolve=>{releaseRemoval=resolve;});
   }
  }
 });
 try{
  await untilProduction(f,()=>routes.length===1);
  await f.present();rig.update(structuredClone(f.snapshot()));
  const command={kind:'castShield',id:'shield-protected-successor-pending',x:90,z:7.5};
  await settle(f,f.authority.prepareNativeStructureCommand(command));
  assert.equal((await settle(f,f.structureCommand(command))).value,true);
  await settle(f,f.authority.finishNativeStructureCommand(command));
  await untilProduction(f,()=>routes.length===2);
  const step=seconds=>f.command({kind:'advance',seconds,steps:1,nightFastForward:false});
  async function observe(operation){
   const result=await (operation.then?settle(f,operation):operation);
   const state=JSON.parse(result.snapshot);rig.update(structuredClone(state));await f.present();
   facts.push(...result.events.filter(e=>['AnimalLogicalHit','AnimalLogicalMiss','CropHit','RaidEnded'].includes(e.type)));
   return state;
  }
  let state;
  for(let i=0;i<400&&!facts.length;i++){
   state=await observe(step(.05));
   if(state.elapsed>=routes[1].reference.endTime&&!strikes.length)await untilProduction(f,()=>strikes.length===1);
  }
  const old=strikes[0].reference,shield=state.spells[0];
  assert.deepEqual(facts.map(e=>[e.type,e.attackId,e.presentation.shield?.id]),[['AnimalLogicalHit','attack-'+strikes[0].attackId,shield.id]]);
  assert(f.host.inspect().nativeRouteFrame.bindings.some(b=>b.nativeAnimalCrop?.kind===27));
  if(consumer==='drew its absence'){
   const world=f.host.inspect().nativeRouteFrame.worldBoundary,at=state.elapsed;
   f.client.beginFrame({nativeWorldBoundary:world});
   const encoder=f.client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[
    {view:f.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});
   pass.setPipeline(f.pipeline);pass.setBindGroup(0,f.group);pass.draw(3);pass.end();
   f.client.device.queue.submit([encoder.finish()]);
   await settle(f,f.client.endFrame({nativeWorldBoundary:world,clock:{...f.clock,elapsed:at,safeUntil:at,paused:true,segments:[]}}));
   assert.deepEqual(f.host.inspect().nativeRouteFrame.bindings,[]);
  }
  await observe(step(.05));await untilProduction(f,()=>!!held);
  const before=f.snapshot(),pending=held.resources.reference,animal=before.raid.animals[0];
  assert.equal(pending.kind,26);assert(!held.committed);assert.equal(animal.hitsRemaining,1);
  assert.deepEqual([pending.x,pending.z,pending.yaw,pending.phase],[animal.x,animal.z,animal.heading,animal.motionPhase]);
  const due=before.elapsed+before.spells[0].remaining,crossing=step(before.spells[0].remaining+.02);
  crossing.catch(()=>{});
  if(consumer==='receives a forged strike ticket'){
   await assert.rejects(settle(f,crossing),/Invalid retained Shield expiry after a crop strike/);
   assert(!readyRemoval);
   assert(!f.records.some(r=>r.resources.kind===4&&r.committed));
   assert.equal(routes.length,2);
   return;
  }
  await untilProduction(f,()=>!!releaseRemoval);
  const proof=readyRemoval.resources.nativeShieldCropExpiry;
  assert.deepEqual([proof.attackId,proof.strikeTicket,proof.requestSequence,proof.bodyId],
   [strikes[0].attackId,old.worldBoundary.ticket,pending.requestSequence,old.bodyId]);
  assert.equal(readyRemoval.committed,false);assert(held.signal.aborted);
  assert.equal(strikes.length,1);assert.equal(routes.length,2);
  releaseRemoval();state=await observe(crossing);
  await settle(f,readyRemoval.packet.presented);
  assert(Math.abs(state.elapsed-due-.02)<1e-8);
  assert.equal(state.spells.length,0);assert.equal(state.raid.animals[0].hitsRemaining,1);
  assert.deepEqual(state.ledger,before.ledger);
  assert.deepEqual(f.host.inspect().nativeRouteFrame.bindings,[]);
  await untilProduction(f,()=>routes.length===3);
  assert.equal(held.committed,false);assert.equal(facts.length,1);
  for(const key of ['actorId','bodyId','targetId','x','z','yaw','phase'])assert.equal(routes[2].reference[key],old[key],key);
  assert.notEqual(routes[2].reference.generation,pending.generation);
  releaseRoute();await f.present();assert.deepEqual(f.faults,[]);
  for(let i=0;i<500&&state.raid;i++){
   state=await observe(step(.05));
   if(state.elapsed>=routes[2].reference.endTime&&strikes.length===1)await untilProduction(f,()=>strikes.length===2);
  }
  assert.equal(state.raid,null);
  assert.deepEqual(facts.map(e=>e.type),['AnimalLogicalHit','CropHit','AnimalLogicalHit','RaidEnded']);
  assert.notEqual(strikes[1].attackId,strikes[0].attackId);
  assert.equal(strikes[1].reference.bodyId,old.bodyId);
  assert.equal(state.plants.find(p=>p.id==='plant-373').attackHits,1);
  assert.deepEqual(state.ledger,before.ledger);
  assert.deepEqual(f.faults,[]);
 }finally{releaseRoute?.();releaseRemoval?.();await f.close();stop?.abort();rig.close();}
});
