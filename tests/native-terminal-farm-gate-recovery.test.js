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

test('Stop24 draws its acquired motor even when the next Task has already requested the stopped worker',async()=>{
 let ready,release,commit;
 const held=new Promise(resolve=>{release=resolve;});
 const f=await gateRouteAuthority(false,{
  configure(state,worker){
   const crop=createPlant('plant-'+state.nextId++,'mijo',-10.6,5.3,worker.centerId);
   crop.growth=cropSpec(crop.species).growth_seconds-.5;
   for(const water of crop.water)water.status='manual';
   state.plants.push(crop);
  },
  onReady(record){if(record.kind==='farm-arrival-stop'){ready=record;return held;}},
  onCommit(record,receipt){if(record.kind==='farm-arrival-stop')commit=receipt;},
 });
 try{
  await untilProduction(f,()=>f.records.some(r=>r.kind==='farm-arrival'&&r.committed));
  const advance=async()=>{const state=f.advance(.025);await f.present();return state;};
  for(let i=0;i<30&&!ready;i++)await advance();
  assert(ready?.packet,'Expected the crop to mature during opening');
  const before=ready.resources.gateEffects.rows;
  assert.deepEqual(Array.from(before.slice(0,2)),[1000000,1]);
  assert(before[2]>.2&&before[2]<.3);
  const waiting=await advance();
  assert(waiting.structures.find(s=>s.gate).gateOpen>before[2]);
  assert.equal(waiting.workers[0].nativeRouteAdmission,'native-farm-arrival');
  assert.equal(ready.committed,false);
  release();
  for(let i=0;i<5&&!commit;i++)await advance();
  assert(commit);
  assert.equal(f.snapshot().workers[0].nativeRouteAdmission,'pending-resources');
  const evidence=commit.nativeFarmArrivalStopBinding;
  const actual=evidence.projection.gateEffects.rows;
  assert.deepEqual(Array.from(actual.slice(0,2)),Array.from(before.slice(0,2)));
  assert(actual[2]>before[2]&&actual[2]<1);
  let submitted;
  ready.packet.presented.then(frame=>{submitted=frame;},()=>{});
  for(let i=0;i<8&&!submitted;i++)await f.present();
  assert(submitted,'The stopped worker and motor must submit together');
  const frame=f.host.inspect().nativeRouteFrame;
  assert.equal(frame.sequence,submitted.sequence);
  assert.deepEqual(frame.worldBoundary,commit.worldBoundary);
  const body=frame.bindings.find(b=>b.nativeStopped?.kind==='native-farm-arrival-stopped-body');
  const motor=frame.bindings.find(b=>b.nativeStopped?.kind==='native-farm-arrival-stopped-gate');
  assert.equal(body?.bodyReference.bodyId,1);
  assert.equal(motor?.nativeStopped.gateId,actual[0]);
  assert.equal(motor?.nativeStopped.mechanism,actual[1]);
  assert.equal(motor?.opening,Math.fround(actual[2]));
  assert.deepEqual(f.faults,[]);
 }finally{release();await f.close();}
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

for(const [kind,routeKind,marker,clockField,bindingField,capability] of [
 [23,'farm-arrival','native-farm-arrival','nativeFarmArrival','nativeFarmArrivalBinding','nativeFarmArrivalVersion'],
 [18,'home-route','native-home','nativeHome','nativeHomeRouteBinding','nativeHomeRouteVersion']
])for(const mode of ['exact','missing','earlier ticket'])test(`recovered ${routeKind} requires the actual gate clock (${mode})`,async t=>{
 const f=await gateRouteAuthority(kind===18),ports=new MessageChannel();
 let draw,rig,binding,wallMesh,prototype,admission;
 try{
  await untilProduction(f,()=>f.records.some(row=>row.kind===routeKind&&row.committed));
  let view,wall;
  for(let i=0;i<100;i++){
    view=f.advance(.025);await f.present();
    wall=view.structures.find(g=>g.id==='structure-1000000');
    if(wall.gateOpen>.2&&wall.gateOpen<.65)break;
  }
  assert(wall.gateOpen>.2&&wall.gateOpen<.65);
  assert.equal(view.workers[0].nativeRouteAdmission,marker);
  const originalBinding=f.host.inspect().nativeRouteFrame.bindings.find(b=>b[clockField]?.actorId===900011);
  assert(originalBinding?.relativeTime>0);
  const acquired=f.records.find(row=>row.kind===routeKind&&row.committed);
  assert.equal(acquired.resources.gates.length,1);
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
  assert.equal(q.resources.presentation.gates.length,1);
  assert.equal(q.resources.presentation.gates[0].gateId,1000000);
  const expectAge=floorFloat32(at-epoch),resourceEnd=nativeClockResourceEnd(epoch,ref.endTime);
  draw.client.registerClockBinding(draw.buffer,{byteOffset:0,epoch,semantic:'relative',[clockField]:ref,resourceEnd});
  const controlOnly=await f.authority.checkHeldDraw(30,receipt,route).catch(error=>error);
  assert.match(controlOnly.message,/Missing submitted/);
  const badMode=mode==='exact'?null:mode;
  if(badMode!=='missing'){
   draw.client.registerClockBinding(draw.buffer,{byteOffset:4,epoch,semantic:'relative',resourceEnd,
     nativeGate:{gateId:1000000,worldBoundary:badMode==='earlier ticket'?
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
   prototype=gateMeshPrototype(wall.material);prototype.material.dispose();
   prototype.material=new MeshStandardNodeMaterial({side:DoubleSide});
   wallMesh=new NativeWall({[wall.material+'_puerta']:prototype},wall,at);
   const parent=new Group(),{nativeRoute,...geometry}=q.resources.presentation.gates[0],motor={...geometry,worldBoundary:boundary};
   new Matrix4().fromArray(motor.rootMatrix).decompose(parent.position,parent.quaternion,parent.scale);
   parent.scale.divide(wallMesh.scale);parent.add(wallMesh);rig.scene.add(parent);
   const motion=createNativeGateGpuClock(motor);
   binding=createNativeGateGpuBinding({wall:wallMesh,presentation:motor,motion,getPickTime:()=>epoch+expectAge});
   const participant={request:{object:wallMesh,options:{include:[binding.mesh],materialAlternatives:binding.materialAlternatives}},
    valid:()=>binding.canActivate(),activate:()=>binding.activate(),
     finalize:()=>binding.commit(),cancel:()=>binding.dispose()};
   await rig.roster.prepareRecoveredWorkerRoute({...q,terrain:rig.terrain,terrainManifest:rig.manifest},
    {signal:new AbortController().signal,isCurrent:()=>true,getPickTime:()=>epoch+expectAge,
     getPickIdleOffset:()=>0,prepareGateParticipants:()=>[participant]});
   assert(rig.roster.nativeRouteCurrent(actor.id,q.resources.nativeRoute));
   assert.equal(wallMesh.nativeGpuGate,binding);
   assert(Math.abs(binding.sampleOpening(epoch+expectAge)-wall.gateOpen)<2e-6);
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
   assert.equal(held.gateElapsed,epoch+expectAge);
   assert.equal(held.nativeGate.gateId,1000000);
   assert.equal(new Float32Array(draw.gpu.buffers[0].data.buffer)[1],expectAge);
   const next=draw.frame(4,{nativeWorldBoundary:boundary,
     clock:{version:1,epoch:1,elapsed:at,safeUntil:at,anchorAbsoluteMs:0,paused:true,segments:[]}});
   await flush();await draw.host.idle();draw.host.present();await next;
   assert.deepEqual(await f.authority.checkHeldDraw(30,receipt,route),held);
   assert.equal(draw.host.inspect().nativeRouteFrame.sequence,2);
   t.diagnostic(JSON.stringify({at,opening:wall.gateOpen,bodyId:ref.bodyId,gateId:held.nativeGate.gateId,age:held.relativeTime}));
  }
 }finally{
  admission?.dispose();binding?.dispose();wallMesh?.dispose();prototype?.material.dispose();rig?.close();
  draw?.client.dispose();await draw?.host.dispose();ports?.port1.close();ports?.port2.close();await f.close();
 }
});
