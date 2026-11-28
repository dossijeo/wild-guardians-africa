import assert from 'node:assert/strict';
import {register} from 'node:module';
import test from 'node:test';
import {floorFloat32} from '../src/rendering/float32-time.js';
import {serialize} from '../src/persistence/snapshots.js';
import {prepareWorkerCheckpoint} from '../src/persistence/prepare-worker-checkpoint.js';
import {savedNativeAuthorityOptions} from '../src/simulation/native-authority-checkpoint.js';
import {centerServicePoint} from '../src/world/centers.js';
import {captureSpatialPolygons} from '../src/world/wild-engine/spatial-state.js';
import {readClientAssignment,recoverRouteAfterRuin} from './helpers/native-center-ruin-recovery.js';
import {fixture,flush,pair} from './helpers/remote-webgpu-fixture.js';
import {nativeClockResourceEnd} from '../src/rendering/native-clock-resource-end.js';
import {originalRig} from './helpers/native-animal-crop-rig.js';
import {previewRaidStrike} from '../src/simulation/raids.js';

// Open the existing causal motor entry point at a controlled Game boundary.
// The production authority has no command for independently closing gates.
const ownerKey='native-center-ruin-moving-gate-test';
const owner=Symbol.for(ownerKey);
const successorFixtureSlot='occupied-gate-center-successor';
register('data:text/javascript,'+encodeURIComponent(`
 import assert from 'node:assert/strict';
 export async function load(url,context,next){
  const result=await next(url,context);
  if(url.endsWith('/src/simulation/native-intent-production.js')){
   const source=typeof result.source==='string'?result.source:Buffer.from(result.source).toString('utf8');
   const guard="!(r.purpose==='center'&&flight)";
   // Drive the mixed strike in the test before the ruin has a two-body owner.
   assert.equal(source.split(guard).length,2);
   return {...result,source:source.replace(guard,'(state.slotId===${JSON.stringify(successorFixtureSlot)}||'+guard+')')};
  }
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

test('the finished center strike admits a new corridor while the same Home18 owns the gate',{timeout:45000},async t=>{
 const initial=initialState(),gateId=gateIds[0],entityId='structure-'+gateId;
 initial.slotId=successorFixtureSlot;
 initial.structures=initial.structures.filter(row=>row.id!=='structure-'+gateIds[1]);
 const civil=initial.structures[0],firstCenter=initial.structures.find(row=>row.id===doomed);
 civil.z+=-5-centerServicePoint(civil,initial,.8).z;
 initial.workers[0].z=-5;
 initial.dayPlan.at=initial.time+.8;
 firstCenter.hp=140;
 const raidView={...view,eye:{x:-18,z:-13.7},target:{x:-18,z:0}};
 let access,world,home,strike,successor,held,releaseReady,sourceAt;
 const heldReady=new Promise(resolve=>{releaseReady=resolve;});
 const hits=[];
 globalThis[owner]=entry=>{access=entry;};
 try{
  world=await nativeProductionAuthority(initial,{chunkKeys,qualifyFarmFlee:true,qualifyAnimalCrop:true,getTerrainManifest:()=>terrainManifest,
   onReady(record){if(!held&&record.kind==='animal-crop-route'&&'structure-'+record.resources.reference.targetId===civil.id){held=record;return heldReady;}},
   onCommit(record,receipt){
    if(record.kind==='home-route')home=receipt.nativeHomeRouteBinding;
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
  t.diagnostic(JSON.stringify({impact:hits[0].simulationTime,ready:sourceAt,go:r.worldBoundary.effectiveTime,
   gate:lease,beforeCollapse:state.elapsed,collapseAt,workerZ:state.workers[0].z}));
 }finally{
  releaseReady();delete globalThis[owner];await world?.close();
 }
});

test('Draw loss retains the arrived center approach while Home crosses its gate',{timeout:45000},async t=>{
 const initial=initialState(),gateId=gateIds[0],entityId='structure-'+gateId;
 initial.structures=initial.structures.filter(row=>row.id!=='structure-'+gateIds[1]);
 initial.structures.find(row=>row.id===doomed).hp=140;
 initial.dayPlan.at=initial.time+6;
 const raidView={...view,eye:{x:-18,z:-13.7},target:{x:-18,z:0}};
 const receipts=new Map();let access,world,draw,rig;
 globalThis[owner]=entry=>{access=entry;};
 try{
  world=await nativeProductionAuthority(initial,{chunkKeys,qualifyFarmFlee:true,qualifyAnimalCrop:true,getTerrainManifest:()=>terrainManifest,
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
  // The same physical endpoint must not authorize a strike with an unrelated
  // body in the native cohort, even if it is far from either trajectory.
  const foreignBody=123456;
  assert.equal(wasm.spatial_body_upsert(foreignBody,-37,-37,.28,0,1),1);
  try{
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

  world.gpu.device.destroy();world.retireResourceEndpoint();
  const hold=await world.authority.quiesceNativeIntentProduction();
  const retirement=await world.authority.flushNativeResourcePreparation({allowRetired:true});
  assert(retirement.terminal&&retirement.callbacksSettled);
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
  // Exercise acquisition in WASM at the recovered cut. The ordinary Game
  // producer still leaves Strike27 behind Home19.
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
