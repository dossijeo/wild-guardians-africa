import assert from 'node:assert/strict';
import {register} from 'node:module';
import test from 'node:test';
import {floorFloat32} from '../src/rendering/float32-time.js';
import {serialize} from '../src/persistence/snapshots.js';
import {prepareWorkerCheckpoint} from '../src/persistence/prepare-worker-checkpoint.js';
import {savedNativeAuthorityOptions} from '../src/simulation/native-authority-checkpoint.js';
import {centerServicePoint} from '../src/world/centers.js';
import {captureSpatialPolygons} from '../src/world/wild-engine/spatial-state.js';
import {refugeWorkerPose} from '../src/world/native-refuge-return.js';
import {readClientAssignment,recoverRouteAfterRuin} from './helpers/native-center-ruin-recovery.js';
import {fixture,flush,pair} from './helpers/remote-webgpu-fixture.js';
import {nativeClockResourceEnd} from '../src/rendering/native-clock-resource-end.js';
import {originalRig} from './helpers/native-animal-crop-rig.js';
import {previewRaidStrike} from '../src/simulation/raids.js';

// Open the existing causal motor entry point at a controlled Game boundary.
// The production authority has no command for independently closing gates.
const ownerKey='native-center-ruin-moving-gate-test';
const owner=Symbol.for(ownerKey);
register('data:text/javascript,'+encodeURIComponent(`
 import assert from 'node:assert/strict';
 export async function load(url,context,next){
  const result=await next(url,context);
  if(!url.endsWith('/src/simulation/simulation-authority.js'))return result;
  const source=typeof result.source==='string'?result.source:Buffer.from(result.source).toString('utf8');
  const anchor='nav.intentTaskPlanner=planner;';
  assert.equal(source.split(anchor).length,2);
  return {...result,source:source.replace(anchor,anchor+'globalThis[Symbol.for(${JSON.stringify(ownerKey)})]?.({planner,session,nativeIntentControl});')};
 }
`));
const {nativeProductionAuthority,untilProduction}=await import('./helpers/native-production-authority.js');
const {nativeFarmArrivalRouteFixture}=await import('./helpers/native-farm-arrival-route.js');

const gateIds=[1000000,1000001],doomed='structure-1000002';
const view={bounds:[-48,-48,48,48],eye:{x:-10,z:-24},target:{x:-10,z:0}};
const chunkKeys=Array.from({length:25},(_,i)=>`${i%5-2},${Math.floor(i/5)-2}`);
const terrainManifest={epoch:'closing-gates-recovery',chunks:chunkKeys.map(key=>{
 const [cx,cz]=key.split(',').map(Number);return {cx,cz,revision:1};
})};

function initialState(){
 const farm=nativeFarmArrivalRouteFixture({peer:false});
 try{
  const state=structuredClone(farm.state),[worker]=state.workers;
  const center=state.structures.find(row=>row.id===worker.centerId),village=state.villages.find(row=>row.id===worker.villageId);
  const service=centerServicePoint(center,state,.8),refuge={x:-14,z:11.799999999999999};
  Object.assign(worker,refuge);village.entry=refuge;
  center.x+=refuge.x-service.x;center.z+=3.2-service.z;
  for(const [i,z] of [8.2,5.3].entries())state.structures.push({id:'structure-'+gateIds[i],created:29207+i,
   kind:'wall',material:'zarzas',gate:true,x:-14,z,yaw:0,maxHp:60,hp:60,status:'intact',villageId:village.id,cost:10,collapseRemaining:0});
  state.structures.push({...center,id:doomed,x:-18,z:-12,hp:180});
  state.dayPlan={done:false,at:state.time+10,group:['warthog']};state.nextId=1000003;
  return state;
 }finally{farm.close();}
}

