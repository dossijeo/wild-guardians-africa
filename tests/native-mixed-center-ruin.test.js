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
])test('center ruin preserves the certified refuge '+scenario.name,{timeout:90000},async()=>{
 const {gated,pendingFarm}=scenario;
 const initial=mixedState(gated),workerId=initial.workers[0].id,destroyedId=initial.structures[0].id;
 let releaseFarm,farmReady=null;
 const farmGate=new Promise(resolve=>{releaseFarm=resolve;});
 const world=await nativeProductionAuthority(initial,{chunkKeys,qualifyFarmFlee:true,qualifyAnimalCrop:true,
  onReady(record){if(pendingFarm&&record.kind==='farm-arrival'&&!farmReady){farmReady=record;return farmGate;}}});
 const advance=()=>world.command({kind:'advance',seconds:.05,nightFastForward:false,steps:2});
 const events=[];
 let confirmed=initial,ruin,workerAtCut,gateAtCut,snap,ruinPublication;
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
 }finally{releaseFarm();await world.close();}
});
