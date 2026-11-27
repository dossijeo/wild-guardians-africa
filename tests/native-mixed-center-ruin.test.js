import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFarmArrivalRouteFixture} from './helpers/native-farm-arrival-route.js';
import {recoverRouteAfterRuin} from './helpers/native-center-ruin-recovery.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {centerFootprint,centerServicePoint} from '../src/world/centers.js';
import {footprintsOverlap} from '../src/world/footprints.js';
import {readFileSync} from 'node:fs';
import {nativeFrameReadiness} from '../src/rendering/webgpu-frame-recovery.js';
import {sameNativeWorldBoundary,reconcileNativeWorldResources} from '../src/world/native-world-boundary.js';
import {sameNativeAnimalCropReference} from '../src/world/native-animal-crop-resource.js';
import {centerSource,verifiesCenter} from '../src/world/native-center-ruin-source.js';
import {nativeShieldWorldKind} from '../src/world/native-shield-world.js';
import {fixture,flush,pair} from './helpers/remote-webgpu-fixture.js';
import {floorFloat32} from '../src/rendering/float32-time.js';
import {nativeClockResourceEnd} from '../src/rendering/native-clock-resource-end.js';
import {copyNativeRecoveryGroup} from '../src/world/native-worker-route-recovery.js';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {prepareWorkerCheckpoint} from '../src/persistence/prepare-worker-checkpoint.js';
import {savedNativeAuthorityOptions} from '../src/simulation/native-authority-checkpoint.js';
import {tick} from '../src/simulation/game.js';
import {nativeCenterCollapseImpact,nativeCenterCollapseSite} from '../src/simulation/raids.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';
import {createEventDrivenTaskPlanner} from '../src/world/wild-engine/spatial-intent-bridge.js';

const gateId='structure-1000000';
const view={bounds:[-48,-48,48,48],eye:{x:-10,z:-24},target:{x:-10,z:0}};
const chunkKeys=Array.from({length:25},(_,i)=>`${i%5-2},${Math.floor(i/5)-2}`);

function mixedState(gated){
 const fixture=nativeFarmArrivalRouteFixture({peer:false});
 try{
  const state=structuredClone(fixture.state),[worker]=state.workers;
  const center=state.structures.find(row=>row.id===worker.centerId),village=state.villages.find(row=>row.id===worker.villageId);
  center.hp=200;
  if(gated){
   const service=centerServicePoint(center,state,.8),refuge={x:-14,z:11.799999999999999};
   Object.assign(worker,refuge);
   village.entry=refuge;
   center.x+=refuge.x-service.x;
   center.z+=3.2-service.z;
   state.structures.push({id:gateId,created:29207,kind:'wall',material:'zarzas',gate:true,x:-14,z:8.2,yaw:0,
    maxHp:60,hp:60,status:'intact',villageId:village.id,cost:10,collapseRemaining:0});
   state.nextId=1000001;
  }
  state.dayPlan={done:false,at:state.time+(gated?3.4:.8),group:['warthog']};
  return state;
 }finally{fixture.close();}
}

