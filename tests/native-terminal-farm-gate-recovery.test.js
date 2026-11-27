import assert from 'node:assert/strict';
import test from 'node:test';
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
 }finally{releaseStop();releaseTask();await f.close();}
});

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