for(const mode of ['with all clocks','without Home clock','without animal clock','with a changed Home phase','recover after GO','recover before GO',
 'disk before ruin','disk after ruin','disk loss before ruin','disk loss after ruin',
 'disk Home18 loss before ruin','disk Home18 loss after ruin'])test(`the finished center strike admits a new corridor and reaches the occupied gate ruin (${mode})`,{timeout:60000},async t=>{
 const omitClock=mode==='without Home clock'?'Home':mode==='without animal clock'?'animal':null;
 const changePhase=mode==='with a changed Home phase';
 const recoverBefore=mode==='recover before GO';
 const initial=initialState(),gateId=gateIds[0],entityId='structure-'+gateId;
 initial.structures=initial.structures.filter(row=>row.id!=='structure-'+gateIds[1]);
 const civil=initial.structures[0],firstCenter=initial.structures.find(row=>row.id===doomed);
 civil.z+=-5-centerServicePoint(civil,initial,.8).z;
 initial.workers[0].z=-5;
 initial.dayPlan.at=initial.time+.8;
 firstCenter.hp=140;
 const raidView={...view,eye:{x:-18,z:-13.7},target:{x:-18,z:0}};
 let access,world,home,homeArrival,strike,successor,held,releaseReady,sourceAt,ruin,releaseRuin;
 const heldReady=new Promise(resolve=>{releaseReady=resolve;});
 const heldRuin=new Promise(resolve=>{releaseRuin=resolve;});
 const hits=[];
 globalThis[owner]=entry=>{access=entry;};
 try{
  world=await nativeProductionAuthority(initial,{chunkKeys,qualifyFarmFlee:true,qualifyAnimalCrop:true,getTerrainManifest:()=>terrainManifest,
   onPrepare(record){
    if(record.kind==='home-route')record.homeOriginPhase=true;
    if(record.kind==='center-ruin'){
     ruin=record;record.omitClock=omitClock;
     if(changePhase)record.beforeDraw=()=>{
      const owning=world.records.find(row=>row.kind==='home-route'&&row.committed);
      world.client.registerClockBinding(owning.homePhaseBuffer,{byteOffset:4,semantic:'origin-modulo',
       epoch:home.preparedReference.worldBoundary.effectiveTime,period:1.5,nativeHome:home.preparedReference});
     };
    }
   },
   onReady(record,{signal}={}){
    if(record.kind==='center-ruin'){
     if(recoverBefore)signal.addEventListener('abort',releaseRuin,{once:true});
     return heldRuin;
    }
    if(!held&&record.kind==='animal-crop-route'&&'structure-'+record.resources.reference.targetId===civil.id){held=record;return heldReady;}
   },
   onCommit(record,receipt){
    if(record.kind==='home-route')home=receipt.nativeHomeRouteBinding;
    if(record.kind==='home-arrival')homeArrival=receipt.nativeHomeArrivalBinding;
    if(record.kind==='animal-crop-strike')strike=receipt.nativeAnimalCropStrikeBinding;
    if(record===held)successor=receipt.nativeAnimalCropRouteBinding;
   }});
  world.command({kind:'setNavigationView',view:raidView});
  await untilProduction(world,()=>world.records.some(row=>row.kind==='farm-arrival'&&row.committed));
  const command={kind:'advance',seconds:.05,steps:2,nightFastForward:false};
  const {planner,session}=access;
  const wasm=session.core.wasm;
  let state,lease;
  for(let i=0;i<54&&!successor;i++){
   const result=world.command(command);
   assert(!(result instanceof Promise),'unexpected ruin before the new route');
   state=JSON.parse(result.snapshot);
   hits.push(...result.events.filter(row=>row.type==='StructureHit'||row.type==='AnimalLogicalHit'));
   await world.present();
   if(held){
    sourceAt??=held.resources.worldBoundary.effectiveTime;
    const ref=held.resources.reference,h=home.reference,event=h.sourceRequest.raidSpawnSequence;
    lease??=planner.nativeGateCrossings(entityId).find(row=>row.bodyId===h.bodyId);
    const ready=(actor,request,spawn)=>wasm.nav_center_flight_animal_ready(actor,ref.actorId,request,spawn);
    assert.equal(ready(h.actorId,ref.requestSequence,event+1),-1);
    assert.equal(ready(h.actorId+1,ref.requestSequence,event),-1);
    assert.equal(ready(h.actorId,ref.requestSequence+1,event),-1);
    if(state.elapsed>sourceAt+.09)releaseReady();
   }
  }
  assert(held?.committed&&successor,'missing new Route26 while Home18 owns the gate');
  await held.packet.presented;
  const h=home.reference,r=successor.reference,old=strike.reference;
  assert.equal(state.workers[0].nativeRouteAdmission,'native-home');
  assert.notEqual(old.targetId,r.targetId);
  assert.equal(r.bodyId,old.bodyId);
  assert.deepEqual([r.x,r.z,r.phase,r.yaw],[old.x,old.z,old.phase,old.yaw]);
  assert.equal(successor.preparedReference.worldBoundary.effectiveTime,sourceAt);
  assert(r.worldBoundary.effectiveTime>sourceAt);
  assert.deepEqual(hits.map(row=>[row.type,row.targetId]),[['StructureHit',doomed],['AnimalLogicalHit',doomed]]);
  assert.equal(hits[0].structureHit.hp,120);
  assert.equal(hits[1].attackId,'attack-'+strike.attackId);
  assert.deepEqual(lease.routeHandle,h.expectedRouteHandle);
  assert.deepEqual(planner.nativeGateCrossings(entityId).find(row=>row.bodyId===h.bodyId),lease);
  const frame=world.host.inspect().nativeRouteFrame;
  assert.equal(frame.worldBoundary.ticket,r.worldBoundary.ticket);
  assert.equal(frame.bindings.find(row=>row.nativeHome).nativeHome.bodyId,h.bodyId);
  assert.equal(frame.bindings.find(row=>row.nativeGate).nativeGate.gateId,gateId);
  assert.equal(frame.bindings.find(row=>row.nativeAnimalCrop).nativeAnimalCrop.bodyId,r.bodyId);
  assert(!world.records.some(row=>row.kind==='home-arrival'&&row.committed));
  assert.deepEqual(world.faults,[]);
  assert.deepEqual(world.errors,[]);
  const collapseAt=hits[0].simulationTime+3.2;
  while(state.elapsed+.02<collapseAt-1e-7){
   const result=world.command({...command,seconds:.02,steps:1});
   assert(!(result instanceof Promise),'ruin opened before the cut');
   state=JSON.parse(result.snapshot);
   await world.present();
  }
  const approaching=planner.nativeAnimalCropState(state.raid.animals[0].id);
  assert.equal(approaching.mode,2);
  assert.equal(approaching.arrived,false);
  assert.equal(approaching.body,r.bodyId);
  assert(state.elapsed>lease.from&&collapseAt<lease.until);
  assert.equal(state.workers[0].nativeRouteAdmission,'native-home');
  assert(Math.abs(state.workers[0].z-state.structures.find(row=>row.id===entityId).z)<.5);
  assert.equal(state.structures.find(row=>row.id===doomed).status,'collapsing');
  const beforeRuin=state.elapsed,x=state.workers[0].x,z=state.workers[0].z;
  const polygon=session.centerPolygonId(doomed),beforeGate=state.structures.find(row=>row.id===entityId).gateOpen;
  assert(polygon>0);
  const save=()=>{
   const snapshot=world.command({kind:'snapshot',nativeAuthorityCheckpoint:true,visualTerrain:true});
   const saved=prepareWorkerCheckpoint(snapshot,{slotId:initial.slotId,policy:{nativeAuthority:true},savedAt:0});
   assert(saved.saved,'Expected the public checkpoint for the occupied crossing');
   return saved.state;
  };
  const diskMode=mode.startsWith('disk');
  let disk=diskMode&&mode.endsWith('before ruin')?save():null;
  let advancing=world.command({...command,seconds:.02,steps:1});
  assert(advancing instanceof Promise);
  let result,failure;
  const watch=()=>advancing.then(value=>{result=value;},reason=>{failure=reason;});
  watch();
  for(let i=0;i<300&&!ruin?.packet&&!failure;i++)await world.present();
  if(omitClock||changePhase){
   await assert.rejects(advancing,/Center ruin lacks its acquired animal, Home or crossing clocks/);
   assert.equal(session.centerPolygonId(doomed),polygon);
   assert.equal(planner.nativeCausalClock().committedThrough,beforeRuin);
   assert.deepEqual(planner.nativeGateCrossings(entityId).find(row=>row.bodyId===h.bodyId),lease);
   return;
  }
  if(failure)throw failure;
  assert(ruin?.packet&&!ruin.committed&&!result);
  const source=ruin.resources.nativeCenterRuin;
  assert.deepEqual(source.home,home);
  assert.equal(source.approach.assignmentSequence,successor.assignmentSequence);
  assert.equal(source.polygon,polygon);
  assert.equal(session.centerPolygonId(doomed),polygon);
  assert.equal(planner.nativeCausalClock().committedThrough,beforeRuin);
  let replacement;
  if(recoverBefore){
   const abandoned=ruin;
   replacement=await recoverRouteAfterRuin(world,source,beforeRuin,null,{beforeRuin:true,interrupted:advancing});
   const prefix=await advancing,remainder=prefix.pendingRuinRecoveryCut.remainingSeconds;
   assert.equal(remainder,.02);
   assert(!prefix.events.some(row=>row.type==='StructureRuined'));
   assert.equal(session.centerPolygonId(doomed),polygon);
   assert(!abandoned.committed);
   await assert.rejects(abandoned.packet.presented);
   result=null;
   advancing=world.command({...command,seconds:remainder,steps:1});
   watch();
   for(let i=0;i<300&&ruin===abandoned&&!failure;i++)await world.present();
   assert(ruin!==abandoned,'No replacement ruin was prepared');
   assert(ruin.resources.worldBoundary.ticket>source.boundary.ticket);
  }
  releaseRuin();
  for(let i=0;i<300&&!(result&&ruin.committed)&&!failure;i++)await world.present();
  if(failure)throw failure;
  assert(result&&ruin.committed,JSON.stringify({result:!!result,committed:ruin.committed,faults:world.faults,errors:replacement?.errors??world.errors}));
  await world.present();await ruin.packet.presented;
  const [event]=result.events.filter(row=>row.type==='StructureRuined');
  assert.equal(result.events.filter(row=>row.type==='StructureRuined').length,1);
  assert.equal(event.targetId,doomed);
  assert.equal(event.simulationTime,source.end);
  assert(source.end>=collapseAt-1e-9&&source.end<=beforeRuin+.020000001);
  const cut=JSON.parse(result.snapshot),drawn=(replacement??world).host.inspect().nativeRouteFrame;
  assert.equal(cut.structures.find(row=>row.id===doomed).status,'ruined');
  assert.equal(cut.structures.find(row=>row.id===entityId).gateOpen,beforeGate);
  assert.equal(session.centerPolygonId(doomed),null);
  assert.equal(cut.workers[0].nativeRouteAdmission,'native-home');
  assert(Math.hypot(cut.workers[0].x-x,cut.workers[0].z-z)>0);
  assert.deepEqual(planner.nativeGateCrossings(entityId).find(row=>row.bodyId===h.bodyId),lease);
  assert.equal(drawn.worldBoundary.ticket,ruin.commit.worldBoundary.ticket);
  assert.equal(drawn.clockElapsed,source.end);
  assert.equal(drawn.bindings.find(row=>row.nativeHome).nativeHome.bodyId,h.bodyId);
  assert.equal(drawn.bindings.find(row=>row.nativeGate).nativeGate.gateId,gateId);
  assert.equal(drawn.bindings.find(row=>row.nativeAnimalCrop).nativeAnimalCrop.bodyId,r.bodyId);
  assert.deepEqual(world.faults,[]);assert.deepEqual(world.errors,[]);
  if(diskMode&&mode.endsWith('after ruin'))disk=save();
  if(disk)await reloadOccupiedCrossing(t,disk,{polygon,event,previous:drawn.worldBoundary,gateId,until:lease.until,access:()=>access,
   recover:mode.startsWith('disk Home18 loss')?'home':mode.startsWith('disk loss')?'approach':null});
  if(mode==='recover after GO'){
   const draw=await recoverRouteAfterRuin(world,ruin.commit.nativeCenterRuin,cut.elapsed,cut);
   const recovered=draw.host.inspect().nativeRouteFrame;
   assert.equal(recovered.clockElapsed,cut.elapsed);
   assert.deepEqual(recovered.worldBoundary,drawn.worldBoundary);
   assert.deepEqual(planner.nativeGateCrossings(entityId).find(row=>row.bodyId===h.bodyId),lease);
   const next=await world.command({...command,seconds:.02,steps:1});
   assert.equal(next.elapsed,cut.elapsed+.02);
   assert(!next.events.some(row=>row.type==='StructureRuined'));
   assert.equal(JSON.parse(next.snapshot).workers[0].nativeRouteAdmission,'native-home');
   for(let i=0;i<90&&!homeArrival;i++){
    const advancing=await world.command({...command,steps:1});
    assert(!advancing.events.some(row=>row.type==='StructureRuined'));
    await world.present();
    assert.deepEqual(world.faults,[]);
    assert.deepEqual(draw.errors,[]);
   }
   const absence=world.records.find(row=>row.kind==='home-arrival'&&row.committed);
   assert(absence&&homeArrival,'The recovered Home18 must reach Home19');
   assert.deepEqual(homeArrival.reference.sourceHome,home);
   await world.present();await absence.packet.presented;
   const settled=world.snapshot(),homeDraw=draw.host.inspect().nativeRouteFrame;
   assert.equal(settled.workers[0].status,'home');
   assert.equal(homeDraw.worldBoundary.ticket,homeArrival.reference.worldBoundary.ticket);
   assert(!homeDraw.bindings.some(row=>row.nativeHome));
   assert.equal(homeDraw.bindings.find(row=>row.nativeAnimalCrop).nativeAnimalCrop.bodyId,r.bodyId);
   t.diagnostic(JSON.stringify({refugeAt:settled.elapsed,homeTicket:homeDraw.worldBoundary.ticket,
    worker:settled.workers[0].id,animalBody:r.bodyId}));
  }
  t.diagnostic(JSON.stringify({impact:hits[0].simulationTime,ready:sourceAt,go:r.worldBoundary.effectiveTime,
   gate:lease,beforeCollapse:state.elapsed,collapseDue:collapseAt,ruinAt:event.simulationTime,
   workerZ:state.workers[0].z,ruinTicket:drawn.worldBoundary.ticket}));
 }finally{
  releaseReady();releaseRuin();delete globalThis[owner];await world?.close();
 }
});

