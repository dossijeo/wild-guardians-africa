import assert from 'node:assert/strict';
import test from 'node:test';
import {MessageChannel} from 'node:worker_threads';
import {Group,Matrix4,DoubleSide,PerspectiveCamera} from 'three';
import {createWebGpuPipelineAdmission} from '../src/rendering/webgpu-pipeline-admission.js';
import {MeshStandardNodeMaterial} from 'three/webgpu';
import {nativeFarmArrivalRouteFixture} from './helpers/native-farm-arrival-route.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {fixture,flush} from './helpers/remote-webgpu-fixture.js';
import {floorFloat32} from '../src/rendering/float32-time.js';
import {nativeClockResourceEnd} from '../src/rendering/native-clock-resource-end.js';
import {centerServicePoint} from '../src/world/centers.js';
import {nativeWorkerGraphicsFixture} from './helpers/native-task-consequence-graphics.js';
import {gateMeshPrototype} from './helpers/gate-mesh-source.js';
import {NativeWall} from '../src/rendering/walls.js';
import {createNativeGateGpuClock} from '../src/rendering/native-gate-gpu-clock.js';
import {createNativeGateGpuBinding} from '../src/rendering/native-gate-gpu-binding.js';
import {createPlant} from '../src/simulation/crops.js';
import {cropSpec} from '../src/simulation/rules.js';
import {prepareWorkerCheckpoint} from '../src/persistence/prepare-worker-checkpoint.js';
import {serialize} from '../src/persistence/snapshots.js';
import {savedNativeAuthorityOptions} from '../src/simulation/native-authority-checkpoint.js';
import {copyStop24Resources,recoveredStoppedGateSamplesMatch,stop24ProjectionMatches,stopFields} from '../src/world/native-stop24-task-recovery.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';
import {createWebGpuAdmittedWall} from '../src/rendering/webgpu-wall-admission.js';

async function gateRouteAuthority(home,{configure=()=>{},...options}={}){
  const origin=nativeFarmArrivalRouteFixture({peer:false}),state=structuredClone(origin.state);origin.close();
 const start={x:-14,z:11.8},goal={x:-14,z:3.2},gate={
  id:'structure-1000000',created:29207,kind:'wall',material:'zarzas',gate:true,x:-14,z:8.2,yaw:0,maxHp:60,hp:60,
  status:'intact',villageId:'village-1',cost:10,collapseRemaining:0,gateOpen:0
 };
 const worker=state.workers[0],center=state.structures.find(row=>row.id===worker.centerId),service=centerServicePoint(center,state,.8);
 if(home)Object.assign(worker,goal,{status:'returning',nativeRouteAdmission:'pending-home-resources',idleState:null,destinationId:null});
 else Object.assign(worker,start);
 state.villages.find(v=>v.id===worker.villageId).entry={...start};
 center.x+=goal.x-service.x;center.z+=goal.z-service.z;
 state.structures.push(gate);state.nextId=1000001;
 configure(state,worker);
 const chunkKeys=[...Array.from({length:9},(_,i)=>[i%3-1,Math.floor(i/3)-1].join(',')),'2,-1','2,0','2,1'];
 return nativeProductionAuthority(state,{chunkKeys,...options});
}

function addSecondGate(state){
 const first=state.structures.find(row=>row.id==='structure-1000000');
 state.structures.push({...first,id:'structure-1000001',created:state.nextId,z:5.3});
 state.nextId=1000002;
}