test('a center keeps the exact collapsing impact after the animal starts its next strike',{timeout:90000},async()=>{
 const input=mixedState(false);
 const [firstCenter]=input.structures;
 firstCenter.hp=firstCenter.maxHp;
 const doomedId='structure-'+input.nextId++;
 input.structures.push({...firstCenter,id:doomedId,x:-18,z:-12,hp:180});
 input.dayPlan.at=input.time+10;
 const positionCenter=(state,x,z)=>{
  const center=state.structures[0],worker=state.workers[0],village=state.villages.find(row=>row.id===worker.villageId);
  const dx=x-center.x,dz=z-center.z;
  Object.assign(center,{x,z});
  worker.x+=dx;worker.z+=dz;
  village.entry={x:village.entry.x+dx,z:village.entry.z+dz};
 };
 positionCenter(input,-12,-7);
 const binary=process.env.QA_BARRIER_WASM??new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url);
 const wasm=new WebAssembly.Module(readFileSync(binary));
 function run(state,until,limit){
  const loaded=new Map(),session=createSpatialGameSession(wasm,state,{loaded:()=>loaded});
  try{
   for(const key of chunkKeys){
    const [cx,cz]=key.split(',').map(Number);
    if(session.core.selectChunk(cx,cz)<0)assert(session.core.addChunk(cx,cz)>=0);
    loaded.set(key,session.core.chunkPayload());
   }
   const nav=createSpatialNavigationMovement(session,state);
   nav.setActiveBounds(view.bounds);nav.raidView=view;
   nav.intentTaskPlanner=createEventDrivenTaskPlanner(session);nav.intentTaskPlanner.resetFromState(state);
   for(let i=0;i<limit;i++){tick(state,.02,nav);if(until())return;}
   assert.fail('The ordinary raid did not reach its expected boundary');
  }finally{session.dispose();}
 }
 let approach;
 run(input,()=>{
  const actor=input.raid?.animals[0];
  if(!approach&&actor?.targetId===doomedId&&['entering','walking'].includes(actor.status))approach=deserialize(serialize(input));
  return actor?.status==='attacking'&&actor.targetId===doomedId&&actor.hitsRemaining===2&&
   input.structures.find(center=>center.id===doomedId).hp===140;
 },2600);
 const saved=deserialize(serialize(input)),oldAttack=input.raid.animals[0].attackId;
 positionCenter(saved,-24,-18);
 const doomed=saved.structures.find(center=>center.id===doomedId),other=saved.structures[0],actor=saved.raid.animals[0];
 assert(!footprintsOverlap(centerFootprint(doomed,saved).footprint,centerFootprint(other,saved).footprint));
 assert.equal(saved.raid.reservations[actor.reservation],actor.id);
 let impact=null;
 run(saved,()=>{
  if(!impact&&doomed.status==='collapsing'&&actor.status==='attacking'&&actor.targetId===other.id){
   assert.notEqual(actor.attackId,oldAttack);
   assert.equal(saved.raid.reservations[actor.reservation],actor.id);
   assert.equal(nativeCenterCollapseSite(saved,actor),null);
   impact=nativeCenterCollapseImpact(saved,actor,doomed);
   assert.equal(impact?.attackId,oldAttack);
   assert.equal(impact.targetId,doomedId);
   assert.equal(nativeCenterCollapseImpact(saved,actor,other),null);
   assert.equal(nativeCenterCollapseImpact(saved,{...actor,id:'animal-1'},doomed),null);
   const remaining=doomed.collapseRemaining;doomed.collapseRemaining+=.1;
   assert.equal(nativeCenterCollapseImpact(saved,actor,doomed),null);
   doomed.collapseRemaining=remaining;
   const events=saved.events;saved.events=events.filter(event=>event!==impact);
   assert.equal(nativeCenterCollapseImpact(saved,actor,doomed),null);
   saved.events=events;
  }
  return other.hp===580;
 },600);
 assert(impact);
 const ruin=saved.events.find(event=>event.type==='StructureRuined'&&event.targetId===doomedId);
 const final=saved.events.filter(event=>event.type==='AnimalLogicalHit'&&event.targetId===other.id);
 assert.equal(final.length,1);
 assert(impact.simulationTime<ruin.simulationTime&&ruin.simulationTime<final[0].simulationTime);

 // Start the native run at the ordinary selected approach, before any hit.
 // Isolate the two centers and one moving body from the surrounding fixture.
 assert(approach);
 approach.workers=[];
 approach.structures=approach.structures.filter(center=>center.kind==='center');
 Object.assign(approach.structures[0],{x:-24,z:-18});
 let release,ready,replacement,releaseStrike,strike,acquiredStrike,publication;
 const readyGate=new Promise(resolve=>{release=resolve;});
 const manifest={epoch:'center-ruin-active-strike',chunks:chunkKeys.map(key=>{
  const [cx,cz]=key.split(',').map(Number);return {cx,cz,revision:1};
 })};
 const world=await nativeProductionAuthority(approach,{chunkKeys,navigationView:view,qualifyAnimalCrop:true,
  getTerrainManifest:()=>manifest,onCommit(record,receipt){
   if(record===strike)acquiredStrike=receipt.nativeAnimalCropStrikeBinding;
  },onReady(record){
   if(record.kind==='center-ruin'){ready=record;return readyGate;}
   if(record.kind==='animal-crop-strike'&&record.resources.reference.targetId===Number(other.id.slice('structure-'.length))){
    strike=record;
    return new Promise(resolve=>{releaseStrike=resolve;});
   }
  }});
 try{
  await untilProduction(world,()=>world.records.some(row=>row.kind==='animal-crop-route'&&row.committed));
  const polygons=()=>world.command({kind:'snapshot',nativeAuthorityCheckpoint:true}).nativeAuthorityCheckpoint.spatialState.polygons;
  const intact=polygons(),events=[],pending=[];
  let state,proof;
  for(let i=0;i<1600&&state?.raid!==null;i++){
   const remaining=state?.structures.find(center=>center.id===doomedId)?.collapseRemaining;
   const command=pending.shift()??{kind:'advance',seconds:.05,steps:2,nightFastForward:false};
   if(remaining>0&&remaining<=.065&&releaseStrike){
    releaseStrike();releaseStrike=null;
    await untilProduction(world,()=>strike.committed);
   }else if(remaining>0&&remaining<.17&&!strike?.committed){
    command.seconds=.02;command.steps=1;
   }
   let reply=world.command(command);
   if(reply instanceof Promise){
    assert(!proof);
    let result,error;
    reply.then(value=>{result=value;},reason=>{error=reason;});
    for(let f=0;f<1000&&!ready?.packet&&!error&&!result;f++)await world.present();
    if(error)throw error;
    if(result?.centerStrikePublication){
     assert(!publication&&strike?.committed);
     publication=result.centerStrikePublication;
     const binding=acquiredStrike;
     assert.deepEqual(publication.worldBoundary,binding.reference.worldBoundary);
     assert.equal(publication.attackId,binding.attackId);
     const before=state.elapsed;
     state=JSON.parse(result.snapshot);
     const elapsed=state.elapsed-before,left=state.structures.find(center=>center.id===doomedId).collapseRemaining;
     assert(Math.abs(remaining-elapsed-left)<1e-9);
     assert(Math.abs(elapsed+publication.remainingSeconds-command.seconds*(result.stepsExecuted+1))<1e-9);
     assert(left>0&&state.raid.animals[0].attackId==='attack-'+binding.attackId);
     assert(!ready);
     pending.push({...command,steps:1,seconds:publication.remainingSeconds});
     const full=command.steps-result.stepsExecuted-1;
     if(full)pending.push({...command,steps:full});
     events.push(...result.events);
     continue;
    }
    const source=ready?.resources.nativeCenterRuin;
    assert(source?.strike);
    assert.equal(source.center,doomedId);
    assert.equal(state.raid.animals[0].attackId,'attack-'+source.strike.attackId);
    assert.equal(state.structures.find(center=>center.id===doomedId).status,'collapsing');
    assert.equal(source.strike.reference.targetId,Number(other.id.slice('structure-'.length)));
    for(let f=0;f<4;f++)await world.present();
    assert(!result&&!error&&!ready.committed);
    assert.throws(()=>centerSource({...source,center:other.id}),/Invalid center removal source/);
    release();
    for(let f=0;f<1000&&!result&&!error;f++)await world.present();
    if(error)throw error;
    assert(result);
    reply=result;
    await untilProduction(world,()=>ready.committed);
    proof=ready.commit.nativeCenterRuin;
    await world.present();
    assert.equal((await ready.packet.presented).sequence,ready.packet.sequence);
    const frame=world.host.inspect().nativeRouteFrame;
    assert.equal(frame.worldBoundary.ticket,proof.acquired.ticket);
    const row=frame.bindings.find(row=>sameNativeAnimalCropReference(row.nativeAnimalCrop,source.strike.preparedReference));
    assert(row&&row.executionEpoch===source.strike.reference.worldBoundary.effectiveTime&&row.relativeTime>0);
    assert.deepEqual(polygons(),intact.filter(row=>row.id!==proof.polygon));
    const cut=JSON.parse(reply.snapshot);
    assert.equal(cut.raid.animals[0].attackId,'attack-'+source.strike.attackId);
    replacement=await recoverRouteAfterRuin(world,proof,cut.elapsed,cut);
   }
   events.push(...reply.events);
   state=JSON.parse(reply.snapshot);
   for(const key of reply.residency.missing){
    const [cx,cz]=key.split(',').map(Number);world.command({kind:'addChunk',cx,cz});
   }
   await world.present();
   assert.deepEqual(world.faults,[]);
  }
  assert.equal(state.raid,null);
  assert(publication&&proof&&replacement);
  const hits=events.filter(event=>event.type==='AnimalLogicalHit'&&event.targetId===other.id);
  assert.deepEqual(hits.map(hit=>hit.attackId),['attack-'+proof.prepared.strike.attackId]);
  assert(hits[0].simulationTime>proof.acquired.effectiveTime);
  assert.equal(state.structures.find(center=>center.id===other.id).hp,580);
 }finally{
  releaseStrike?.();release();replacement?.client.dispose();await replacement?.host.dispose();await world.close();
 }
});

