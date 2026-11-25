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

async function gateRouteAuthority(home){
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
 const chunkKeys=[...Array.from({length:9},(_,i)=>[i%3-1,Math.floor(i/3)-1].join(',')),'2,-1','2,0','2,1'];
 return nativeProductionAuthority(state,{chunkKeys});
}

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