for(const [scenario,{gateCount,maturity,taskReady,stoppedGateIds}] of Object.entries({
 'one opening gate':{gateCount:1,maturity:.5,taskReady:true,stoppedGateIds:[1000000]},
 'an opening gate and a future gate':{gateCount:2,maturity:.5,taskReady:true,stoppedGateIds:[1000000,1000001]},
 'one settled gate':{gateCount:1,maturity:4,taskReady:true,stoppedGateIds:[]},
 'a settled gate and a future gate':{gateCount:2,maturity:2.1,taskReady:false,stoppedGateIds:[1000001]},
}))test('Stop24 presents the stopped worker with '+scenario,async()=>{
 let stop,task,releaseStop,releaseTask,commit;
 const stopHeld=new Promise(resolve=>{releaseStop=resolve;});
 const taskHeld=new Promise(resolve=>{releaseTask=resolve;});
 const f=await gateRouteAuthority(false,{nativeWorkerLifecycle:true,
  configure(state,worker){
   if(gateCount===2)addSecondGate(state);
   const crop=createPlant('plant-'+state.nextId++,'mijo',-10.6,5.3,worker.centerId);
   crop.growth=cropSpec(crop.species).growth_seconds-maturity;
   for(const water of crop.water)water.status='manual';
   state.plants.push(crop);
  },
  onReady(record){
   if(record.kind==='farm-arrival-stop'){stop=record;return stopHeld;}
   if(record.kind==='task-start'){task=record;return taskHeld;}
  },
  onCommit(record,receipt){if(record.kind==='farm-arrival-stop')commit=receipt;},
 });
 try{
  const farm=()=>f.records.find(r=>r.kind==='farm-arrival'&&r.committed);
  await untilProduction(f,farm);
  assert.equal(farm().resources.gates.length,gateCount);
  const advance=async()=>{const state=f.advance(.025);await f.present();return state;};
  for(let i=0;i<140&&!stop;i++)await advance();
  assert(stop?.packet,'The crop must mature before the Farm route ends');
  const before=stop.resources.gateEffects.rows;
  const projectedGateIds=rows=>Array.from(rows).filter((_,i)=>i%3===0);
  assert.deepEqual(projectedGateIds(before),stoppedGateIds);
  const waiting=await advance();
  const openings=state=>state.structures.filter(s=>s.gate).map(s=>s.gateOpen);
  if(maturity===.5){
   assert(before[2]>.2&&before[2]<.3);
   assert(openings(waiting)[0]>before[2]);
  }
  assert.equal(waiting.workers[0].nativeRouteAdmission,'native-farm-arrival');
  assert.equal(stop.committed,false);
  let submitted;
  stop.packet.presented.then(frame=>{submitted=frame;},()=>{});
  releaseStop();
  const successorWaiting=()=>taskReady?task:f.authority.nativeIntentProductionStatus().last?.status==='blocked';
  for(let i=0;i<9&&!successorWaiting();i++)await advance();
  await untilProduction(f,()=>successorWaiting()&&commit&&submitted);
  const cut=f.snapshot();
  assert.equal(cut.workers[0].nativeRouteAdmission,'pending-resources');
  if(taskReady)assert.equal(task.committed,false);
  else assert.equal(task,undefined);
  const actual=commit.nativeFarmArrivalStopBinding.projection.gateEffects.rows;
  assert.deepEqual(projectedGateIds(actual),stoppedGateIds);
  const frozenOpenings=openings(cut);
  if(maturity===.5)assert(actual[2]>before[2]&&actual[2]<1);
  else assert.equal(frozenOpenings[0],1);
  if(gateCount===2)assert.equal(frozenOpenings[1],0);
  const frame=f.host.inspect().nativeRouteFrame;
  assert.equal(frame.sequence,submitted.sequence);
  assert.deepEqual(frame.worldBoundary,commit.worldBoundary);
  const body=frame.bindings.find(b=>b.nativeStopped?.kind==='native-farm-arrival-stopped-body');
  assert.equal(body?.bodyReference.bodyId,1);
  const motors=frame.bindings.filter(b=>b.nativeStopped?.kind==='native-farm-arrival-stopped-gate');
  assert.deepEqual(motors.map(b=>b.nativeStopped.gateId),stoppedGateIds);
  for(const [i,motor] of motors.entries()){
   assert.equal(motor.nativeStopped.mechanism,actual[3*i+1]);
   assert.equal(motor.opening,Math.fround(actual[3*i+2]));
  }
  const after=await advance();
  assert.deepEqual(openings(after),frozenOpenings);
  for(const field of ['x','z','heading','runPhase','walkPhase','carryPhase','runRemaining']){
   assert.equal(after.workers[0][field],cut.workers[0][field],field);
  }
  assert.deepEqual(f.faults,[]);
  await replaceStoppedFarm(f,task,releaseTask,frame);
 }finally{releaseStop();releaseTask();await f.close();}
});