for(const retireFirst of [true,false])test('center ruin recovers the successor approach when it reaches its endpoint in the ruin substep (retire first: '+retireFirst+')',{timeout:90000},async()=>{
 const before=mixedState(false);
 before.workers=[];
 before.structures=before.structures.filter(center=>center.kind==='center');
 const [successor]=before.structures;
 Object.assign(successor,{x:-24,z:-18,hp:successor.maxHp});
 const doomed={...successor,id:'structure-'+before.nextId++,x:-18,z:-12,hp:180};
 before.structures.push(doomed);
 before.dayPlan={done:false,at:before.time+.10,group:['warthog'],actors:[{hits:4}]};
 const navigationView={...view,eye:{x:-16,z:-15},target:{x:-20,z:-10}};
 const ordinary=await nativeProductionAuthority(before,{chunkKeys,navigationView});
 let selected;
 try{
  for(let i=0;i<20&&!selected;i++){
   const row=ordinary.command({kind:'advance',seconds:.02,nightFastForward:false});
   const state=JSON.parse(row.snapshot);
   if(state.raid?.animals[0].targetId){
    assert.equal(state.raid.animals[0].targetId,doomed.id);
    selected=deserialize(row.snapshot);
   }
  }
  assert(selected,'Game did not select the first center');
 }finally{await ordinary.close();}
 const target=Number(successor.id.split('-')[1]);
 let releaseApproach,releaseStrike,approach,strike,retriedStrike,ruin,route,replacement;
 const approachReady=new Promise(resolve=>{releaseApproach=resolve;});
 const strikeReady=new Promise(resolve=>{releaseStrike=resolve;});
 const manifest={epoch:'center-ruin-arrived-approach',chunks:chunkKeys.map(key=>{
  const [cx,cz]=key.split(',').map(Number);return {cx,cz,revision:1};
 })};
 const world=await nativeProductionAuthority(selected,{chunkKeys,navigationView,qualifyAnimalCrop:true,
  getTerrainManifest:()=>manifest,
  onReady(record,{signal}={}){
   if(record.resources.reference?.targetId!==target)return;
   if(record.kind==='animal-crop-route'){approach=record;return approachReady;}
   if(record.kind==='animal-crop-strike'){
    if(strike){retriedStrike=record;return;}
    strike=record;
    return Promise.race([strikeReady,new Promise(resolve=>signal.addEventListener('abort',resolve,{once:true}))]);
   }
  },onCommit(record,data){
   if(record===approach)route=data.nativeAnimalCropRouteBinding;
   if(record.kind==='center-ruin')ruin=record;
  },
 });
 async function advance(seconds,steps=1){
  let result=world.command({kind:'advance',seconds,steps,nightFastForward:false});
  if(result instanceof Promise){
   let settled=false;
   void result.then(()=>{settled=true;},()=>{settled=true;});
   await untilProduction(world,()=>settled);
   result=await result;
  }
  assert(!result.centerStrikePublication);
  await world.present();
  assert.deepEqual(world.faults,[]);
  return JSON.parse(result.snapshot);
 }
 async function reach(state,at){
  for(let i=0;i<100&&at-state.elapsed>1e-9;i++)state=await advance(Math.min(.05,at-state.elapsed));
  assert(Math.abs(state.elapsed-at)<1e-9);
  return state;
 }
 try{
  let state=selected;
  for(let i=0;i<600&&!approach;i++)state=await advance(.05,2);
  assert(approach);
  const collapse=state.structures.find(center=>center.id===doomed.id);
  const deadline=state.elapsed+collapse.collapseRemaining,prepared=approach.resources.reference;
  assert.equal(collapse.status,'collapsing');
  const cut=deadline-.012,stepEnd=cut+.020;
  const departure=stepEnd-(prepared.endTime-prepared.worldBoundary.effectiveTime)-(retireFirst?.012:0);
  assert(departure>state.elapsed);
  state=await reach(state,departure);
  releaseApproach();
  await untilProduction(world,()=>!!route);
  state=await reach(state,cut);
  const {endTime,bodyId}=route.reference;
  assert(state.elapsed<endTime&&endTime<=state.elapsed+.020);
  const polygons=()=>world.command({kind:'snapshot',nativeAuthorityCheckpoint:true}).nativeAuthorityCheckpoint.spatialState.polygons;
  const intact=polygons();
  state=await advance(.020);
  assert(ruin?.committed);
  await ruin.packet.presented;
  const proof=ruin.commit.nativeCenterRuin,frame=world.host.inspect().nativeRouteFrame;
  assert.equal(frame.worldBoundary.ticket,proof.acquired.ticket);
  assert.equal(proof.prepared.approach.reference.bodyId,bodyId);
  assert.equal(proof.prepared.approach.reference.endTime,endTime);
  assert(proof.acquired.effectiveTime>=endTime);
  if(!retireFirst)assert.equal(proof.acquired.effectiveTime,endTime);
  const row=frame.bindings.find(row=>sameNativeAnimalCropReference(row.nativeAnimalCrop,route.preparedReference));
  const epoch=prepared.worldBoundary.effectiveTime;
  const sampledAge=Math.min(frame.clockElapsed-route.reference.worldBoundary.effectiveTime,
   nativeClockResourceEnd(epoch,prepared.endTime)-epoch);
  assert.equal(row?.relativeTime,floorFloat32(sampledAge));
  assert.deepEqual(polygons(),intact.filter(polygon=>polygon.id!==proof.polygon));
  assert.deepEqual(state.events.filter(event=>event.type==='StructureRuined').map(event=>[event.targetId,event.simulationTime]),
   [[doomed.id,proof.acquired.effectiveTime]]);
  assert.equal(state.raid.animals[0].status,'walking');
  assert.equal(state.raid.animals[0].targetId,successor.id);
  assert.equal(state.structures.find(center=>center.id===successor.id).hp,600);
  await untilProduction(world,()=>!!strike);
  assert.equal(strike.committed,false);
  replacement=await recoverRouteAfterRuin(world,proof,state.elapsed,state,{endpoint:true,retireFirst});
  await untilProduction(world,()=>retriedStrike?.committed);
  assert(strike.aborted&&!strike.committed);
  assert(retriedStrike.resources.worldBoundary.ticket>strike.resources.worldBoundary.ticket);
  assert.equal(retriedStrike.resources.reference.requestSequence,strike.resources.reference.requestSequence);
  for(let i=0;i<600&&state.raid;i++)state=await advance(.05,2);
  assert.equal(state.raid,null);
  const hits=state.events.filter(event=>event.type==='StructureHit');
  assert.deepEqual(hits.map(hit=>[hit.targetId,hit.structureHit.hp]),
   [[doomed.id,160],[doomed.id,140],[doomed.id,120],[successor.id,580]]);
  assert.equal(retriedStrike.resources.reference.bodyId,bodyId);
 }finally{releaseApproach();releaseStrike();replacement?.client.dispose();await replacement?.host.dispose();await world.close();}
});