async function reloadOccupiedCrossing(t,disk,{polygon,event,previous,gateId,until,access,recover}){
 const checkpoint=disk.workerNativeAuthorityCheckpoint,marker=checkpoint.raidFlight;
 const before=disk.structures.find(row=>row.id===doomed).status==='collapsing';
 assert.equal(marker.gate.id,'structure-'+gateId);
 assert.equal(marker.gate.opening,1);
 assert.notEqual(marker.gate.reservedByHome,false);
 assert.equal(checkpoint.spatialState.polygons.some(row=>row.id===polygon),before);
 const forged=structuredClone(disk);
 forged.workerNativeAuthorityCheckpoint.raidFlight.gate.id='structure-1000001';
 assert.throws(()=>savedNativeAuthorityOptions(serialize(forged)),/saved cohort or destination/);
 const points=state=>{
  const [animal]=state.raid.animals;
  return {worker:refugeWorkerPose(state.workers[0]),animal:{x:animal.x,z:animal.z,yaw:animal.heading,phase:animal.motionPhase,
   targetId:animal.targetId,reservation:animal.reservation}};
 };
 const savedPose=points(disk);
 let homeReady,animalReady,releaseHome,releaseAnimal;
 const heldHome=new Promise(resolve=>{releaseHome=resolve;});
 const heldAnimal=new Promise(resolve=>{releaseAnimal=resolve;});
 const holdUnlessCancelled=(held,signal)=>new Promise((resolve,reject)=>{
  const abort=()=>reject(new DOMException('Preparation cancelled','AbortError'));
  signal.addEventListener('abort',abort,{once:true});
  held.then(()=>{signal.removeEventListener('abort',abort);resolve();});
 });
 const options=savedNativeAuthorityOptions(serialize(disk));
 const cold=await nativeProductionAuthority(disk,{...options,getTerrainManifest:()=>terrainManifest,
  onPrepare(record){if(record.kind==='home-route')record.homeOriginPhase=true;},
  onReady(record,{signal}){
   if(record.kind==='home-route'&&!homeReady){homeReady=record;return recover==='home'?holdUnlessCancelled(heldHome,signal):heldHome;}
   if(record.kind==='animal-crop-route'&&!animalReady){
    animalReady=record;
    return recover==='approach'?holdUnlessCancelled(heldAnimal,signal):heldAnimal;
   }
  }});
 const {session,planner}=access();
 let draw=cold;
 const frozenClock={version:1,epoch:0,elapsed:disk.elapsed,safeUntil:disk.elapsed,anchorAbsoluteMs:0,paused:true,segments:[]};
 async function replaceDraw(held,expectedRoute){
  cold.gpu.device.destroy();cold.retireResourceEndpoint();
  const hold=await cold.authority.quiesceNativeIntentProduction({forLostDraw:true});
  assert((await cold.authority.flushNativeResourcePreparation({allowRetired:true,forLostDraw:true})).terminal);
  await assert.rejects(held.packet.presented);
  assert(!held.committed);
  const route=await cold.authority.terminalWorkerRoute();
  assert.deepEqual(route,expectedRoute);
  const [authorityPort,drawPort]=pair();
  draw=await fixture({capabilities:{nativeHomeRouteVersion:1,nativeHomeArrivalVersion:1,nativeAnimalCropVersion:1,
   nativeFarmArrivalVersion:1,nativeIdleCycleVersion:1}},
   {intentControl:{port:drawPort,session:'production-control',recoveryHold:30},absoluteNow:()=>Number.MAX_SAFE_INTEGER});
  const {recoveredWorkerRoute:q}=await cold.authority.attachHeldWorkerRoute(authorityPort,'production-control',30,hold,route);
  await assert.rejects(cold.authority.checkHeldDraw(30,hold,route),/Missing submitted/);
  return {hold,route,q};
 }
 async function step(seconds=.02){
  let result,error;
  Promise.resolve(cold.command({kind:'advance',seconds,steps:1,nightFastForward:false})).then(row=>{result=row;},reason=>{error=reason;});
  for(let i=0;i<600&&!result&&!error;i++)await cold.present();
  if(error)throw error;
  assert(result,'The restored advance did not settle');
  await cold.present();return result;
 }
 try{
  assert(cold.authority.verifyNativeBootstrap(options.nativeBootstrap));
  assert.equal(session.centerPolygonId(doomed),before?polygon:null);
  await untilProduction(cold,()=>!!homeReady?.packet);
  const asleep=cold.snapshot();
  assert.equal(asleep.elapsed,disk.elapsed);
  assert.deepEqual(asleep.structures,disk.structures);
  assert.deepEqual(points(asleep),savedPose);
  assert(!homeReady.committed);
  if(recover==='home'){
   const held=homeReady,source=planner.nativeRestoredPendingFlight();
   const {hold,route,q}=await replaceDraw(held,{version:2,pendingFlight:true,members:[]});
   assert.equal(q.worldBoundary,null);
   assert.deepEqual(q.members,[]);
   assert.deepEqual(q.pendingFlight,source);
   assert.deepEqual((await readClientAssignment(q)).pendingFlight,source);
   await assert.rejects(readClientAssignment({...q,worldBoundary:held.resources.worldBoundary}),/requires an unacquired world/);
   const metadata={nativeWorldBoundary:null,clock:frozenClock};
   await assert.rejects(draw.frame(0,metadata),/Replacement requires its bound worker clock/);
   const foreign={...source,animal:{...source.animal,requestSequence:source.animal.requestSequence+1}};
   await assert.rejects(draw.frame(0,{...metadata,recoveredPendingFlight:foreign}),/Replacement requires its bound worker clock/);
   const submitted=draw.frame(0,{...metadata,recoveredPendingFlight:source});
   await flush();await draw.host.idle();draw.host.present();await submitted;
   const witness=await cold.authority.checkHeldDraw(30,hold,route);
   assert.deepEqual(witness.pendingFlight,source);
   assert.deepEqual(draw.host.inspect().nativeRouteFrame.bindings,[]);
   assert.deepEqual(points(cold.snapshot()),savedPose);
   await cold.attachRecoveredResources(draw);
   cold.authority.resumeNativeIntentProduction(hold);
   await untilProduction(cold,()=>cold.records.some(row=>row.kind==='home-route'&&row.committed));
   homeReady=cold.records.find(row=>row.kind==='home-route'&&row.committed);
   assert.notEqual(homeReady.resources.worldBoundary.ticket,held.resources.worldBoundary.ticket);
   assert.deepEqual(homeReady.resources.sourceRequest,source.home);
  }
  releaseHome();
  await untilProduction(cold,()=>homeReady.committed&&!!animalReady?.packet);
  assert.deepEqual(points(cold.snapshot()),savedPose);
  assert.equal(cold.snapshot().elapsed,disk.elapsed);
  assert(!animalReady.committed);
  if(recover==='approach'){
   const held=animalReady,home=planner.nativeHomeRouteExecution(disk.workers[0].id);
   const originalLease=planner.nativeGateCrossings(marker.gate.id);
   const {hold,route,q}=await replaceDraw(held,{kind:18,actorId:home.actorId});
   assert.deepEqual(q.execution,home);
   const ref=q.execution.binding.reference,epoch=ref.worldBoundary.effectiveTime;
   draw.client.registerClockBinding(draw.buffer,{byteOffset:0,semantic:'relative',epoch,
    resourceEnd:nativeClockResourceEnd(epoch,ref.endTime),nativeHome:ref});
   const gateBuffer=draw.client.device.createBuffer({size:16,usage:72});
   const gateGroup=draw.client.device.createBindGroup({entries:[{binding:0,resource:{buffer:gateBuffer}}]});
   draw.client.registerClockBinding(gateBuffer,{byteOffset:0,semantic:'relative',epoch,resourceEnd:nativeClockResourceEnd(epoch,ref.endTime),
    nativeGate:{gateId,worldBoundary:ref.worldBoundary}});
   const metadata={nativeWorldBoundary:ref.worldBoundary,clock:frozenClock};
   await assert.rejects(draw.frame(0,metadata),/Replacement requires its bound worker clock/);
   const submitted=draw.frame(0,metadata,[draw.group,gateGroup]);
   await flush();await draw.host.idle();draw.host.present();await submitted;
   const witness=await cold.authority.checkHeldDraw(30,hold,route);
   assert.equal(witness.nativeGate.gateId,gateId);
   assert.equal(witness.relativeTime,0);
   assert(!draw.host.inspect().nativeRouteFrame.bindings.some(row=>row.nativeAnimalCrop));
   assert.deepEqual(planner.nativeGateCrossings(marker.gate.id),originalLease);
   assert.deepEqual(points(cold.snapshot()),savedPose);
   homeReady.homeGroup=draw.group;homeReady.gateGroups=[gateGroup];
   await cold.attachRecoveredResources(draw);
   cold.authority.resumeNativeIntentProduction(hold);
   await untilProduction(cold,()=>cold.records.some(row=>row.kind==='animal-crop-route'&&row!==held&&row.committed));
   animalReady=cold.records.find(row=>row.kind==='animal-crop-route'&&row!==held&&row.committed);
   assert.notEqual(animalReady.resources.worldBoundary.ticket,held.resources.worldBoundary.ticket);
   assert.equal(animalReady.resources.bodyId,held.resources.bodyId);
  }
  releaseAnimal();
  await untilProduction(cold,()=>animalReady.committed);
  await cold.present();await animalReady.packet.presented;
  const restored=draw.host.inspect().nativeRouteFrame;
  const worker=restored.bindings.find(row=>row.nativeHome),animal=restored.bindings.find(row=>row.nativeAnimalCrop);
  assert.notEqual(restored.worldBoundary.authorityEpoch,previous.authorityEpoch);
  assert.equal(restored.clockElapsed,disk.elapsed);
  assert.equal(worker.relativeTime,0);
  assert.equal(animal.relativeTime,0);
  assert.deepEqual(points(cold.snapshot()),savedPose);
  assert.equal(animal.nativeAnimalCrop.targetId,Number(marker.animalPose.targetId.split('-')[1]));
  assert.equal(restored.bindings.find(row=>row.nativeGate).nativeGate.gateId,gateId);
  const lease=planner.nativeGateCrossings(marker.gate.id).find(row=>row.bodyId===worker.nativeHome.bodyId);
  assert(lease&&lease.from<=disk.elapsed&&lease.until>disk.elapsed,'The cold Home18 must reserve the occupied gate');
  assert(Math.abs(lease.until-until)<1e-9);
  const resumed=await step();
  assert.equal(resumed.elapsed,disk.elapsed+.02);
  assert.deepEqual(resumed.events.filter(row=>row.type==='StructureRuined').map(row=>[row.targetId,row.simulationTime]),
   before?[[doomed,event.simulationTime]]:[]);
  assert.equal(session.centerPolygonId(doomed),null);
  const replayed=cold.records.find(row=>row.kind==='center-ruin');
  if(before){
   assert(replayed?.committed,'The cold collapse requires its own prepared native removal');
   await replayed.packet.presented;
   const frame=draw.host.inspect().nativeRouteFrame;
   assert.equal(frame.worldBoundary.ticket,replayed.commit.worldBoundary.ticket);
   assert.equal(frame.clockElapsed,event.simulationTime);
   assert(frame.bindings.some(row=>row.nativeGate?.gateId===gateId));
  }else assert.equal(replayed,undefined);
  let state=JSON.parse(resumed.snapshot);
  for(let i=0;i<900&&(state.raid||state.workers[0].nativeRouteAdmission!=='native-idle');i++){
   state=JSON.parse((await step(.05)).snapshot);
   assert(!cold.faults.length&&!cold.errors.length,JSON.stringify({elapsed:state.elapsed,faults:cold.faults,draw:cold.errors,
    recent:cold.records.slice(-4).map(({kind,committed,packet})=>({kind,committed,sequence:packet?.sequence}))}));
  }
  assert.equal(state.raid,null);
  assert.equal(state.workers[0].nativeRouteAdmission,'native-idle');
  assert.equal(state.workers[0].personId,marker.personId);
  assert.deepEqual(state.ledger,disk.ledger);
  assert(cold.records.some(row=>row.kind==='home-arrival'&&row.committed));
  assert.equal(state.events.filter(row=>row.type==='RaidEnded'&&row.simulationTime>=disk.elapsed).length,1);
  assert.deepEqual(state.events.filter(row=>row.type==='StructureRuined').map(row=>[row.targetId,row.simulationTime]),[[doomed,event.simulationTime]]);
  const hits=state.events.filter(row=>row.type==='AnimalLogicalHit');
  assert.deepEqual(hits.slice(0,1),disk.events.filter(row=>row.type==='AnimalLogicalHit'));
  assert.equal(hits.length,1+disk.raid.animals[0].hitsRemaining);
  assert(hits.slice(1).every(row=>row.targetId===marker.animalPose.targetId));
  assert.equal(new Set(hits.map(row=>row.attackId)).size,hits.length);
  t.diagnostic(JSON.stringify({disk:before?'before':'after',savedAt:disk.elapsed,restored:restored.clockElapsed,
   epoch:restored.worldBoundary.authorityEpoch,lease,retiredAt:state.elapsed,ruinAt:event.simulationTime,hits:hits.length}));
 }finally{releaseHome();releaseAnimal();await cold.close();if(draw!==cold)await draw.host.dispose();}
}