async function replaceStoppedFarm(f,task,releaseTask,oldFrame){
 const holding=f.authority.quiesceNativeIntentProduction({forLostDraw:true});
 f.gpu.device.destroy();f.retireResourceEndpoint();releaseTask();
 const hold=await holding;
 if(task)assert(task.aborted&&!task.committed);
 await untilProduction(f,()=>f.authority.nativeIntentControlStatus().current?.drained);
 const terminal=await f.authority.flushNativeResourcePreparation({allowRetired:true,forLostDraw:true});
 assert(terminal.terminal&&terminal.callbacksSettled);
 const route=await f.authority.terminalWorkerRoute();
 assert.deepEqual(route,{kind:24,actorId:900011});
 const ports=new MessageChannel();
 const replacement=await fixture({capabilities:{nativeFarmArrivalStopVersion:1,nativeFarmArrivalStopClockVersion:1,nativeFarmArrivalStopGateVersion:1,
   nativeTaskStartVersion:1,nativeTaskActionVersion:1,nativeTaskActionClockVersion:1,nativeInitialIdleBodyVersion:1,
   nativeIdleCycleVersion:1,nativeIdleStrollVersion:1,nativeIdleCycleIdlePhaseVersion:1}},
   {intentControl:{port:ports.port2,session:'production-control',recoveryHold:30},absoluteNow:()=>Number.MAX_SAFE_INTEGER});
 let attached=false,rig,admission;
 const walls=[];
 try{
  const {recoveredWorkerRoute:{resources,execution}}=await f.authority.attachHeldWorkerRoute(ports.port1,'production-control',30,hold,route);
  const {client,host,pipeline}=replacement,{binding:proof,executedThrough:at}=execution,ref=proof.reference;
  const previousBody=oldFrame.bindings.find(b=>b.nativeStopped?.kind==='native-farm-arrival-stopped-body');
  const previousMotors=oldFrame.bindings.filter(b=>b.nativeStopped?.kind==='native-farm-arrival-stopped-gate');
  assert.deepEqual(proof.reference.worldBoundary,oldFrame.worldBoundary);
  if(proof.settledGates?.length){
   const [gate]=proof.settledGates;
   assert.throws(()=>copyStop24Resources({...resources,stoppedTaskBinding:{...proof,settledGates:[]}}),/lost a gate owner/);
   assert.throws(()=>copyStop24Resources({...resources,stoppedTaskBinding:{...proof,
     settledGates:[{...gate,opening:gate.opening===1?0:1}]}}),/lost its admitted Farm table/);
  }

  const view=f.snapshot(),payloads=new Map();
  f.authority.publishResidentTerrainForQa(chunk=>payloads.set(chunk.cx+','+chunk.cz,chunk));
  let currentChunk;
  const session={core:{selectChunk(x,z){currentChunk=payloads.get(x+','+z);assert(currentChunk);},chunkPayload:()=>currentChunk}};
  const [worker]=view.workers;
  rig=await nativeWorkerGraphicsFixture({state:view,worker,actor:worker.id,session,close(){}},
    {clips:['Walk_Skip','Idle'],idle:true});
  admission=createWebGpuPipelineAdmission({renderer:{...rig.renderer,compileAsync:async()=>{}},
    scene:rig.scene,camera:new PerspectiveCamera()});
  rig.admission.prepareManyAndPublish=admission.prepareManyAndPublish.bind(admission);
  for(const motor of resources.farmTemplate.gates){
   const entity=view.structures.find(row=>row.id===motor.entityId),prototype=gateMeshPrototype(entity.material);
   prototype.material.dispose();prototype.material=new MeshStandardNodeMaterial({side:DoubleSide});
   const wall=createWebGpuAdmittedWall({entity,elapsed:at,prototypes:{[entity.material+'_puerta']:prototype},pipelineAdmission:rig.admission});
   walls.push({wall,prototype,motor,entity});
   const scale={adobe:1.4,piedra:1.4,reforzado:1.6}[entity.material]??1;
   new Matrix4().fromArray(motor.rootMatrix).decompose(wall.group.position,wall.group.quaternion,wall.group.scale);
   wall.group.scale.divideScalar(scale);wall.group.scale.x/=entity.baseScaleX??1;
   rig.scene.add(wall.group);
  }
  await new Promise(resolve=>setImmediate(resolve));
  for(const {wall,motor,entity} of walls){
   assert(wall.recoveredStoppedGateCurrent(motor,entity.gateOpen));
   assert(!wall.recoveredStoppedGateCurrent(motor,entity.gateOpen===1?0:1));
  }
  const pickFrame=()=>captureNativeRoutePickFrame(host.inspect()),prepared=proof.proof.preparedReference;
  await rig.roster.prepareRecoveredStoppedWorker({resources,execution,terrain:rig.terrain,terrainManifest:rig.manifest},{
   isCurrent:()=>true,getProjection:(selector,epoch)=>pickFrame().getStoppedBody(selector,epoch),
   prepareGateParticipants:({signal})=>previousMotors.map(gate=>{
    const {wall,motor,entity}=walls.find(({motor})=>motor.gateId===gate.nativeStopped.gateId);
    const epoch=prepared.worldBoundary.effectiveTime;
    const presentation={...motor,worldBoundary:prepared.worldBoundary,startTime:epoch,endTime:epoch,
      rows:Float64Array.of(epoch,entity.gateOpen)};
    const motion=createNativeGateGpuClock(presentation,{stopTemplate:prepared,recoveredStop:proof.proof,
      getStoppedProjection:(selector,at)=>pickFrame().getStoppedGate(selector,at)});
    return wall.prepareNativeGate({presentation,motion,getPickTime:()=>epoch,signal,recoveredStop:true});
   }),
  });
  assert.equal(walls.filter(({wall})=>wall.nativeGateLease).length,previousMotors.length);
  assert.deepEqual(rig.errors,[]);

  const body=client.device.createBuffer({size:40,usage:72});
  client.device.queue.writeBuffer(body,0,new Float32Array(10));
  const clock={nativeStopped:ref.selector,epoch:ref.epoch,resourceEnd:Number.MAX_SAFE_INTEGER};
  client.registerClockBinding(body,{...clock,byteOffset:0,semantic:'relative'});
  for(const [i,stopField] of stopFields.entries())
   client.registerClockBinding(body,{...clock,byteOffset:(i+1)*4,semantic:'stop-value',stopField});
  const motors=previousMotors.map(({nativeStopped,epoch,semantic,stopField})=>{
   const buffer=client.device.createBuffer({size:4,usage:72});
   client.device.queue.writeBuffer(buffer,0,new Float32Array([0]));
   client.registerClockBinding(buffer,{nativeStopped,epoch,semantic,stopField,byteOffset:0,resourceEnd:Number.MAX_SAFE_INTEGER});
   return buffer;
  });
  function draw(gates){
   const group=client.device.createBindGroup({entries:[body,...gates].map((buffer,binding)=>({binding,resource:{buffer}}))});
   client.beginFrame({nativeWorldBoundary:ref.worldBoundary,clock:{...f.clock,elapsed:at,safeUntil:at,paused:true,segments:[]}});
   const encoder=client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{
    view:client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});
   pass.setPipeline(pipeline);pass.setBindGroup(0,group);pass.draw(3);pass.end();client.device.queue.submit([encoder.finish()]);
   return client.endFrame();
  }
  async function present(gates){
   const frame=draw(gates);frame.catch(()=>{});await flush();await host.idle();host.present();await frame;
  }
  if(motors.length)await assert.rejects(draw(motors.slice(1)),/Replacement requires its bound worker clock/);
  await assert.rejects(f.authority.checkHeldDraw(30,hold,route),/Missing submitted worker route/);
  await present(motors);
  const witness=await f.authority.checkHeldDraw(30,hold,route);
  assert(stop24ProjectionMatches(witness,proof));
  assert.deepEqual(witness.projection,previousBody.projection);
  assert(recoveredStoppedGateSamplesMatch(witness.stoppedGates??[],proof));
  const picker=captureNativeRoutePickFrame(host.inspect());
  for(const gate of previousMotors){
   const picked=picker.getStoppedGate(gate.nativeStopped,gate.epoch);
   assert.equal(picked.opening,gate.opening);
   const {wall}=walls.find(({motor})=>motor.gateId===gate.nativeStopped.gateId);
   assert.equal(wall.parts[0].mesh.parent.nativeGpuGate.sampleOpening(gate.epoch),gate.opening);
  }
  if(motors.length){
   await present(motors.slice(1));
   await assert.rejects(f.authority.checkHeldDraw(30,hold,route),/Missing submitted worker route/);
   await present(motors);
   assert(recoveredStoppedGateSamplesMatch((await f.authority.checkHeldDraw(30,hold,route)).stoppedGates,proof));
  }
  await f.attachRecoveredResources(replacement);attached=true;
  assert(f.authority.resumeNativeIntentProduction(hold));
  if(task){
   const successor=()=>f.records.find(record=>record.kind==='task-start'&&record.committed);
   await untilProduction(f,successor);
   assert.equal(successor().resources.bodyId,1);
   assert(successor().resources.worldBoundary.ticket>task.resources.worldBoundary.ticket);
  }
  const resumed=f.advance(.025);
  assert(resumed.elapsed>at);
  assert.equal(resumed.workers[0].id,worker.id);
  assert.deepEqual(f.faults,[]);
 }finally{
  admission?.dispose();
  for(const {wall,prototype} of walls){wall.dispose();prototype.material.dispose();prototype.geometry.dispose();}
  rig?.close();
  if(!attached){replacement.client.dispose();await replacement.host.dispose();}
  if(!attached){ports.port1.close();ports.port2.close();}
 }
}