for(const mode of ['crossing','opening motor','foreign motor ticket','refuge','strike after Home19','retreat after Home19'])test('mixed center loss recovers the acquired cut: '+mode,async()=>{
 const initial=mixedState(true),receipts=new Map(),[authorityPort,drawPort]=pair();
 const opening=mode==='opening motor';
 if(opening){
  initial.workers[0].z=6;
  initial.dayPlan.at=initial.time+.2;
 }
 initial.structures[0].hp=initial.structures[0].maxHp;
 const world=await nativeProductionAuthority(initial,{chunkKeys,qualifyFarmFlee:true,qualifyAnimalCrop:true,
  onCommit(record,receipt){receipts.set(record.kind,receipt);}});
 const strike=mode==='strike after Home19',retreat=mode==='retreat after Home19';
 const laterAnimalCut=strike||retreat,late=mode==='refuge'||laterAnimalCut,kind=strike?27:26;
 const purpose=retreat?'retreat':'center';
 const step=()=>world.command({kind:'advance',seconds:.05,nightFastForward:false,steps:1});
 let draw;
 try{
  world.command({kind:'setNavigationView',view});
  await untilProduction(world,()=>receipts.has('farm-arrival'));
  let state,frame,absence;
  for(let i=0;i<(laterAnimalCut?1100:300);i++){
   const next=step();state=JSON.parse(next.snapshot);
   for(const key of next.residency?.missing??[]){
    const [cx,cz]=key.split(',').map(Number);world.command({kind:'addChunk',cx,cz});
   }
   await world.present();
   frame=world.host.inspect().nativeRouteFrame;
   absence=receipts.get('home-arrival')?.nativeHomeArrivalBinding;
   const gateOpen=state.structures.find(row=>row.id===gateId).gateOpen;
   if((!opening||gateOpen>0&&gateOpen<1)&&frame?.bindings.some(row=>row.nativeAnimalCrop?.kind===kind&&row.nativeAnimalCrop.purpose===purpose&&row.relativeTime>0)&&
      (late?absence&&(laterAnimalCut||frame.worldBoundary.ticket===absence.reference.worldBoundary.ticket):
        receipts.has('home-route')&&state.workers[0].nativeRouteAdmission==='native-home'))break;
  }
  const animalBinding=strike?receipts.get('animal-crop-strike').nativeAnimalCropStrikeBinding:
   receipts.get('animal-crop-route').nativeAnimalCropRouteBinding;
  const home=receipts.get('home-route').nativeHomeRouteBinding;
  assert.equal(animalBinding.reference.purpose,purpose);
  assert.deepEqual(home.gateIds,[1000000]);
  assert.notEqual(home.reference.worldBoundary.ticket,animalBinding.reference.worldBoundary.ticket);
  assert.equal(state.workers[0].status,late?'home':'fleeing');
  if(laterAnimalCut){
   assert.equal(frame.worldBoundary.ticket,animalBinding.reference.worldBoundary.ticket);
   assert(absence.reference.worldBoundary.ticket<frame.worldBoundary.ticket);
   assert.equal(state.raid.animals[0].status,retreat?'retreating':'attacking');
   assert.equal(state.structures[0].hp,retreat?520:600);
  }
  const before=world.snapshot(),at=before.elapsed;
  const openingAtCut=before.structures.find(s=>s.id===gateId).gateOpen;
  if(opening){
   const farm=receipts.get('farm-arrival').nativeFarmArrivalBinding;
   assert(openingAtCut>0&&openingAtCut<1);
   assert.deepEqual(farm.gateIds,[]);
   assert.equal(home.reference.bodyId,farm.reference.bodyId);
  }else assert.equal(openingAtCut,1);
  world.gpu.device.destroy();world.retireResourceEndpoint();
  const hold=await world.authority.quiesceNativeIntentProduction();
  const retired=await world.authority.flushNativeResourcePreparation({allowRetired:true});
  assert(retired.terminal&&retired.callbacksSettled);
  const route=await world.authority.terminalWorkerRoute();
  const worker={kind:18,actorId:home.reference.actorId},animal={kind,actorId:animalBinding.reference.actorId};
  assert.deepEqual(route,late?{version:2,refuge:true,members:[animal]}:{version:2,members:[worker,animal]});
  draw=await fixture({capabilities:{nativeHomeRouteVersion:1,nativeAnimalCropVersion:1,nativeFarmArrivalVersion:1}},
    {intentControl:{port:drawPort,session:'production-control',recoveryHold:30},absoluteNow:()=>Number.MAX_SAFE_INTEGER});
  const {recoveredWorkerRoute:q}=await world.authority.attachHeldWorkerRoute(authorityPort,'production-control',30,hold,route);
  assert.deepEqual(q.worldBoundary,frame.worldBoundary);
  assert.deepEqual(q.refuge,late?absence:undefined);
  if(laterAnimalCut){
   const evidence={version:2,members:[{kind,proof:q.members[0].execution.binding}],refuge:q.refuge};
   assert.throws(()=>copyNativeRecoveryGroup(evidence,absence.reference.worldBoundary),/differs from the acquired refuge cut/);
   assert.throws(()=>copyNativeRecoveryGroup(evidence,{...q.worldBoundary,ticket:q.worldBoundary.ticket+1}),/differs from the acquired refuge cut/);
  }
  let byteOffset=0;
  const register=(binding,ref)=>{
   const epoch=ref.worldBoundary.effectiveTime;
   draw.client.registerClockBinding(draw.buffer,{byteOffset,epoch,semantic:'relative',
    resourceEnd:ref.kind===27?ref.endTime:nativeClockResourceEnd(epoch,ref.endTime),...binding});
   byteOffset+=4;
  };
  const ages=q.members.map(({resources,execution})=>{
   const ref=execution.binding.reference,isHome=resources.kind===18;
   assert.equal(execution.executedThrough,at);
   assert.deepEqual(ref,isHome?home.reference:animalBinding.reference);
   if(resources.kind===27){
    assert.equal(execution.binding.attackId,animalBinding.attackId);
    assert.deepEqual(resources.worldBoundary,q.worldBoundary);
   }else assert.deepEqual(resources.presentation.worldBoundary,q.worldBoundary);
   register(isHome?{nativeHome:ref}:{nativeAnimalCrop:ref},ref);
   if(isHome){
    const [gate]=resources.presentation.gates;
    assert.equal(gate.gateId,1000000);
    register({nativeGate:{gateId:gate.gateId,worldBoundary:mode==='foreign motor ticket'?animalBinding.reference.worldBoundary:ref.worldBoundary}},ref);
   }
   return floorFloat32(at-ref.worldBoundary.effectiveTime);
  });
  await assert.rejects(world.authority.checkHeldDraw(30,hold,route),/Missing submitted/);
  const submit=draw.frame(0,{nativeWorldBoundary:q.worldBoundary,
    clock:{version:1,epoch:0,elapsed:at,safeUntil:at,anchorAbsoluteMs:0,paused:true,segments:[]}}).catch(e=>e);
  await flush();await draw.host.idle();draw.host.present();
  const rendered=await submit;
  if(mode==='foreign motor ticket'){
   assert.match(rendered.message,/Replacement requires its bound worker clock/);
   assert.equal(draw.host.inspect().nativeRouteFrame,null);
   assert.equal(world.snapshot().elapsed,at);
   return;
  }
  assert(!(rendered instanceof Error),rendered.message);
  const witness=await world.authority.checkHeldDraw(30,hold,route);
  assert.deepEqual(witness.members.map(row=>row.relativeTime),ages);
  if(!late){
   const [workerClock]=witness.members;
   assert.equal(workerClock.nativeGate.gateId,1000000);
   assert.deepEqual(workerClock.nativeGate.worldBoundary,home.reference.worldBoundary);
   assert.equal(workerClock.gateElapsed,home.reference.worldBoundary.effectiveTime+workerClock.relativeTime);
  }
  let civilRequest;
  if(late){
   const receive=drawPort.onmessage;
   drawPort.onmessage=event=>{
    receive(event);
    if(event.data.farmArrivalRequest?.version===2)civilRequest=event.data.farmArrivalRequest;
   };
  }
  if(late)await world.attachRecoveredResources(draw);
  world.authority.resumeNativeIntentProduction(hold);
  const after=JSON.parse(step().snapshot);
  assert(Math.abs(after.elapsed-at-.05)<1e-12);
  assert.equal(after.workers[0].status,before.workers[0].status);
  if(retreat)assert.equal(after.raid.animals[0].status,'retreating');
  else assert.equal(after.raid.animals[0].targetId,'structure-2');
  const poses=next=>next.raid.animals.map(a=>[a.x,a.z]);
  if(strike)assert.deepEqual(poses(after),poses(before));
  else assert.notDeepEqual(poses(after),poses(before));
  assert.deepEqual(after.raid.reservations,before.raid.reservations);
  if(opening)assert(after.structures.find(s=>s.id===gateId).gateOpen>openingAtCut);
  if(late){
   let state=after;
   for(let i=0;i<1200&&!civilRequest;i++){
    const next=step();state=JSON.parse(next.snapshot);
    for(const key of next.residency?.missing??[]){
     const [cx,cz]=key.split(',').map(Number);world.command({kind:'addChunk',cx,cz});
    }
    await world.present();
    assert.deepEqual(world.faults,[],JSON.stringify({at:state.elapsed,last:world.records.at(-1)?.kind}));
   }
   assert.equal(civilRequest?.refugeSequence,absence.retiredSequence);
   assert.equal(civilRequest.actorId,home.reference.actorId);
   assert.notEqual(civilRequest.bodyId,home.reference.bodyId);
   const control=draw.host.inspect();
   assert.equal(control.failed,false,control.errors.join('\n'));
   assert(control.nativeCausalClock.intentSequence>=civilRequest.requestSequence);
   assert.equal(state.raid,null);
   assert.deepEqual(state.events.filter(e=>e.type==='StructureHit').map(e=>e.structureHit.hp),[580,560,540,520]);
   if(strike)assert.equal(state.events.filter(e=>e.type==='AnimalLogicalHit'&&e.attackId==='attack-'+animalBinding.attackId).length,1);
   if(retreat){
    const ends=state.events.filter(e=>e.type==='RaidEnded'&&e.simulationTime>=at);
    assert.equal(ends.length,1,JSON.stringify(ends));
   }
  }
  assert.deepEqual(world.faults,[]);
 }finally{
  draw?.client.dispose();await draw?.host.dispose();await world.close();
 }
});