test('Draw loss retains the arrived center approach while Home crosses its gate',{timeout:45000},async t=>{
 const initial=initialState(),gateId=gateIds[0],entityId='structure-'+gateId;
 initial.structures=initial.structures.filter(row=>row.id!=='structure-'+gateIds[1]);
 initial.structures.find(row=>row.id===doomed).hp=140;
 initial.dayPlan.at=initial.time+6;
 const raidView={...view,eye:{x:-18,z:-13.7},target:{x:-18,z:0}};
 const receipts=new Map();let access,world,draw,rig,heldStrike;
 globalThis[owner]=entry=>{access=entry;};
 try{
  world=await nativeProductionAuthority(initial,{chunkKeys,qualifyFarmFlee:true,qualifyAnimalCrop:true,getTerrainManifest:()=>terrainManifest,
   onReady(record,{signal}){if(record.kind==='animal-crop-strike'&&!heldStrike){
    heldStrike=record;
    return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Preparation cancelled','AbortError')),{once:true}));
   }},
   onCommit(record,receipt){receipts.set(record.kind,receipt);}});
  world.command({kind:'setNavigationView',view:raidView});
  await untilProduction(world,()=>receipts.has('farm-arrival'));
  const advance={kind:'advance',seconds:.05,steps:1,nightFastForward:false};
  const {planner}=access;
  let state,crossing;
  for(let i=0;i<220;i++){
   state=JSON.parse(world.command(advance).snapshot);
   await world.present();
   const animal=state.raid?.animals[0];
   if(!animal||!planner.nativeAnimalCropState(animal.id)?.arrived)continue;
   const home=receipts.get('home-route')?.nativeHomeRouteBinding;
   crossing=planner.nativeGateCrossings(entityId).find(row=>row.actorId===home?.reference.actorId&&
    row.bodyId===home.reference.bodyId&&row.from<=state.elapsed&&state.elapsed<row.until);
   if(crossing&&Math.abs(state.workers[0].z-state.structures.find(row=>row.id===entityId).z)<.5)break;
   crossing=null;
  }
  assert(crossing,'Expected the center endpoint within the Home gate reservation');
  const at=state.elapsed,animal=state.raid.animals[0],worker=state.workers[0];
  const home=receipts.get('home-route').nativeHomeRouteBinding,route=receipts.get('animal-crop-route').nativeAnimalCropRouteBinding;
  const ref=route.reference;
  assert.deepEqual(crossing.routeHandle,home.reference.expectedRouteHandle);
  assert.equal(worker.nativeRouteAdmission,'native-home');
  assert.equal(animal.targetId,doomed);
  assert.equal(animal.status,'walking');
  assert.equal(state.structures.find(row=>row.id===entityId).gateOpen,1);
  assert(at>ref.endTime);

  const wasm=access.session.core.wasm,sid=ref.worldBoundary.nativeSession;
  const clip=previewRaidStrike(state,animal);
  const stage=()=>wasm.nav_animal_strike_proposal_stage(ref.actorId,sid,route.assignmentSequence,clip.index,clip.duration);
  const ticket=()=>{
   assert.equal(wasm.nav_intent_barrier_proposal_ticket(),1);
   return Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_barrier_proposal_ticket_ptr(),6));
  };
  await untilProduction(world,()=>!!heldStrike?.packet);
  const originalTicket=ticket(),sequence=wasm.nav_intent_transition_sequence();
  assert.equal(wasm.nav_center_flight_strike_ready(ref.actorId,sid,route.assignmentSequence),1);
  assert.equal(wasm.nav_center_flight_strike_ready(ref.actorId,sid,route.assignmentSequence+1),0);
  assert.deepEqual(ticket(),originalTicket);
  assert.equal(wasm.nav_intent_transition_sequence(),sequence);
  world.gpu.device.destroy();world.retireResourceEndpoint();
  const hold=await world.authority.quiesceNativeIntentProduction({forLostDraw:true});
  const retirement=await world.authority.flushNativeResourcePreparation({allowRetired:true,forLostDraw:true});
  assert(retirement.terminal&&retirement.callbacksSettled);
  await assert.rejects(heldStrike.packet.presented);
  assert(!heldStrike.committed);

  // The same physical endpoint must not authorize a strike with an unrelated
  // body in the native cohort, even if it is far from either trajectory.
  const foreignBody=123456;
  assert.equal(wasm.spatial_body_upsert(foreignBody,-37,-37,.28,0,1),1);
  try{
   assert.equal(wasm.nav_center_flight_strike_ready(ref.actorId,sid,route.assignmentSequence),0);
   assert.equal(stage(),-2);
   assert.equal(wasm.nav_intent_barrier_proposal_ticket(),0);
  }finally{assert.equal(wasm.spatial_body_remove(foreignBody),1);}
  assert.equal(stage(),1);
  const staged=ticket();
  assert.equal(staged[5],27);
  assert.equal(wasm.nav_animal_strike_proposal_revalidate(...staged.slice(0,2)),1);
  const revalidated=ticket();
  assert(revalidated[1]>staged[1]);
  assert.deepEqual(revalidated.slice(2),staged.slice(2));
  assert.equal(wasm.nav_animal_strike_proposal_cancel(...revalidated.slice(0,2)),1);
  assert.deepEqual(planner.nativeGateCrossings(entityId).find(row=>row.bodyId===crossing.bodyId),crossing);

  const source=await world.authority.terminalWorkerRoute();
  assert.deepEqual(source,{version:2,members:[{kind:18,actorId:home.reference.actorId},{kind:26,actorId:ref.actorId}]});

  const [authorityPort,drawPort]=pair();
  draw=await fixture({capabilities:{nativeHomeRouteVersion:1,nativeAnimalCropVersion:1}},
   {intentControl:{port:drawPort,session:'production-control',recoveryHold:30},absoluteNow:()=>Number.MAX_SAFE_INTEGER});
  const {recoveredWorkerRoute:recovered}=await world.authority.attachHeldWorkerRoute(authorityPort,'production-control',30,hold,source);
  const [civil,center]=recovered.members;
  assert.deepEqual((await readClientAssignment(recovered)).members.map(member=>member.execution),[civil.execution,center.execution]);
  const wrongPose=structuredClone(recovered);
  wrongPose.members[1].execution.phase+=.01;
  await assert.rejects(readClientAssignment(wrongPose),/Invalid replacement committed assignment/);
  assert.deepEqual(civil.execution.binding.reference,home.reference);
  assert.deepEqual(center.execution.binding.reference,ref);
  assert.equal(civil.execution.arrived,false);
  assert.equal(center.execution.arrived,true);
  assert.deepEqual([center.execution.x,center.execution.z,center.execution.yaw,center.execution.phase],
   [animal.x,animal.z,animal.heading,animal.motionPhase]);
  rig=await originalRig(structuredClone(state),recovered.terrainManifest);
  const cropSource={...center,terrainManifest:recovered.terrainManifest,recoveryCut:recovered.worldBoundary};
  await assert.rejects(rig.recover(cropSource),/Invalid recovered crop source/);
  cropSource.flightHome=civil.execution.binding;
  await assert.rejects(rig.recover({...cropSource,execution:{...center.execution,phase:center.execution.phase+.01}}),/Invalid recovered crop source/);
  await rig.recover(cropSource);

  const homeRef=home.reference,homeAt=homeRef.worldBoundary.effectiveTime,cropAt=ref.worldBoundary.effectiveTime;
  const register=(byteOffset,epoch,end,binding)=>draw.client.registerClockBinding(draw.buffer,
   {byteOffset,epoch,semantic:'relative',resourceEnd:nativeClockResourceEnd(epoch,end),...binding});
  register(0,homeAt,homeRef.endTime,{nativeHome:homeRef});
  register(4,cropAt,ref.endTime,{nativeAnimalCrop:ref});
  register(8,homeAt,homeRef.endTime,{nativeGate:{gateId,worldBoundary:homeRef.worldBoundary}});
  await assert.rejects(world.authority.checkHeldDraw(30,hold,source),/Missing submitted/);
  const submit=async elapsed=>{
   const submitted=draw.frame(0,{nativeWorldBoundary:recovered.worldBoundary,
    clock:{version:1,epoch:0,elapsed,safeUntil:elapsed,anchorAbsoluteMs:0,paused:true,segments:[]}});
   await flush();await draw.host.idle();draw.host.present();await submitted;
  };
  await submit(at);
  const witness=await world.authority.checkHeldDraw(30,hold,source);
  assert.equal(witness.members[0].nativeGate.gateId,gateId);
  assert.equal(witness.members[0].relativeTime,floorFloat32(at-homeAt));
  const terminalAge=floorFloat32(nativeClockResourceEnd(cropAt,ref.endTime)-cropAt);
  assert.equal(witness.members[1].relativeTime,terminalAge);
  rig.presented(terminalAge);
  world.authority.resumeNativeIntentProduction(hold);
  const next=JSON.parse(world.command(advance).snapshot);
  assert.equal(next.elapsed,at+.05);
  assert.deepEqual(next.raid.animals[0],animal);
  assert(next.workers[0].z>worker.z);
  await submit(next.elapsed);
  const frame=draw.host.inspect().nativeRouteFrame;
  assert.equal(frame.clockElapsed,next.elapsed);
  assert.equal(frame.bindings.find(row=>row.nativeHome).relativeTime,floorFloat32(next.elapsed-homeAt));
  assert.equal(frame.bindings.find(row=>row.nativeAnimalCrop).relativeTime,terminalAge);
  assert.deepEqual(world.faults,[]);
  assert.deepEqual(draw.errors,[]);
  // Exercise the native retime across a live Home step while the graphical
  // preparation port remains detached in this recovery test.
  const activeCrossing=planner.nativeGateCrossings(entityId).find(row=>row.bodyId===crossing.bodyId);
  assert.deepEqual(activeCrossing,crossing);
  assert.equal(stage(),1);
  const first=ticket();
  const afterStage=JSON.parse(world.command(advance).snapshot);
  assert.equal(afterStage.elapsed,next.elapsed+.05);
  assert(afterStage.workers[0].z>next.workers[0].z);
  assert.equal(wasm.nav_animal_strike_proposal_revalidate(...first.slice(0,2)),1);
  const go=ticket(),attackId=afterStage.sequence;
  assert.equal(wasm.nav_animal_strike_proposal_commit_bound(...go.slice(0,5),first[1],attackId),1);
  assert.equal(wasm.nav_animal_strike_snapshot(ref.actorId),1);
  const strike=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_animal_strike_snapshot_ptr(),25));
  assert.deepEqual([strike[2],strike[4],strike[5],strike[6]],
   [ref.bodyId,route.assignmentSequence,ref.worldBoundary.ticket,ref.generation]);
  assert.deepEqual([strike[15],strike[17],strike[19],strike[20],strike[22],strike[23]],
   [afterStage.elapsed,go[1],attackId,0,first[1],next.elapsed]);
  assert.deepEqual(planner.nativeGateCrossings(entityId).find(row=>row.bodyId===crossing.bodyId),crossing);
  t.diagnostic(JSON.stringify({at,crossing,homeAge:witness.members[0].relativeTime,terminalAge,strikeAcquiredAt:strike[15]}));
 }finally{
  delete globalThis[owner];rig?.close();draw?.client.dispose();await draw?.host.dispose();await world?.close();
 }
});

