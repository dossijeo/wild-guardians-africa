import assert from 'node:assert/strict';
import {register} from 'node:module';
import test from 'node:test';
import {floorFloat32} from '../src/rendering/float32-time.js';
import {centerServicePoint} from '../src/world/centers.js';
import {captureSpatialPolygons} from '../src/world/wild-engine/spatial-state.js';
import {recoverRouteAfterRuin} from './helpers/native-center-ruin-recovery.js';

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

for(const [mode,name] of [['retain both','retains both motors'],['recover','can replace a retired Draw'],['recover before GO','replays an interrupted removal'],['omit a motor','rejects a missing motor'],
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
   if(!(step instanceof Promise)){state=JSON.parse(step.snapshot);await world.present();continue;}
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