function surfaceAfterRuin(publication,proof,structures){
 const code=readFileSync(new URL('../src/rendering/webgpu-world-surface.js',import.meta.url),'utf8');
 const start=code.indexOf('const nativeFrameState=');
 const hooks=code.slice(start,code.indexOf('if(state&&pipelineAdmission)',start));
 const adopt=code.slice(code.indexOf('function acquiredDirectWorldPublication('),code.indexOf('function prepareNativeGateResources('));
 const activate=new Function('state','publication','proof','nativeFrameReadiness','sameNativeWorldBoundary',
  'sameNativeAnimalCropReference','reconcileNativeWorldResources','verifiesCenter','nativeShieldWorldKind',`
   const remoteGpu={requiredNativeWorldBoundary:()=>proof.acquired},temporal=true,recoveringPublication=false;
   const terrain={status:()=>({}),admittedBoundary:sequence=>({version:1,sequence,epoch:'surface-control',canonicalPropsUnmasked:true,changes:[],empty:true})};
   let closed=false,preparedNativeWorldBoundary=proof.prepared.previous,retainedCenterRuin=null;
   let nativeResumeTarget=null,nativeRejectedFrame=null,nativeRouteRejected=false,nativeRoutePreparations=0,nativeRouteResourceRevision=1;
   let timelineRecovering=false,wakes=0;
   const onPresentationReady=()=>wakes++;
   let nativeGateProposal={descriptor:{phase:'adopting'},acquiredWorld:{kind:4,worldBoundary:proof.acquired,centerRuin:proof.prepared,proof}};
   ${hooks}
   ${adopt}
   acceptPreparedNativeTerrain(publication);
   nativeGateProposal=null;
   return {reject:retainRejectedNativeFrame,retire:onNativeCropStrikeRetired,readiness:nativeDrawReadiness,
    wakes:()=>wakes,revision:()=>nativeRouteResourceRevision};
  `);
 return activate({structures},publication,proof,nativeFrameReadiness,sameNativeWorldBoundary,
  sameNativeAnimalCropReference,reconcileNativeWorldResources,verifiesCenter,nativeShieldWorldKind);
}