test('the ordinary Home18 checkpoint reacquires the same gate opening and reproduces the crossing',async()=>{
 const source=await gateRouteAuthority(true,{nativeWorkerLifecycle:true});
 const gateId='structure-1000000';
 const leaf=state=>state.structures.find(s=>s.id===gateId);
 const pose=({x,z,heading,runPhase,walkPhase,carryPhase,runRemaining})=>[x,z,heading,runPhase,walkPhase,carryPhase,runRemaining];
 let saved,firstEpoch;
 try{
  await untilProduction(source,()=>source.records.some(row=>row.kind==='home-route'&&row.committed));
  const home=source.records.find(row=>row.kind==='home-route'&&row.committed);
  firstEpoch=home.resources.worldBoundary.authorityEpoch;
  assert.equal(home.resources.gates[0].gateId,1000000);
  for(let i=0;i<100;i++){
   const active=source.advance(.025);
   await source.present();
   if(leaf(active).gateOpen>.2&&leaf(active).gateOpen<.65)break;
  }
  const active=source.snapshot();
  assert(leaf(active).gateOpen>.2&&leaf(active).gateOpen<.65);
  assert.equal(active.workers[0].nativeRouteAdmission,'native-home');
  assert.equal(active.workers[0].gateWaiting,true);
  assert(active.workers[0].z<leaf(active).z);
  const result=source.command({kind:'snapshot',nativeAuthorityCheckpoint:true,visualTerrain:true});
  const stored=prepareWorkerCheckpoint(await result,{slotId:active.slotId,policy:{nativeAuthority:true},savedAt:0});
  assert(stored.saved);
  assert.equal(stored.state.workerNativeAuthorityCheckpoint.workerLifecycle,1);
  assert.deepEqual(pose(stored.state.workers[0]),pose(active.workers[0]));
  assert.equal(leaf(stored.state).gateOpen,leaf(active).gateOpen);
  saved=stored.state;
 }finally{await source.close();}
 const forged=structuredClone(saved);
 forged.workers[0].nativeRouteAdmission='pending-home-resources';
 await assert.rejects(nativeProductionAuthority(forged,savedNativeAuthorityOptions(serialize(forged))),/Invalid native Home restoration state/);
 async function replay(){
  let release;
  const held=new Promise(resolve=>{release=resolve;});
  const restored=await nativeProductionAuthority(saved,{...savedNativeAuthorityOptions(serialize(saved)),onReady:row=>row.kind==='home-route'?held:undefined});
  try{
   await untilProduction(restored,()=>restored.records.some(row=>row.kind==='home-route'&&row.packet));
   const home=restored.records.find(row=>row.kind==='home-route');
   assert.notEqual(home.resources.worldBoundary.authorityEpoch,firstEpoch);
   assert.equal(home.committed,false);
   const cold=restored.snapshot(),from=saved.workers[0];
   assert.deepEqual(pose(cold.workers[0]),pose(from));
   assert.equal(cold.workers[0].nativeRouteAdmission,'pending-home-resources');
   assert.equal(cold.workers[0].gateWaiting,false);
   assert.equal(leaf(cold).gateOpen,leaf(saved).gateOpen);
   assert.equal(home.resources.gates[0].gateId,1000000);
   release();
   await untilProduction(restored,()=>home.committed);
   await restored.present();
   await home.packet.presented;
   const first=restored.host.inspect().nativeRouteFrame;
   assert(first.bindings.some(b=>b.nativeHome?.actorId===900011));
   assert(first.bindings.some(b=>b.nativeGate?.gateId===1000000));
   const samples=[];
   for(let i=0;i<380;i++){
    const state=restored.advance(.05);
    await restored.present();
    const worker=state.workers[0];
    samples.push([state.elapsed,leaf(state).gateOpen,...pose(worker)]);
    if(worker.status==='home'&&restored.records.some(row=>row.kind==='home-arrival'&&row.committed))break;
   }
   const final=restored.snapshot();
   assert.equal(final.workers[0].status,'home');
   assert.equal(final.workers[0].id,from.id);
   assert.deepEqual([final.workers[0].x,final.workers[0].z],[-14,11.8]);
   assert.deepEqual(final.ledger,saved.ledger);
   assert.equal(restored.records.filter(row=>row.kind==='home-arrival'&&row.committed).length,1);
   assert.deepEqual(restored.faults,[]);
   return samples;
  }finally{release();await restored.close();}
 }
 assert.deepEqual(await replay(),await replay());
});

