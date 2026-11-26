import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFarmArrivalRouteFixture} from './helpers/native-farm-arrival-route.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {centerServicePoint} from '../src/world/centers.js';
import {readFileSync} from 'node:fs';
import {nativeFrameReadiness} from '../src/rendering/webgpu-frame-recovery.js';
import {sameNativeWorldBoundary,reconcileNativeWorldResources} from '../src/world/native-world-boundary.js';
import {sameNativeAnimalCropReference} from '../src/world/native-animal-crop-resource.js';
import {verifiesCenter} from '../src/world/native-center-ruin-source.js';
import {nativeShieldWorldKind} from '../src/world/native-shield-world.js';
import {fixture,flush,pair} from './helpers/remote-webgpu-fixture.js';
import {floorFloat32} from '../src/rendering/float32-time.js';
import {nativeClockResourceEnd} from '../src/rendering/native-clock-resource-end.js';
import {copyNativeRecoveryGroup} from '../src/world/native-worker-route-recovery.js';

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

for(const mode of ['crossing','foreign motor ticket','refuge','strike after Home19'])test('mixed center loss recovers the acquired cut: '+mode,async()=>{
 const initial=mixedState(true),receipts=new Map(),[authorityPort,drawPort]=pair();
 initial.structures[0].hp=initial.structures[0].maxHp;
 const world=await nativeProductionAuthority(initial,{chunkKeys,qualifyFarmFlee:true,qualifyAnimalCrop:true,
  onCommit(record,receipt){receipts.set(record.kind,receipt);}});
 const strike=mode==='strike after Home19',late=mode==='refuge'||strike,kind=strike?27:26;
 const step=()=>world.command({kind:'advance',seconds:.05,nightFastForward:false,steps:1});
 let draw;
 try{
  world.command({kind:'setNavigationView',view});
  await untilProduction(world,()=>receipts.has('farm-arrival'));
  let state,frame,absence;
  for(let i=0;i<(strike?1000:300);i++){
   const next=step();state=JSON.parse(next.snapshot);
   for(const key of next.residency?.missing??[]){
    const [cx,cz]=key.split(',').map(Number);world.command({kind:'addChunk',cx,cz});
   }
   await world.present();
   frame=world.host.inspect().nativeRouteFrame;
   absence=receipts.get('home-arrival')?.nativeHomeArrivalBinding;
   if(frame?.bindings.some(row=>row.nativeAnimalCrop?.kind===kind&&row.nativeAnimalCrop.purpose==='center'&&row.relativeTime>0)&&
      (late?absence&&(strike||frame.worldBoundary.ticket===absence.reference.worldBoundary.ticket):
        receipts.has('home-route')&&state.workers[0].nativeRouteAdmission==='native-home'))break;
  }
  const center=strike?receipts.get('animal-crop-strike').nativeAnimalCropStrikeBinding:
   receipts.get('animal-crop-route').nativeAnimalCropRouteBinding;
  const home=receipts.get('home-route').nativeHomeRouteBinding;
  assert.equal(center.reference.purpose,'center');
  assert.deepEqual(home.gateIds,[1000000]);
  assert.notEqual(home.reference.worldBoundary.ticket,center.reference.worldBoundary.ticket);
  assert.equal(state.workers[0].status,late?'home':'fleeing');
  if(strike){
   assert.equal(frame.worldBoundary.ticket,center.reference.worldBoundary.ticket);
   assert(absence.reference.worldBoundary.ticket<frame.worldBoundary.ticket);
   assert.equal(state.raid.animals[0].status,'attacking');
   assert.equal(state.structures[0].hp,600);
  }
  const before=world.snapshot(),at=before.elapsed;
  assert.equal(before.structures.find(s=>s.id===gateId).gateOpen,1);
  world.gpu.device.destroy();world.retireResourceEndpoint();
  const hold=await world.authority.quiesceNativeIntentProduction();
  const retired=await world.authority.flushNativeResourcePreparation({allowRetired:true});
  assert(retired.terminal&&retired.callbacksSettled);
  const route=await world.authority.terminalWorkerRoute();
  const worker={kind:18,actorId:home.reference.actorId},animal={kind,actorId:center.reference.actorId};
  assert.deepEqual(route,late?{version:2,refuge:true,members:[animal]}:{version:2,members:[worker,animal]});
  draw=await fixture({capabilities:{nativeHomeRouteVersion:1,nativeAnimalCropVersion:1,nativeFarmArrivalVersion:1}},
    {intentControl:{port:drawPort,session:'production-control',recoveryHold:30},absoluteNow:()=>Number.MAX_SAFE_INTEGER});
  const {recoveredWorkerRoute:q}=await world.authority.attachHeldWorkerRoute(authorityPort,'production-control',30,hold,route);
  assert.deepEqual(q.worldBoundary,frame.worldBoundary);
  assert.deepEqual(q.refuge,late?absence:undefined);
  if(strike){
   const evidence={version:2,members:[{kind:27,proof:q.members[0].execution.binding}],refuge:q.refuge};
   assert.throws(()=>copyNativeRecoveryGroup(evidence,absence.reference.worldBoundary),/differs from the acquired refuge cut/);
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
   assert.deepEqual(ref,isHome?home.reference:center.reference);
   if(resources.kind===27){
    assert.equal(execution.binding.attackId,center.attackId);
    assert.deepEqual(resources.worldBoundary,q.worldBoundary);
   }else assert.deepEqual(resources.presentation.worldBoundary,q.worldBoundary);
   register(isHome?{nativeHome:ref}:{nativeAnimalCrop:ref},ref);
   if(isHome){
    const [gate]=resources.presentation.gates;
    assert.equal(gate.gateId,1000000);
    register({nativeGate:{gateId:gate.gateId,worldBoundary:mode==='foreign motor ticket'?center.reference.worldBoundary:ref.worldBoundary}},ref);
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
   await world.attachRecoveredResources(draw);
  }
  world.authority.resumeNativeIntentProduction(hold);
  const after=JSON.parse(step().snapshot);
  assert(Math.abs(after.elapsed-at-.05)<1e-12);
  assert.equal(after.workers[0].status,before.workers[0].status);
  assert.equal(after.raid.animals[0].targetId,'structure-2');
  const poses=next=>next.raid.animals.map(a=>[a.x,a.z]);
  if(strike)assert.deepEqual(poses(after),poses(before));
  else assert.notDeepEqual(poses(after),poses(before));
  assert.deepEqual(after.raid.reservations,before.raid.reservations);
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
   if(strike)assert.equal(state.events.filter(e=>e.type==='AnimalLogicalHit'&&e.attackId==='attack-'+center.attackId).length,1);
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

async function recoverRetreatAfterRuin(world,proof,at){
 world.gpu.device.destroy();world.retireResourceEndpoint();
 const hold=await world.authority.quiesceNativeIntentProduction();
 const retired=await world.authority.flushNativeResourcePreparation({allowRetired:true});
 assert(retired.terminal&&retired.callbacksSettled);
 const route=await world.authority.terminalWorkerRoute(),ref=proof.prepared.retreat.reference;
 assert.deepEqual(route,{version:2,ruin:true,members:[{kind:26,actorId:ref.actorId}]});
 const [authorityPort,drawPort]=pair();
 const draw=await fixture({capabilities:{nativeAnimalCropVersion:1}},
  {intentControl:{port:drawPort,session:'production-control',recoveryHold:30},absoluteNow:()=>Number.MAX_SAFE_INTEGER});
 try{
  const {recoveredWorkerRoute:q}=await world.authority.attachHeldWorkerRoute(authorityPort,'production-control',30,hold,route);
  assert.deepEqual(q.ruin,proof);
  assert.deepEqual(q.worldBoundary,proof.acquired);
  const [{execution,resources}]=q.members;
  assert.equal(execution.executedThrough,at);
  assert.deepEqual(execution.binding.reference,ref);
  assert.deepEqual(resources.presentation.worldBoundary,q.worldBoundary);
  const evidence={version:2,members:[{kind:26,proof:execution.binding}],ruin:proof};
  assert.deepEqual(copyNativeRecoveryGroup(evidence,q.worldBoundary).ruin,proof);
  const foreign=structuredClone(evidence);
  foreign.ruin.revisions[1]++;
  assert.throws(()=>copyNativeRecoveryGroup(foreign,q.worldBoundary),/differs from the acquired center ruin/);
  assert.throws(()=>copyNativeRecoveryGroup(evidence,ref.worldBoundary),/differs from the acquired center ruin/);
  const epoch=ref.worldBoundary.effectiveTime;
  draw.client.registerClockBinding(draw.buffer,{byteOffset:0,epoch,semantic:'relative',nativeAnimalCrop:ref,
   resourceEnd:nativeClockResourceEnd(epoch,ref.endTime)});
  await assert.rejects(world.authority.checkHeldDraw(30,hold,route),/Missing submitted/);
  const submit=draw.frame(0,{nativeWorldBoundary:q.worldBoundary,
   clock:{version:1,epoch:0,elapsed:at,safeUntil:at,anchorAbsoluteMs:0,paused:true,segments:[]}}).catch(e=>e);
  await flush();await draw.host.idle();draw.host.present();
  const rendered=await submit;
  assert(!(rendered instanceof Error),rendered.message);
  const witness=await world.authority.checkHeldDraw(30,hold,route);
  assert.equal(witness.members[0].relativeTime,floorFloat32(at-epoch));
  await world.attachRecoveredResources(draw);
  world.authority.resumeNativeIntentProduction(hold);
  return draw;
 }catch(error){draw.client.dispose();await draw.host.dispose();throw error;}
}

for(const scenario of [
 {gated:false,name:'without a gate'},
 {gated:true,name:'after crossing the gate'},
 {gated:true,pendingFarm:true,name:'when RaidSpawned cancels Farm before the gate'},
 {gated:true,recover:true,name:'through terminal Draw loss during Retreat'},
])test('center ruin preserves the certified refuge '+scenario.name,{timeout:90000},async()=>{
 const {gated,pendingFarm}=scenario;
 const initial=mixedState(gated),workerId=initial.workers[0].id,destroyedId=initial.structures[0].id;
 let releaseFarm,farmReady=null;
 const farmGate=new Promise(resolve=>{releaseFarm=resolve;});
 const world=await nativeProductionAuthority(initial,{chunkKeys,qualifyFarmFlee:true,qualifyAnimalCrop:true,
  onReady(record){if(pendingFarm&&record.kind==='farm-arrival'&&!farmReady){farmReady=record;return farmGate;}}});
 const advance=()=>world.command({kind:'advance',seconds:.05,nightFastForward:false,steps:2});
 const events=[];
 let confirmed=initial,ruin,workerAtCut,gateAtCut,snap,ruinPublication,replacement;
 try{
  world.command({kind:'setNavigationView',view});
  await untilProduction(world,()=>pendingFarm?farmReady!==null:world.records.some(row=>row.kind==='farm-arrival'&&row.committed));
  let spawn=null;
  for(let retry=0;retry<540&&!events.some(row=>row.type==='RaidEnded');retry++){
   let next=advance();
   if(next instanceof Promise){
    workerAtCut=confirmed.workers[0];
    gateAtCut=confirmed.structures.find(row=>row.id===gateId);
    let pending=null,error=null;
    void next.then(value=>{pending=value;},reason=>{error=reason;});
    for(let f=0;f<1000&&!pending&&!error;f++)await world.present();
    if(error)throw error;
    assert(pending,'Expected the mixed cut to settle');
    next=ruinPublication=pending;
    ruin=world.records.findLast(row=>row.kind==='center-ruin');
    for(let f=0;f<8;f++)await world.present();
    assert(ruin?.committed);
    snap=await ruin.packet.presented;
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
    replacement=await recoverRetreatAfterRuin(world,proof,confirmed.elapsed);
   }
  }
  const absence=world.records.find(row=>row.kind==='home-arrival'&&row.committed);
  assert(absence,'The original Farm worker must complete Home19 first');
  assert.equal(workerAtCut.id,workerId);
  assert.equal(workerAtCut.status,'home');
  assert(!workerAtCut.nativeRouteAdmission);
  const end=confirmed.workers.find(row=>row.id===workerId);
  assert.deepEqual([end.status,end.x,end.z],[workerAtCut.status,workerAtCut.x,workerAtCut.z]);
  const source=ruin.resources.nativeCenterRuin;
  assert.equal(source.retreat.reference.purpose,'retreat');
  assert.equal(source.retreat.reference.bodyId,2);
  assert.equal(snap.sequence,ruin.packet.sequence);
  assert.deepEqual(events.filter(row=>row.type==='StructureHit').map(row=>row.structureHit.hp),[180,160,140,120]);
  assert.equal(events.filter(row=>row.type==='WorkerHit').length,0);
  assert.deepEqual(events.filter(row=>row.type==='StructureRuined').map(row=>[row.targetId,row.simulationTime]),
   [[destroyedId,source.end]]);
  assert.equal(events.filter(row=>row.type==='RaidEnded').length,1);
  assert.equal(confirmed.structures.find(row=>row.id===destroyedId).status,'ruined');
  if(gated){
   assert.equal(gateAtCut.gateOpen,pendingFarm?0:1);
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
   assert.equal(gateAtCut.hp,60);
   assert.deepEqual(confirmed.structures.find(row=>row.id===gateId),gateAtCut);
   assert.equal(confirmed.result,'defeat');
   assertRetreatRetiresAfterRuin(ruinPublication,ruin.commit.nativeCenterRuin,confirmed.structures);
  }
 }finally{releaseFarm();replacement?.client.dispose();await replacement?.host.dispose();await world.close();}
});