function assertRetreatRetiresAfterRuin(publication,proof,structures){
 const reference=proof.prepared.retreat.reference;
 const obsolete={code:'remote-frame-native-route-obsolete',resourcePreparationsRetained:true};
 for(const rejectFirst of [true,false]){
  const surface=surfaceAfterRuin(publication,proof,structures),metadata={nativeRouteResourceRevision:surface.revision()};
  if(rejectFirst){assert(surface.reject(obsolete,metadata));assert.equal(surface.readiness(),'waiting');}
  surface.retire({...reference,generation:reference.generation+1});
  assert.equal(surface.wakes(),0);
  surface.retire(reference);
  if(!rejectFirst)assert(surface.reject(obsolete,metadata));
  assert.equal(surface.readiness(),'ready');
  assert.equal(surface.wakes(),1);
  surface.retire(reference);
  assert.equal(surface.wakes(),1);
 }
}

for(const scenario of [
 {gated:false,name:'without a gate'},
 {gated:true,name:'after crossing the gate'},
 {gated:true,pendingFarm:true,name:'when RaidSpawned cancels Farm before the gate'},
 {gated:true,recover:true,name:'through terminal Draw loss during Retreat'},
 {gated:false,secondCenter:true,name:'when the second center collapses on the final hit'},
 {gated:false,secondCenter:true,early:true,name:'during the approach to the successor center'},
 {gated:false,secondCenter:true,early:true,thirdCenter:true,name:'when Game picks a third center before the ruin'},
 {gated:true,secondCenter:true,early:true,name:'when the worker crosses the gate before the successor approach'},
 {gated:true,secondCenter:true,early:true,twoGates:true,name:'when the worker crosses both gates before the successor approach'},
])test('center ruin preserves the certified refuge '+scenario.name,{timeout:90000},async()=>{
 const {gated,pendingFarm,secondCenter,early,thirdCenter,twoGates}=scenario;
 const initial=mixedState(gated),workerId=initial.workers[0].id,civilCenter=initial.workers[0].centerId;
 if(twoGates){
  const original=initial.structures.find(row=>row.id===gateId);
  initial.structures.push({...original,id:`structure-${initial.nextId++}`,created:original.created+1,z:5.3});
  initial.dayPlan.at=initial.time+10;
 }
 const gates=state=>state.structures.filter(row=>row.gate);
 if(secondCenter){
  initial.structures.push({...initial.structures[0],id:`structure-${initial.nextId++}`,x:-18,z:-12,hp:early?180:200});
  initial.structures[0].hp=600;
 }
 const destroyedId=(secondCenter?initial.structures.at(-1):initial.structures[0]).id;
 const successorId=thirdCenter?`structure-${initial.nextId++}`:civilCenter;
 if(thirdCenter)initial.structures.push({...initial.structures[0],id:successorId,x:-5,z:-16});
 let releaseFarm,releaseRoute,farmReady=null,routeReady=null,flight=null;
 const farmGate=new Promise(resolve=>{releaseFarm=resolve;});
 const routeGate=new Promise(resolve=>{releaseRoute=resolve;});
 const world=await nativeProductionAuthority(initial,{chunkKeys,qualifyFarmFlee:true,qualifyAnimalCrop:true,
  onCommit(record,receipt){if(record.kind==='home-route')flight=receipt.nativeHomeRouteBinding;},
  onReady(record){
   if(pendingFarm&&record.kind==='farm-arrival'&&!farmReady){farmReady=record;return farmGate;}
   if(secondCenter&&!routeReady&&record.kind==='animal-crop-route'){
    const ref=record.resources.reference;
    if(early?'structure-'+ref.targetId===successorId:ref.purpose==='retreat'){routeReady=record;return routeGate;}
   }
  }});
 const advance=()=>world.command({kind:'advance',seconds:.05,nightFastForward:false,steps:2});
 const events=[];
 let confirmed=initial,ruin,workerAtCut,gatesAtCut,snap,ruinPublication,replacement;
 try{
  world.command({kind:'setNavigationView',view});
  await untilProduction(world,()=>pendingFarm?farmReady!==null:world.records.some(row=>row.kind==='farm-arrival'&&row.committed));
  const polygons=()=>world.command({kind:'snapshot',nativeAuthorityCheckpoint:true}).nativeAuthorityCheckpoint.spatialState.polygons;
  const beforePolygons=secondCenter?polygons():null;
  let spawn=null;
  for(let retry=0;retry<(early?760:540)&&!events.some(row=>row.type==='RaidEnded');retry++){
   let next=advance();
   if(next instanceof Promise){
    workerAtCut=confirmed.workers[0];
    gatesAtCut=gates(confirmed);
    let pending=null,error=null;
    void next.then(value=>{pending=value;},reason=>{error=reason;});
    if(secondCenter){
     await untilProduction(world,()=>routeReady?.packet);
     for(let f=0;f<4;f++)await world.present();
     assert(!pending&&!error&&!routeReady.committed);
     assert(!world.records.some(row=>row.kind==='center-ruin'));
     releaseRoute();
    }
    for(let f=0;f<1000&&!pending&&!error;f++)await world.present();
    if(error)throw error;
    assert(pending,'Expected the mixed cut to settle');
    next=ruinPublication=pending;
    ruin=world.records.findLast(row=>row.kind==='center-ruin');
    for(let f=0;f<8;f++)await world.present();
    assert(ruin?.committed);
    snap=await ruin.packet.presented;
    if(early){
     const source=ruin.resources.nativeCenterRuin,draw=world.host.inspect().nativeRouteFrame;
     assert.equal(draw.worldBoundary.ticket,ruin.commit.nativeCenterRuin.acquired.ticket);
     assert(draw.bindings.some(row=>sameNativeAnimalCropReference(row.nativeAnimalCrop,source.approach.preparedReference)));
    }
   }
   events.push(...next.events);
   confirmed=JSON.parse(next.snapshot);
   if(pendingFarm&&!spawn&&next.events.some(event=>event.type==='RaidSpawned')){
    spawn=confirmed.workers[0];
    assert.deepEqual([spawn.x,spawn.z],[initial.workers[0].x,initial.workers[0].z]);
    assert.equal(spawn.nativeRouteAdmission,'pending-raid-flight-resources');
    assert.equal(confirmed.structures.find(row=>row.id===gateId).gateOpen,0);
    releaseFarm();
   }
   for(const key of next.residency.missing){
    const [cx,cz]=key.split(',').map(Number);
    world.command({kind:'addChunk',cx,cz});
   }
   assert.deepEqual(world.faults,[]);
   await world.present();
   if(scenario.recover&&ruin&&!replacement){
    const proof=ruin.commit.nativeCenterRuin,old=world.host.inspect().nativeRouteFrame;
    assert.equal(old.worldBoundary.ticket,proof.acquired.ticket);
    assert(old.bindings.some(row=>row.nativeAnimalCrop?.purpose==='retreat'));
    replacement=await recoverRouteAfterRuin(world,proof,confirmed.elapsed);
   }
  }
  const absence=world.records.find(row=>row.kind==='home-arrival'&&row.committed);
  assert(absence,'The original Farm worker must complete Home19 first');
  assert.equal(workerAtCut.id,workerId);
  assert.equal(workerAtCut.status,'home');
  assert(!workerAtCut.nativeRouteAdmission);
  const end=confirmed.workers.find(row=>row.id===workerId);
  if(!secondCenter)assert.deepEqual([end.status,end.x,end.z],[workerAtCut.status,workerAtCut.x,workerAtCut.z]);
  const source=ruin.resources.nativeCenterRuin;
  const route=source.retreat??source.approach;
  assert.equal(route.reference.purpose,early?'center':'retreat');
  assert.equal(route.reference.bodyId,2);
  assert.equal(snap.sequence,ruin.packet.sequence);
  assert.deepEqual(events.filter(row=>row.type==='StructureHit').map(row=>[row.targetId,row.structureHit.hp]),
   early?[[destroyedId,160],[destroyedId,140],[destroyedId,120],[successorId,580]]:[180,160,140,120].map(hp=>[destroyedId,hp]));
  assert.equal(events.filter(row=>row.type==='WorkerHit').length,0);
  assert.deepEqual(events.filter(row=>row.type==='StructureRuined').map(row=>[row.targetId,row.simulationTime]),
   [[destroyedId,source.end]]);
  assert.equal(events.filter(row=>row.type==='RaidEnded').length,1);
  assert.equal(confirmed.structures.find(row=>row.id===destroyedId).status,'ruined');
  if(secondCenter){
   assert.equal(source.center,destroyedId);
   assert(beforePolygons.some(row=>row.id===source.polygon));
   assert.deepEqual(polygons(),beforePolygons.filter(row=>row.id!==source.polygon));
   assert.equal(confirmed.result,null);
   if(early){
    assert.equal('structure-'+source.approach.reference.targetId,successorId);
    assert.throws(()=>centerSource({...source,center:successorId}),/Invalid center removal source/);
    const hits=events.filter(row=>row.type==='AnimalLogicalHit');
    assert.equal(new Set(hits.map(row=>row.attackId)).size,4);
    assert(hits[2].simulationTime<route.reference.worldBoundary.effectiveTime&&
     route.reference.worldBoundary.effectiveTime<source.end&&source.end<hits[3].simulationTime);
   }else assertRetreatRetiresAfterRuin(ruinPublication,ruin.commit.nativeCenterRuin,confirmed.structures);
   for(let i=0;i<350&&confirmed.workers[0].nativeRouteAdmission!=='native-idle';i++){
    const next=await advance();
    confirmed=JSON.parse(next.snapshot);
    await world.present();
   }
   assert.equal(confirmed.workers[0].nativeRouteAdmission,'native-idle');
   assert.equal(confirmed.workers[0].centerId,civilCenter);
   assert.equal(confirmed.workers[0].personId,initial.workers[0].personId);
   assert.equal(confirmed.structures.find(row=>row.id===civilCenter).hp,early&&!thirdCenter?580:600);
   if(thirdCenter)assert.equal(confirmed.structures.find(row=>row.id===successorId).hp,580);
   assert.deepEqual(confirmed.ledger,initial.ledger);
   assert.deepEqual(world.faults,[]);
  }
  if(gated){
   assert.deepEqual(gatesAtCut.map(gate=>gate.gateOpen),twoGates?[1,1]:[pendingFarm?0:1]);
   if(pendingFarm){
    assert(spawn&&farmReady.aborted&&!farmReady.committed);
    assert(!world.records.some(row=>row.kind==='farm-arrival-stop'));
    const home=world.records.find(row=>row.kind==='home-route'&&row.committed);
    assert(home);
    assert.deepEqual(home.resources.origin,{x:spawn.x,z:spawn.z});
    const rounded=[Math.fround(spawn.x),Math.fround(spawn.z)];
    assert.deepEqual(Array.from(home.resources.points.slice(-2)),rounded);
    assert(home.resources.distance<=Math.hypot(rounded[0]-spawn.x,rounded[1]-spawn.z)+1e-9);
    assert.deepEqual(home.resources.gates,[]);
   }
   assert(gatesAtCut.every(gate=>gate.hp===60));
   const atRuin=JSON.parse(ruinPublication.snapshot);
   assert.deepEqual(gates(atRuin),gatesAtCut);
   if(secondCenter){
    assert.deepEqual(flight?.gateIds,twoGates?[1000001,1000000]:[1000000]);
    assert(flight.reference.worldBoundary.effectiveTime<source.end);
    if(twoGates){
     const idle=world.records.find(row=>row.kind==='idle-cycle'&&row.committed);
     assert(idle&&idle.resources.worldBoundary.effectiveTime<flight.reference.worldBoundary.effectiveTime);
     assert(!world.records.some(row=>row.kind==='farm-arrival-stop'));
    }else assert(world.records.some(row=>row.kind==='farm-arrival-stop'&&row.committed));
   }else{
    assert.deepEqual(gates(confirmed),gatesAtCut);
    assert.equal(confirmed.result,'defeat');
    assertRetreatRetiresAfterRuin(ruinPublication,ruin.commit.nativeCenterRuin,confirmed.structures);
   }
  }
 }finally{releaseFarm();releaseRoute();replacement?.client.dispose();await replacement?.host.dispose();await world.close();}
});