for(const [routeKind,home] of [['farm-arrival',false],['home-route',true]])for(const index of [0,1])
test(`the ordinary ${routeKind} disk checkpoint resumes while opening gate ${index+1} of two`,async t=>{
 const ids=home?[1000001,1000000]:[1000000,1000001];
 const leaf=(state,id)=>state.structures.find(gate=>gate.id===`structure-${id}`);
 const openings=state=>ids.map(id=>leaf(state,id).gateOpen);
 const pose=w=>[w.id,w.x,w.z,w.heading,w.runPhase,w.walkPhase,w.carryPhase,w.runRemaining];
 const moving='native-'+(home?'home':'farm-arrival'),pending=home?'pending-home-resources':'pending-farm-arrival-resources';
 const source=await gateRouteAuthority(home,{nativeWorkerLifecycle:true,configure:addSecondGate,drawFarmGate:true});
 let saved,originEpoch,release,held;
 const ready=new Promise(resolve=>{release=resolve;});
 try{
  await untilProduction(source,()=>source.records.some(row=>row.kind===routeKind&&row.committed));
  const acquired=source.records.find(row=>row.kind===routeKind&&row.committed);
  originEpoch=acquired.resources.worldBoundary.authorityEpoch;
  assert.deepEqual(acquired.resources.gates.map(gate=>gate.gateId),ids);
  for(let i=0;i<240;i++){
   const state=source.advance(.025);await source.present();
   const opening=leaf(state,ids[index]).gateOpen;
   if(state.workers[0].nativeRouteAdmission!==moving||!(opening>.2&&opening<.6))continue;
   const result=source.command({kind:'snapshot',visualTerrain:true,nativeAuthorityCheckpoint:true});
   const disk=prepareWorkerCheckpoint(await result,{slotId:state.slotId,policy:{nativeAuthority:true},savedAt:0});
   assert(disk.saved,'The active gate checkpoint must be publicly saveable');
   assert.deepEqual(pose(disk.state.workers[0]),pose(state.workers[0]));
   assert.deepEqual(openings(disk.state),openings(state));
   // The second motor starts before the actor crosses the first leaf.
   assert(home?state.workers[0].z<leaf(state,ids[0]).z:state.workers[0].z>leaf(state,ids[0]).z);
   saved=disk.state;break;
  }
  assert(saved,'Expected a checkpoint on the selected partial opening');
 }finally{await source.close();}

 const options=savedNativeAuthorityOptions(serialize(saved));
 const restored=await nativeProductionAuthority(saved,{...options,drawFarmGate:true,onReady(row){
  if(row.kind===routeKind&&!held){held=row;return ready;}
 }});
 try{
  assert(restored.authority.verifyNativeBootstrap(options.nativeBootstrap));
  await untilProduction(restored,()=>held?.packet);
  assert.equal(held.committed,false);
  let staged=restored.snapshot();
  assert.equal(staged.workers[0].nativeRouteAdmission,pending);
  assert.deepEqual(pose(staged.workers[0]),pose(saved.workers[0]));
  assert.deepEqual(openings(staged),openings(saved));
  assert.notEqual(held.resources.worldBoundary.authorityEpoch,originEpoch);
  assert.deepEqual(new Set(held.resources.gates.map(gate=>gate.gateId)),new Set(ids));
  for(let i=0;i<3;i++){
   staged=restored.advance(.025);await restored.present();
   assert.deepEqual(pose(staged.workers[0]),pose(saved.workers[0]));
   assert.deepEqual(openings(staged),openings(saved));
  }
  release();
  await untilProduction(restored,()=>restored.records.some(r=>r.kind===routeKind&&r.committed));
  const acquired=restored.records.find(r=>r.kind===routeKind&&r.committed);
  await restored.present();await acquired.packet.presented;
  const draw=restored.host.inspect().nativeRouteFrame;
  assert.deepEqual(draw.bindings.filter(row=>row.nativeGate).map(row=>row.nativeGate.gateId).sort(),[...ids].sort());
  let final;
  let z=saved.workers[0].z;
  for(let i=0;i<320;i++){
   final=restored.advance(.05);await restored.present();
   const next=final.workers[0].z;
   assert(home?next>=z-1e-6:next<=z+1e-6,'A restored route must not send the worker back through a portal entrance');
   z=next;
   if(home?final.workers[0].status==='home':final.workers[0].nativeRouteAdmission==='native-idle')break;
  }
  assert.equal(final.workers[0].status,home?'home':'idle');
  assert.equal(final.workers[0].id,saved.workers[0].id);
  assert.deepEqual(final.ledger,saved.ledger);
  assert.deepEqual(restored.faults,[]);
  t.diagnostic(JSON.stringify({saved:saved.elapsed,restored:staged.elapsed,openings:openings(saved),ids:acquired.resources.gates.map(gate=>gate.gateId),end:final.elapsed}));
 }finally{release();await restored.close();}
});