test('Draw loss retains an acquired center strike and the moving Home gate',{timeout:45000},async()=>{
 const initial=initialState(),gateId=gateIds[0];
 initial.structures=initial.structures.filter(row=>row.id!=='structure-'+gateIds[1]);
 const civil=initial.structures[0];
 civil.z+=-5-centerServicePoint(civil,initial,.8).z;
 initial.workers[0].z=-5;
 initial.dayPlan.at=initial.time+.8;
 initial.structures.find(row=>row.id===doomed).hp=140;
 const raidView={...view,eye:{x:-18,z:-13.7},target:{x:-18,z:0}};
 const advance={kind:'advance',seconds:.05,steps:1,nightFastForward:false};
 let home,strike,world,draw,rig;
 try{
  world=await nativeProductionAuthority(initial,{chunkKeys,qualifyFarmFlee:true,qualifyAnimalCrop:true,getTerrainManifest:()=>terrainManifest,
   onCommit(_record,receipt){
    home??=receipt.nativeHomeRouteBinding;strike??=receipt.nativeAnimalCropStrikeBinding;
   }});
  world.command({kind:'setNavigationView',view:raidView});
  await untilProduction(world,()=>world.records.some(row=>row.kind==='farm-arrival'&&row.committed));
  for(let i=0;i<160&&!strike;i++){
   await world.command({...advance,steps:2});await world.present();
  }
  assert(home&&strike,'Expected both acquisitions');
  const step=await world.command({...advance,seconds:.02}),state=JSON.parse(step.snapshot),at=state.elapsed;
  const [animal]=state.raid.animals,[worker]=state.workers;
  const ref=strike.reference,homeRef=home.reference,homeAt=homeRef.worldBoundary.effectiveTime,strikeAt=ref.worldBoundary.effectiveTime;
  assert(at>strikeAt&&at<ref.endTime);
  assert.equal(animal.attackId,'attack-'+strike.attackId);
  assert.equal(animal.status,'attacking');assert.equal(worker.nativeRouteAdmission,'native-home');
  assert(!state.events.some(row=>row.attackId===animal.attackId&&row.type==='AnimalLogicalHit'));

  world.gpu.device.destroy();world.retireResourceEndpoint();
  const hold=await world.authority.quiesceNativeIntentProduction({forLostDraw:true});
  const retirement=await world.authority.flushNativeResourcePreparation({allowRetired:true,forLostDraw:true});
  assert(retirement.terminal&&retirement.callbacksSettled);
  const source=await world.authority.terminalWorkerRoute();
  assert.deepEqual(source,{version:2,members:[{kind:18,actorId:homeRef.actorId},{kind:27,actorId:ref.actorId}]});
  const [authorityPort,drawPort]=pair();
  draw=await fixture({capabilities:{nativeHomeRouteVersion:1,nativeAnimalCropVersion:1}},
   {intentControl:{port:drawPort,session:'production-control',recoveryHold:30},absoluteNow:()=>Number.MAX_SAFE_INTEGER});
  const foreignHome=structuredClone(source);foreignHome.members[0].actorId=ref.actorId;
  await assert.rejects(world.authority.attachHeldWorkerRoute(authorityPort,'production-control',30,hold,foreignHome),
   /Expected current native recovery assignments/);
  const {recoveredWorkerRoute:recovered}=await world.authority.attachHeldWorkerRoute(authorityPort,'production-control',30,hold,source);
  const [civilMember,center]=recovered.members;
  assert.deepEqual((await readClientAssignment(recovered)).members.map(member=>member.execution),[civilMember.execution,center.execution]);
  const foreignAttack=structuredClone(recovered);foreignAttack.members[1].execution.binding.attackId++;
  await assert.rejects(readClientAssignment(foreignAttack),/Invalid replacement committed assignment/);
  assert.deepEqual(civilMember.execution.binding,home);assert.equal(center.execution.binding.attackId,strike.attackId);
  assert.deepEqual(center.execution.binding.reference,ref);
  assert.deepEqual([center.execution.x,center.execution.z,center.execution.yaw,center.execution.phase],
   [animal.x,animal.z,animal.heading,animal.motionPhase]);
  rig=await originalRig(structuredClone(state),recovered.terrainManifest);
  await rig.recover({...center,terrainManifest:recovered.terrainManifest,recoveryCut:recovered.worldBoundary,flightHome:home});

  draw.client.registerClockBinding(draw.buffer,{byteOffset:0,epoch:homeAt,semantic:'relative',
   resourceEnd:nativeClockResourceEnd(homeAt,homeRef.endTime),nativeHome:homeRef});
  draw.client.registerClockBinding(draw.buffer,{byteOffset:4,epoch:strikeAt,semantic:'relative',resourceEnd:ref.endTime,nativeAnimalCrop:ref});
  draw.client.registerClockBinding(draw.buffer,{byteOffset:8,epoch:homeAt,semantic:'relative',
   resourceEnd:nativeClockResourceEnd(homeAt,homeRef.endTime),nativeGate:{gateId,worldBoundary:homeRef.worldBoundary}});
  await assert.rejects(world.authority.checkHeldDraw(30,hold,source),/Missing submitted/);
  const submitted=draw.frame(0,{nativeWorldBoundary:recovered.worldBoundary,
   clock:{version:1,epoch:0,elapsed:at,safeUntil:at,anchorAbsoluteMs:0,paused:true,segments:[]}});
  await flush();await draw.host.idle();draw.host.present();await submitted;
  const witness=await world.authority.checkHeldDraw(30,hold,source);
  assert.equal(witness.members[0].nativeGate.gateId,gateId);
  assert.deepEqual(witness.members.map(row=>row.relativeTime),[floorFloat32(at-homeAt),floorFloat32(at-strikeAt)]);
  rig.presented(witness.members[1].relativeTime);

  await world.attachRecoveredResources(draw);
  assert.equal(world.authority.resumeNativeIntentProduction(hold),true);
  const hits=[];
  for(let i=0;i<45&&!hits.length;i++){
   const result=await world.command(advance);
   hits.push(...result.events.filter(row=>row.type==='AnimalLogicalHit'));
   await world.present();
  }
  assert.deepEqual(hits.map(row=>[row.attackId,row.targetId]),[[animal.attackId,doomed]]);
  assert.equal(world.snapshot().structures.find(row=>row.id===doomed).hp,120);
  assert.deepEqual(world.faults,[]);assert.deepEqual(draw.errors,[]);
 }finally{rig?.close();draw?.client.dispose();await draw?.host.dispose();await world?.close();}
});