test('a cold successor approach keeps the original collapse substep and survives Draw loss', {timeout:90000},async()=>{
 const initial=mixedState(true),civil=initial.structures[0],original=initial.structures.find(row=>row.id===gateId);
 initial.structures.push({...original,id:`structure-${initial.nextId++}`,created:original.created+1,z:5.3});
 initial.dayPlan.at=initial.time+10;
 const doomed={...civil,id:`structure-${initial.nextId++}`,x:-18,z:-12,hp:180};
 initial.structures.push(doomed);
 civil.hp=600;
 const advance=world=>world.command({kind:'advance',seconds:.02,steps:2,nightFastForward:false});
 const observe=value=>{
  const pending={done:false};
  void Promise.resolve(value).then(reply=>{pending.reply=reply;pending.done=true;},error=>{pending.error=error;pending.done=true;});
  return pending;
 };
 async function finish(world,pending){
  for(let i=0;i<1000&&!pending.done;i++)await world.present();
  if(pending.error)throw pending.error;
  assert(pending.reply,'Expected the authority command to complete');
  for(const key of pending.reply.residency.missing){
   const [cx,cz]=key.split(',').map(Number);world.command({kind:'addChunk',cx,cz});
  }
  await world.present();
  assert.deepEqual(world.faults,[]);
  return JSON.parse(pending.reply.snapshot);
 }
 const live=await nativeProductionAuthority(initial,{chunkKeys,qualifyFarmFlee:true,qualifyAnimalCrop:true});
 let disk,expectedRuin;
 try{
  live.command({kind:'setNavigationView',view});
  await untilProduction(live,()=>live.records.some(row=>row.kind==='farm-arrival'&&row.committed));
  for(let i=0;i<1800&&!expectedRuin;i++){
   const state=await finish(live,observe(advance(live))),center=state.structures.find(row=>row.id===doomed.id);
   if(!disk&&center.status==='collapsing'&&center.collapseRemaining<.18&&state.raid?.animals[0].targetId===civil.id){
    const frame=live.host.inspect().nativeRouteFrame;
    assert(frame.bindings.some(row=>row.nativeAnimalCrop?.targetId===2&&row.relativeTime>0));
    const result=live.command({kind:'snapshot',nativeAuthorityCheckpoint:true,visualTerrain:true});
    const cut=prepareWorkerCheckpoint(result,{slotId:initial.slotId,policy:{nativeAuthority:true},savedAt:0});
    assert(cut.saved);
    disk=cut.state;
   }
   expectedRuin=state.events.find(event=>event.type==='StructureRuined'&&event.targetId===doomed.id);
  }
 }finally{await live.close();}
 assert(disk&&expectedRuin);
 assert.equal(disk.structures.find(row=>row.id===doomed.id).hp,120);
 assert.equal(disk.raid.animals[0].hitsRemaining,1);
 const before=disk.workerNativeAuthorityCheckpoint.spatialState.polygons;
 const options=savedNativeAuthorityOptions(serialize(disk));
 let release,ready,replacement;
 const held=new Promise(resolve=>{release=resolve;});
 const manifest={epoch:'deterministic-host-test',chunks:chunkKeys.map(key=>{
  const [cx,cz]=key.split(',').map(Number);
  return {cx,cz,revision:1};
 })};
 const cold=await nativeProductionAuthority(disk,{...options,chunkKeys,getTerrainManifest:()=>manifest,onReady(record){
  if(!ready&&record.kind==='animal-crop-route'){ready=record;return held;}
 }});
 try{
  assert(cold.authority.verifyNativeBootstrap(options.nativeBootstrap));
  await untilProduction(cold,()=>ready?.packet);
  const saved=cold.snapshot();
  assert.equal(saved.elapsed,disk.elapsed);
  assert.deepEqual(saved.structures,disk.structures);
  assert.deepEqual(saved.raid.animals[0],disk.raid.animals[0]);
  const first=observe(advance(cold));
  for(let i=0;i<6;i++)await cold.present();
  assert(!first.done,'The saved collapse advanced before the successor READY');
  assert(!ready.committed&&!cold.records.some(row=>row.kind==='center-ruin'));
  release();
  let state=await finish(cold,first),ruin;
  for(let i=0;i<1700;i++){
   if(!ruin){
    ruin=cold.records.find(row=>row.kind==='center-ruin'&&row.committed);
    if(ruin){
     const proof=ruin.commit.nativeCenterRuin;
     assert(before.some(row=>row.id===proof.polygon));
     assert.equal(proof.center,doomed.id);
     assert.equal(proof.acquired.effectiveTime,expectedRuin.simulationTime);
     assert(sameNativeAnimalCropReference(proof.prepared.approach.preparedReference,ready.resources.reference));
     assert.equal((await ruin.packet.presented).sequence,ruin.packet.sequence);
     assert.deepEqual(cold.command({kind:'snapshot',nativeAuthorityCheckpoint:true}).nativeAuthorityCheckpoint.spatialState.polygons,
      before.filter(row=>row.id!==proof.polygon));
     replacement=await recoverRouteAfterRuin(cold,proof,state.elapsed,state);
    }
   }
   if(!state.raid&&state.workers[0].nativeRouteAdmission==='native-idle')break;
   state=await finish(cold,observe(advance(cold)));
  }
  assert(ruin);
  assert.equal(state.raid,null);
  assert.equal(state.workers[0].nativeRouteAdmission,'native-idle');
  assert.equal(state.workers[0].personId,disk.workers[0].personId);
  assert.deepEqual(state.ledger,disk.ledger);
  assert.deepEqual(state.structures.filter(row=>row.gate),disk.structures.filter(row=>row.gate));
  const hits=state.events.filter(event=>event.type==='AnimalLogicalHit');
  assert.deepEqual(hits.slice(0,3),disk.events.filter(event=>event.type==='AnimalLogicalHit'));
  assert.deepEqual(hits.map(event=>event.targetId),[doomed.id,doomed.id,doomed.id,civil.id]);
  assert.equal(new Set(hits.map(event=>event.attackId)).size,4);
  assert.equal(state.structures.find(row=>row.id===civil.id).hp,580);
 }finally{release();replacement?.client.dispose();await replacement?.host.dispose();await cold.close();}
});