for(const [kind,routeKind,marker,clockField,bindingField,capability] of [
 [23,'farm-arrival','native-farm-arrival','nativeFarmArrival','nativeFarmArrivalBinding','nativeFarmArrivalVersion'],
 [18,'home-route','native-home','nativeHome','nativeHomeRouteBinding','nativeHomeRouteVersion']
])for(const count of [1,2])for(const mode of ['exact','missing','earlier ticket'])test(`recovered ${routeKind} requires ${count} actual gate clocks (${mode})`,async t=>{
 const f=await gateRouteAuthority(kind===18,count===2?{configure:addSecondGate}:{}),ports=new MessageChannel();
 const walls=[];
 let draw,rig,admission,reattached=false;
 try{
  await untilProduction(f,()=>f.records.some(row=>row.kind===routeKind&&row.committed));
  let view,wall;
  for(let i=0;i<100;i++){
    view=f.advance(.025);await f.present();
    wall=view.structures.find(g=>g.gate&&g.gateOpen>.2&&g.gateOpen<.65);
    if(wall)break;
  }
  assert(wall,'The test must destroy Draw while a gate is opening');
  assert.equal(view.workers[0].nativeRouteAdmission,marker);
  const originalBinding=f.host.inspect().nativeRouteFrame.bindings.find(b=>b[clockField]?.actorId===900011);
  assert(originalBinding?.relativeTime>0);
  const acquired=f.records.find(row=>row.kind===routeKind&&row.committed);
  const ids=acquired.resources.gates.map(gate=>gate.gateId);
  assert.deepEqual(new Set(ids),new Set(count===1?[1000000]:[1000000,1000001]));
  f.gpu.device.destroy();f.retireResourceEndpoint();
  const receipt=await f.authority.quiesceNativeIntentProduction();
  const retired=await f.authority.flushNativeResourcePreparation({allowRetired:true});
  const route=await f.authority.terminalWorkerRoute();
  assert.equal(retired.terminal,true);
  assert.deepEqual(route,{kind,actorId:900011},'The terminal owner must include the already moving native gate');
  const capabilities={[capability]:1};
  draw=await fixture({capabilities},{intentControl:{port:ports.port2,session:'production-control',recoveryHold:30}});
  const {recoveredWorkerRoute:q}=await f.authority.attachHeldWorkerRoute(ports.port1,'production-control',30,receipt,route);
  const ref=q.resources[bindingField].reference,boundary=ref.worldBoundary,epoch=boundary.effectiveTime,at=q.execution.executedThrough;
  assert.deepEqual(q.resources.presentation.gates.map(g=>g.gateId),ids);
  const expectAge=floorFloat32(at-epoch),resourceEnd=nativeClockResourceEnd(epoch,ref.endTime);
  draw.client.registerClockBinding(draw.buffer,{byteOffset:0,epoch,semantic:'relative',[clockField]:ref,resourceEnd});
  const controlOnly=await f.authority.checkHeldDraw(30,receipt,route).catch(error=>error);
  assert.match(controlOnly.message,/Missing submitted/);
  const badMode=mode==='exact'?null:mode;
  for(const [i,gateId] of ids.entries()){
   if(badMode==='missing'&&i===ids.length-1)continue;
   draw.client.registerClockBinding(draw.buffer,{byteOffset:4*(i+1),epoch,semantic:'relative',resourceEnd,
     nativeGate:{gateId,worldBoundary:badMode==='earlier ticket'&&i===ids.length-1?
        q.resources[bindingField].preparedReference.worldBoundary:boundary}});
  }
  if(!badMode){
   const payloads=new Map();f.authority.publishResidentTerrainForQa(p=>payloads.set(p.cx+','+p.cz,p));
   let selected;
   const actor=view.workers[0],session={core:{selectChunk(x,z){selected=payloads.get(x+','+z);assert(selected);},chunkPayload:()=>selected}};
   let idleRequests=0;
   rig=await nativeWorkerGraphicsFixture({state:view,worker:actor,actor:actor.id,session,close(){}},
    {clips:['Walk_Skip','Idle'],idle:true,beforeBake(clip){
     if(clip==='Idle'&&idleRequests++===0)throw new DOMException('Deferred standalone Idle variant','AbortError');
    }});
   const rigActor=rig.roster.get(actor.id);
   assert.equal(actor.gateWaiting,true);
   assert.equal(rigActor.hasBakedWalking(),true);
   assert.equal(rigActor.isBakedWalking(),false);
   assert.equal(rigActor.isBakedIdle(),false);
   const renderer={...rig.renderer,compileAsync:async()=>{}};
   admission=createWebGpuPipelineAdmission({renderer,scene:rig.scene,camera:new PerspectiveCamera()});
   rig.admission.prepareManyAndPublish=admission.prepareManyAndPublish.bind(admission);
   const participants=q.resources.presentation.gates.map(({nativeRoute,...geometry})=>{
    const wall=view.structures.find(row=>row.id===`structure-${geometry.gateId}`);
    const prototype=gateMeshPrototype(wall.material);prototype.material.dispose();
    prototype.material=new MeshStandardNodeMaterial({side:DoubleSide});
    const wallMesh=new NativeWall({[wall.material+'_puerta']:prototype},wall,at);
    const parent=new Group(),motor={...geometry,worldBoundary:boundary};
    new Matrix4().fromArray(motor.rootMatrix).decompose(parent.position,parent.quaternion,parent.scale);
    parent.scale.divide(wallMesh.scale);parent.add(wallMesh);rig.scene.add(parent);
    const motion=createNativeGateGpuClock(motor);
    const binding=createNativeGateGpuBinding({wall:wallMesh,presentation:motor,motion,getPickTime:()=>epoch+expectAge});
    walls.push({binding,wallMesh,prototype,wall});
    return {request:{object:wallMesh,options:{include:[binding.mesh],materialAlternatives:binding.materialAlternatives}},
     valid:()=>binding.canActivate(),activate:()=>binding.activate(),
     finalize:()=>binding.commit(),cancel:()=>binding.dispose()};
   });
   await rig.roster.prepareRecoveredWorkerRoute({...q,terrain:rig.terrain,terrainManifest:rig.manifest},
    {signal:new AbortController().signal,isCurrent:()=>true,getPickTime:()=>epoch+expectAge,
     getPickIdleOffset:()=>0,prepareGateParticipants:()=>participants});
   assert(rig.roster.nativeRouteCurrent(actor.id,q.resources.nativeRoute));
   for(const {wallMesh,binding,wall} of walls){
    assert.equal(wallMesh.nativeGpuGate,binding);
    assert(Math.abs(binding.sampleOpening(epoch+expectAge)-wall.gateOpen)<2e-6);
   }
  }
  const frame=draw.frame(3,{nativeWorldBoundary:boundary,
     clock:{version:1,epoch:1,elapsed:at,safeUntil:at,anchorAbsoluteMs:0,paused:true,segments:[]}}).catch(error=>error);
  await flush();await draw.host.idle();draw.host.present();
  const rendered=await frame;
  if(badMode){
   assert.match(rendered.message,/Replacement requires its bound worker clock/);
   await assert.rejects(f.authority.checkHeldDraw(30,receipt,route),/Missing submitted/);
  }else{
   const held=await f.authority.checkHeldDraw(30,receipt,route);
   assert.equal(held.relativeTime,expectAge);
   const samples=held.nativeGates??[held];
   assert.deepEqual(samples.map(sample=>sample.nativeGate.gateId),ids);
   assert.deepEqual(samples.map(sample=>sample.gateElapsed),ids.map(()=>epoch+expectAge));
   assert.deepEqual(Array.from(new Float32Array(draw.gpu.buffers[0].data.buffer).slice(1,count+1)),ids.map(()=>expectAge));
   const next=draw.frame(4,{nativeWorldBoundary:boundary,
     clock:{version:1,epoch:1,elapsed:at,safeUntil:at,anchorAbsoluteMs:0,paused:true,segments:[]}});
   await flush();await draw.host.idle();draw.host.present();await next;
   assert.deepEqual(await f.authority.checkHeldDraw(30,receipt,route),held);
   assert.equal(draw.host.inspect().nativeRouteFrame.sequence,2);
   if(count===2){
    const clock={version:1,epoch:1,elapsed:at,safeUntil:at,anchorAbsoluteMs:0,paused:true,segments:[]};
    const last={byteOffset:8,epoch,semantic:'relative',resourceEnd};
    const present=async value=>{
     const packet=draw.frame(value,{nativeWorldBoundary:boundary,clock});
     await flush();await draw.host.idle();draw.host.present();await packet;
    };
    draw.client.registerClockBinding(draw.buffer,last);
    await present(5);
    await assert.rejects(f.authority.checkHeldDraw(30,receipt,route),/Missing submitted/);
    draw.client.registerClockBinding(draw.buffer,{...last,nativeGate:{gateId:ids.at(-1),worldBoundary:boundary}});
    await present(6);
    assert.deepEqual(await f.authority.checkHeldDraw(30,receipt,route),held);
    await f.attachRecoveredResources(draw);reattached=true;
    assert.equal(f.authority.resumeNativeIntentProduction(receipt),true);
    const restarted=f.advance(.025);
    assert(restarted.elapsed>at);
    assert.equal(restarted.workers[0].nativeRouteAdmission,marker);
    assert(restarted.structures.some(gate=>gate.id===wall.id&&gate.gateOpen>wall.gateOpen));
   }
   t.diagnostic(JSON.stringify({at,opening:wall.gateOpen,bodyId:ref.bodyId,ids,age:held.relativeTime}));
  }
 }finally{
  admission?.dispose();for(const {binding,wallMesh,prototype} of walls){binding.dispose();wallMesh.dispose();prototype.material.dispose();}
  rig?.close();
  if(!reattached){draw?.client.dispose();await draw?.host.dispose();}
  ports.port1.close();ports.port2.close();await f.close();
 }
});