// The remote client and Host are real. Only the GPU queue and minimal draws
// are fixtures. Each motor buffer belongs to the submitted kind12 packet.
async function closeGates(world,{planner,nativeIntentControl},route){
 const clocks=[];let frame,outcome,error;
 const result=planner.prepareNativeGateMotionAfterGpuFence({getPublication:()=>nativeIntentControl,staticObjects:true,
  prepareResources:async({resources,signal})=>{
   const boundary=resources.worldBoundary,start=boundary.effectiveTime;
   world.client.beginFrame({nativeWorldBoundary:boundary});
   const encoder=world.client.device.createCommandEncoder(),pass=encoder.beginRenderPass({
    colorAttachments:[{view:world.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});
   pass.setPipeline(world.pipeline);pass.setBindGroup(0,route.cropGroup);pass.draw(3);
   for(const gate of resources.gates){
    const buffer=world.client.device.createBuffer({size:16,usage:72});
    const binding={byteOffset:0,semantic:'relative',epoch:start,resourceEnd:gate.endTime,nativeGate:{gateId:gate.gateId,worldBoundary:boundary}};
    world.client.device.queue.writeBuffer(buffer,0,new Float32Array(4));world.client.registerClockBinding(buffer,binding);
    const group=world.client.device.createBindGroup({entries:[{binding:0,resource:{buffer}}]});
    pass.setBindGroup(0,group);pass.draw(3);clocks.push({buffer,binding,group});
   }
   pass.end();world.client.device.queue.submit([encoder.finish()]);
   frame=await world.client.prepareNativeWorldFrame({nativeWorldBoundary:boundary,
    clock:{...world.clock,elapsed:start,safeUntil:start,segments:[]}},{signal});
   frame.presented.catch(()=>{});
   return {preparedWorldBoundary:frame.preparedWorldBoundary,valid:frame.valid,commit:data=>frame.commit(data.worldBoundary),abort:frame.abort};
  }});
 result.then(value=>{outcome=value;},reason=>{error=reason;});
 await untilProduction(world,()=>!!(outcome||error));
 if(error)throw error;
 assert.equal(outcome.status,'committed');
 await world.present();await frame.presented;
 assert.deepEqual(world.host.inspect().nativeRouteFrame.bindings.filter(row=>row.nativeGate).map(row=>row.nativeGate.gateId).sort(),gateIds);
 return {clocks,boundary:outcome.worldBoundary};
}

for(const [mode,name] of [['retain both','retains both motors'],['recover','can replace a retired Draw'],['recover before GO','replays an interrupted removal'],['disk','round trips both motors through a public save'],['disk before ruin','can reload both motors during collapse'],['omit a motor','rejects a missing motor'],
 ['replace a motor after READY','rejects a motor changed after READY']])test('center ruin with closing gates '+name,{timeout:45000},async()=>{
 const initial=initialState();
 let access,motor,ready,releaseReady,world,replacement;
 globalThis[owner]=value=>{access=value;};
 try{
  world=await nativeProductionAuthority(initial,{chunkKeys,qualifyFarmFlee:true,qualifyAnimalCrop:true,getTerrainManifest:()=>terrainManifest,
   onPrepare(record){
    if(record.kind!=='center-ruin')return;
    record.retainedGateGroups=replacement?.motorGroups??motor.clocks.filter(({binding})=>mode!=='omit a motor'||binding.nativeGate.gateId!==gateIds[1]).map(row=>row.group);
    // A frame from Three can write other values in the same published uniform.
    if(!replacement)record.beforeDraw=()=>world.client.device.queue.writeBuffer(motor.clocks[0].buffer,4,new Float32Array([1]));
   },
   onReady(record,{signal}={}){if(record.kind==='center-ruin'){ready=record;if(!replacement)return new Promise(resolve=>{
    releaseReady=resolve;
    if(mode==='recover before GO')signal.addEventListener('abort',resolve,{once:true});
   });}}});
  assert(access);
  const native=access.session.core.wasm,polygon=access.session.centerPolygonId(doomed);
  assert(polygon>0);
  world.command({kind:'setNavigationView',view});
  await untilProduction(world,()=>world.records.some(row=>row.kind==='farm-arrival'&&row.committed));
  let state=initial;
  for(let i=0;i<650;i++){
   const center=state.structures.find(row=>row.id===doomed);
   const approach=world.records.findLast(row=>row.kind==='animal-crop-route'&&row.committed&&row.resources.reference.targetId===2);
   if(!motor&&approach&&center.status==='collapsing'&&center.collapseRemaining<.5){
    assert.equal(state.workers[0].status,'home');assert.equal(native.spatial_body_count(),1);
    motor=await closeGates(world,access,approach);
   }
   const step=world.command({kind:'advance',seconds:.05,nightFastForward:false,steps:2});
   if(!(step instanceof Promise)){
    state=JSON.parse(step.snapshot);await world.present();
    if(mode==='disk before ruin'&&motor&&state.structures.find(row=>row.id===doomed).status==='collapsing'){
     await reloadClosingGates(world,state,motor.boundary.authorityEpoch,{beforeRuin:true});return;
    }
    continue;
   }
   assert(motor,'expected the advance to stop at the ruin after GO12');
   let result,error;
   step.then(value=>{result=value;},reason=>{error=reason;});
   const wait=async predicate=>{
    for(let j=0;j<1500&&!predicate();j++)await world.present();
    assert(predicate(),'expected a result from the ruin packet');
   };
   await wait(()=>ready||error||world.errors.length);
   if(mode==='omit a motor'){
    assert.match(world.errors.join('\n'),/acquired motor clocks/);assert(!ready);
    assert.equal(captureSpatialPolygons(native,polygon).length,1);return;
   }
   if(error)throw error;
   assert(ready?.packet&&!ready.committed);
   const proof=ready.resources.nativeCenterRuin;
   assert.deepEqual(proof.retainedGateIds,gateIds);
   const cut=proof.boundary.effectiveTime;
   assert(cut>motor.boundary.effectiveTime&&proof.end<motor.clocks[0].binding.resourceEnd);
   assert.equal(native.nav_gate_motion_stage_causal(1,1),-7);
   assert.equal(captureSpatialPolygons(native,polygon).length,1);
   if(mode==='recover before GO'){
    const abandoned=ready;
    replacement=await recoverRouteAfterRuin(world,proof,cut,null,{beforeRuin:true,interrupted:step,movingMotors:true});
    releaseReady();
    const prefix=await step,remaining=prefix.pendingRuinRecoveryCut.remainingSeconds;
    assert(remaining>0&&remaining<=.05);
    assert.deepEqual(prefix.pendingRuinRecoveryCut.worldBoundary,motor.boundary);
    assert(!prefix.events.some(event=>event.type==='StructureRuined'));
    assert.equal(JSON.parse(prefix.snapshot).structures.find(row=>row.id===doomed).status,'collapsing');
    assert.equal(captureSpatialPolygons(native,polygon).length,1);
    assert(!abandoned.committed);await assert.rejects(abandoned.packet.presented);
    ready=null;result=null;
    world.command({kind:'advance',seconds:remaining,nightFastForward:false,steps:1}).then(value=>{result=value;},reason=>{error=reason;});
    await wait(()=>result||error||world.errors.length);
    if(error)throw error;
    await wait(()=>ready?.committed||world.errors.length);
    assert(ready?.committed,world.errors.join('\n'));
    assert(ready.commit.worldBoundary.ticket>proof.boundary.ticket);
    assert.equal(ready.commit.worldBoundary.effectiveTime,proof.end);
    await world.present();const drawn=await ready.packet.presented,frame=replacement.host.inspect().nativeRouteFrame;
    assert.equal(drawn.sequence,frame.sequence);
    assert.equal(frame.clockElapsed,proof.end);
    assert.deepEqual(frame.bindings.filter(row=>row.nativeGate).map(row=>row.nativeGate.gateId).sort(),gateIds);
    assert.deepEqual(result.events.filter(row=>row.type==='StructureRuined').map(row=>[row.targetId,row.simulationTime]),[[doomed,proof.end]]);
    assert.deepEqual(captureSpatialPolygons(native,polygon),[]);
    assert.deepEqual(world.faults,[]);assert.deepEqual(world.errors,[]);
    return;
   }
   if(mode==='replace a motor after READY'){
    const {buffer,binding}=motor.clocks[0];
    world.client.registerClockBinding(buffer,{...binding,resourceEnd:binding.resourceEnd-.05});
    await world.host.idle();
   }
   releaseReady();
   await wait(()=>result||error||world.errors.length);
   if(mode==='replace a motor after READY'){
    assert.match(world.errors.join('\n'),/acquired motor clocks/);assert(!ready.committed);
    assert.equal(native.nav_intent_effective_time(),cut);assert.equal(captureSpatialPolygons(native,polygon).length,1);return;
   }
   if(error)throw error;
   await world.present();const presented=await ready.packet.presented;
   const draw=world.host.inspect().nativeRouteFrame;
   assert.equal(draw.sequence,presented.sequence);assert.equal(draw.clockElapsed,proof.end);
   assert.equal(draw.worldBoundary.ticket,proof.boundary.ticket);
   assert(draw.bindings.some(row=>row.nativeAnimalCrop?.bodyId===proof.approach.reference.bodyId));
   const gates=draw.bindings.filter(row=>row.nativeGate);
   assert.deepEqual(gates.map(row=>row.nativeGate.gateId).sort(),gateIds);
   for(const binding of gates){
    assert.deepEqual(binding.nativeGate.worldBoundary,motor.boundary);
    assert.equal(binding.elapsed,binding.epoch+floorFloat32(proof.end-binding.epoch));
   }
   assert.deepEqual(result.events.filter(event=>event.type==='StructureRuined').map(event=>[event.targetId,event.simulationTime]),[[doomed,proof.end]]);
   assert.deepEqual(captureSpatialPolygons(native,polygon),[]);
   assert(world.host.inspect().uniformForks>0);
   const later=JSON.parse(result.snapshot);
   assert(later.structures.filter(row=>row.gate).every(row=>row.gateOpen===1-(later.elapsed-motor.boundary.effectiveTime)/.6));
   assert.deepEqual(world.faults,[]);assert.deepEqual(world.errors,[]);
   if(mode==='disk')await reloadClosingGates(world,later,draw.worldBoundary.authorityEpoch);
   if(mode==='recover'){
    replacement=await recoverRouteAfterRuin(world,ready.commit.nativeCenterRuin,later.elapsed,later);
    assert.deepEqual(replacement.host.inspect().nativeRouteFrame.bindings.filter(row=>row.nativeGate).map(row=>row.nativeGate.gateId).sort(),gateIds);
    const next=await world.command({kind:'advance',seconds:.05,steps:1,nightFastForward:false});
    const continued=JSON.parse(next.snapshot);
    assert(continued.elapsed>later.elapsed);
    assert(continued.structures.filter(row=>row.gate).every(row=>row.gateOpen===1-(continued.elapsed-motor.boundary.effectiveTime)/.6));
    assert(!next.events.some(row=>row.type==='StructureRuined'));
   }
   return;
  }
  assert.fail('Did not reach the native ruin cut');
 }finally{delete globalThis[owner];releaseReady?.();await world?.close();await replacement?.host.dispose();}
});

async function reloadClosingGates(original,state,previousEpoch,{beforeRuin=false}={}){
 const capture=original.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
 const saved=prepareWorkerCheckpoint(capture,{slotId:state.slotId,policy:{nativeAuthority:true},savedAt:0});
 assert.equal(saved.saved,true);
 const disk=saved.state;
 const text=serialize(disk),marker=disk.workerNativeAuthorityCheckpoint.refugeReturn;
 assert.equal(marker.version,3);assert.equal(marker.at,state.elapsed);
 assert.deepEqual(marker.motors.map(row=>row.id),gateIds.map(id=>'structure-'+id));
 const forged=structuredClone(disk);forged.workerNativeAuthorityCheckpoint.refugeReturn.motors[0].end+=.05;
 assert.throws(()=>savedNativeAuthorityOptions(serialize(forged)),/Invalid saved refuge gate motors/);
 const duplicate=structuredClone(disk),programs=duplicate.workerNativeAuthorityCheckpoint.refugeReturn.motors;
 programs[1]={...programs[0]};
 assert.throws(()=>savedNativeAuthorityOptions(serialize(duplicate)),/Invalid saved refuge gate motors/);
 let gateReady,release;
 const cold=await nativeProductionAuthority(disk,{...savedNativeAuthorityOptions(text),qualifyAnimalCrop:true,getTerrainManifest:()=>terrainManifest,
  onPrepare(record){if(record.kind==='center-ruin')record.retainedGateGroups=gateReady.gateGroups;},
  onReady(record,{signal}={}){if(record.kind==='gate-motion'){
   gateReady=record;return new Promise(resolve=>{release=resolve;signal.addEventListener('abort',resolve,{once:true});});
  }}});
 try{
  const held=cold.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
  assert.equal(held.saveAvailable,false);
  const acquired=()=>cold.records.find(row=>row.kind==='animal-crop-route'&&row.committed);
  let prefix=cold.command({kind:'advance',seconds:.05,steps:1,nightFastForward:false});
  let stopped=false;prefix=Promise.resolve(prefix).finally(()=>{stopped=true;});prefix.catch(()=>{});
  await untilProduction(cold,()=>stopped);
  prefix=await prefix;
  assert.equal(prefix.elapsed,state.elapsed);
  assert.equal(prefix.centerMotionPublication.kind,26);
  assert.equal(prefix.centerMotionPublication.remainingSeconds,.05);
  await untilProduction(cold,()=>!!acquired());
  const route=acquired();
  assert.notEqual(route.resources.reference.worldBoundary.authorityEpoch,previousEpoch);
  const ref=route.resources.reference,animal=state.raid.animals[0];
  assert.deepEqual([ref.x,ref.z,ref.phase,ref.yaw],[animal.x,animal.z,animal.motionPhase,animal.heading]);
  const step=cold.command({kind:'advance',seconds:prefix.centerMotionPublication.remainingSeconds,steps:1,nightFastForward:false});
  step.catch(()=>{});await untilProduction(cold,()=>!!gateReady);
  assert.deepEqual(gateReady.resources.gates.map(gate=>gate.rows[1]),marker.gates.map(gate=>gate.opening));
  assert.deepEqual(gateReady.resources.gates.map(gate=>gate.endTime),marker.motors.map(gate=>gate.end));
  assert.equal(gateReady.resources.worldBoundary.effectiveTime,marker.at);
  assert.throws(()=>cold.authority.execute({kind:'snapshot',sequence:prefix.sequence+2}),/own this advance/);
  let presented=false,advanced=false;
  gateReady.packet.presented.then(()=>{presented=true;},()=>{});
  const completed=step.then(result=>{assert(presented,'the advance spent time before the motor packet was submitted');return result;})
   .finally(()=>{advanced=true;});
  completed.catch(()=>{});
  release();
  await untilProduction(cold,()=>advanced);
  const resumed=await completed;
  await cold.present();await gateReady.packet.presented;
  const frame=cold.host.inspect().nativeRouteFrame;
  assert.equal(frame.worldBoundary.ticket,gateReady.resources.worldBoundary.ticket);
  assert.equal(frame.clockElapsed,marker.at);
  assert.deepEqual(frame.bindings.filter(row=>row.nativeGate).map(row=>row.nativeGate.gateId).sort(),gateIds);
  assert.equal(frame.bindings.find(row=>row.nativeAnimalCrop).nativeAnimalCrop.bodyId,ref.bodyId);
  assert.equal(resumed.elapsed,state.elapsed+.02+.02+.01);
  assert(!resumed.events.some(row=>row.type==='StructureRuined'));
  let settled=resumed;
  const ruins=[];
  for(let i=0;i<14&&JSON.parse(settled.snapshot).structures.some(row=>row.gate&&row.gateOpen>0);i++){
   let complete=false;
   const interval=Promise.resolve(cold.command({kind:'advance',seconds:.05,steps:2,nightFastForward:false}))
    .finally(()=>{complete=true;});
   interval.catch(()=>{});await untilProduction(cold,()=>complete);
   settled=await interval;await cold.present();
   ruins.push(...settled.events.filter(event=>event.type==='StructureRuined'));
  }
  assert.deepEqual(JSON.parse(settled.snapshot).structures.filter(row=>row.gate).map(row=>row.gateOpen),[0,0]);
  assert.deepEqual(ruins.map(row=>row.targetId),beforeRuin?[doomed]:[]);
  const final=cold.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
  assert.equal(final.nativeAuthorityCheckpoint.refugeReturn.version,2);
  assert.deepEqual(cold.faults,[]);assert.deepEqual(cold.errors,[]);
 }finally{release?.();await cold.close();}
}
