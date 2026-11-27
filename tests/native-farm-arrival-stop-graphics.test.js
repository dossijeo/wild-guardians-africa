import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,PerspectiveCamera,Vector3} from 'three';
import {WebGPURenderer,NodeMaterial} from 'three/webgpu';
import {vec4} from 'three/tsl';
import Renderer from '../node_modules/three/src/renderers/common/Renderer.js';
import {nativeFarmArrivalStopGraphicsFixture as fixture} from './helpers/native-farm-arrival-stop-graphics.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {createWebGpuPicker} from '../src/rendering/webgpu-picker.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';

function meshes(root){const out=[];root.traverse(mesh=>{if(mesh.isMesh&&!mesh.userData.wgCpuPickProxy)out.push({mesh,geometry:mesh.geometry,index:mesh.geometry.index,material:mesh.material,visible:mesh.visible});});return out;}
const owned=f=>f.registry.status().owned.filter(r=>r.namespace==='native-gpu-motion');
function adopt(f,parts){const proof=f.commitStop();for(const p of parts){assert(p.acceptNativeStopBinding(proof));p.activate();p.attach();const release=p.finalize();release.retire();release.notify();}f.projectHeld();f.submit();f.flush();}

for(const profile of PROFILES)for(const urgent of [false,true])test(`${profile.id} ${urgent?'Run':'Walk'} Farm stop retains its original actor, geometry, motion texture and native source`,async()=>{
 const f=await fixture({profile:profile.id,urgent});try{const actor=f.roster.get(f.actor),root=actor.root,anchor=root.position.clone(),before=meshes(root),resources=owned(f),body=f.body(1),task=f.body(3);assert.equal(f.acquires,1);const {parts}=await f.prepare();assert.equal(parts.length,1);assert.deepEqual(owned(f),resources);assert.deepEqual(f.body(1),body);assert.equal(f.worker.idleState,null);f.advance(.2);f.sync();assert(parts[0].valid());assert.notDeepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),task);parts[0].capturePresentation(()=>{});adopt(f,parts);assert.equal(f.roster.get(f.actor),actor);assert.equal(actor.root,root);assert(root.position.equals(anchor));assert.deepEqual(owned(f),resources);assert.equal(f.acquires,1);assert.equal(f.worker.status,'arriving');assert.equal(f.worker.nativeRouteAdmission,'native-farm-arrival-held');assert.equal(f.worker.idleState,null);assert.equal(f.worker.taskId,null);assert.equal(f.worker.running,false);for(const v of before){assert.equal(v.mesh.geometry,v.geometry);assert.equal(v.mesh.geometry.index,v.index);}const stopped=f.body(1);for(const dt of [.3,.8]){f.advance(dt);f.sync();f.submit();const restore=actor.preparePick();restore();assert.deepEqual(f.body(1),stopped);assert(f.roster.nativeRouteLease());assert(root.position.equals(anchor));}assert.deepEqual(f.errors,[]);}finally{f.close();}
});

for(const mode of ['current','detached','inplace'])for(const beforeProof of [false,true])test(`Farm held mirror can adopt from ${mode} confirmed entity ${beforeProof?'before':'after'} final receipt without changing policy`,async()=>{
 const f=await fixture({urgent:true});try{const {parts}=await f.prepare();f.advance(.2);if(mode==='current')f.sync();else{if(mode==='detached')f.state.workers=[structuredClone(f.worker)];else Object.assign(f.state.workers[0],structuredClone(f.worker));f.state.elapsed=f.nativeState.elapsed;}assert(parts[0].valid());const proof=f.commitStop();if(!beforeProof)parts[0].acceptNativeStopBinding(proof);assert(f.planner.projectNativeFarmArrivalExecution(f.nativeState,f.worker));f.sync();if(beforeProof){assert.equal(parts[0].valid(),false,'held marker alone cannot attest a pose');const bad=structuredClone(proof);bad.preparedReference.worldBoundary.ticket++;assert.throws(()=>parts[0].acceptNativeStopBinding(bad));assert.equal(parts[0].valid(),false,'rejected receipt must leave the candidate unchanged');assert(parts[0].acceptNativeStopBinding(proof));}assert(parts[0].valid());for(const key of ['x','z','heading','runPhase','walkPhase','carryPhase','runRemaining']){const old=f.state.workers[0][key];f.state.workers[0][key]+=.01;f.roster.sync();assert.equal(parts[0].valid(),false,key);f.state.workers[0][key]=old;f.roster.sync();assert(parts[0].valid());}parts[0].activate();parts[0].attach();const release=parts[0].finalize();release.retire();release.notify();f.submit();f.flush();assert.equal(f.acquires,1);assert.deepEqual(f.errors,[]);}finally{f.close();}
});

test('Farm stop cancellation and rollback retain original materials and the moving native owner',async()=>{
 for(const attached of [false,true]){const f=await fixture();try{const before=meshes(f.roster.get(f.actor).root),resources=owned(f),body=f.body(1),{parts}=await f.prepare(),p=parts[0];p.activate();if(attached)p.attach();assert(p.cancel());f.flush();for(const v of before){assert.equal(v.mesh.material,v.material);assert.equal(v.mesh.visible,v.visible);assert.equal(v.mesh.geometry,v.geometry);}assert.deepEqual(owned(f),resources);assert.deepEqual(f.body(1),body);assert.equal(f.worker.nativeRouteAdmission,'native-farm-arrival');assert.equal(f.planner.nativeFarmArrivalHeldExecution(f.nativeActor),null);assert.equal(f.acquires,1);}finally{f.close();}}
});

test('Farm stop rejects mixed families, foreign source, missing projection and foreign final proof',async()=>{
 const f=await fixture();try{const resources=owned(f),template=f.preparedStop.proposal.nativeStop;await assert.rejects(f.prepare({nativeIdleStrollStopTemplate:template}),/mixes source families/);const foreign=structuredClone(template);foreign.sourceRoute.actorId++;foreign.routes[0].nativeRoute.actorId++;await assert.rejects(f.prepare({nativeFarmArrivalStopTemplate:foreign}));assert.deepEqual(owned(f),resources);const {parts}=await f.prepare(),p=parts[0];f.advance(.2);f.sync();const proof=f.commitStop(),noProjection={...proof};delete noProjection.projection;assert.throws(()=>p.acceptNativeStopBinding(noProjection),/final source/);assert.throws(()=>p.acceptNativeStopBinding({...proof,kind:'native-idle-stroll-stop-attestation'}));const bad=structuredClone(proof);bad.preparedReference.worldBoundary.ticket++;assert.throws(()=>p.acceptNativeStopBinding(bad));assert(p.acceptNativeStopBinding(proof));p.activate();p.attach();const release=p.finalize();release.retire();release.notify();f.projectHeld();f.submit();f.flush();assert.deepEqual(owned(f),resources);assert.equal(f.acquires,1);}finally{f.close();}
});

test('Farm stop preparation is revoked by semantic center, contract, task or model ownership changes',async()=>{
 for(const field of ['centerId','contractDay','taskId','status','remove']){const f=await fixture();try{const {parts}=await f.prepare(),p=parts[0];if(field==='remove')f.state.workers=[];else if(field==='status')f.state.workers[0].status='returning';else if(field==='contractDay')f.state.workers[0].contractDay=999;else f.state.workers[0][field]='foreign-99999';f.roster.sync();assert.equal(p.valid(),false,field);assert.throws(()=>p.activate());p.cancel();f.flush();assert.equal(f.acquires,1);}finally{f.close();}}
});

test('stopped original Farm skinning carries typed24 values through real color and shadow compilation',async()=>{
 const f=await fixture({urgent:true}),gpu=new WebGPURenderer({canvas:{width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}}});gpu.hasFeature=()=>true;
 try{const {parts}=await f.prepare();let tags=0;for(const {mesh,material} of parts[0].materialAlternatives){const previous=mesh.material;try{const moving=gpu.backend.createNodeBuilder(mesh,gpu);moving.scene=f.scene;moving.camera=new PerspectiveCamera();moving.build();const originalTextures=moving.getBindings().flatMap(g=>g.bindings??[]).filter(b=>b.isSampledTexture).map(b=>({texture:b.texture,data:b.texture.image?.data,version:b.texture.version}));assert(originalTextures.length>0);mesh.material=material;const builder=gpu.backend.createNodeBuilder(mesh,gpu);builder.scene=f.scene;builder.camera=new PerspectiveCamera();builder.build();assert.match(builder.vertexShader,/textureLoad/);const stoppedTextures=builder.getBindings().flatMap(g=>g.bindings??[]).filter(b=>b.isSampledTexture).map(b=>b.texture);for(const old of originalTextures){assert(stoppedTextures.includes(old.texture));assert.equal(old.texture.image?.data,old.data);assert.equal(old.texture.version,old.version);}for(const group of builder.getBindings())for(const b of group.bindings??[])for(const u of b.uniforms??[]){const tag=u.nodeUniform?.node?.[Symbol.for('wild-guardians.remote-clock')];if(tag?.nativeStopped){tags++;assert.equal(tag.nativeStopped.kind,'native-farm-arrival-stopped-body');assert.deepEqual(tag.nativeStopped.stop,f.preparedStop.proposal.nativeStop);assert.equal(tag.nativeFarmArrival,undefined);assert.equal(tag.nativeStroll,undefined);}}const scene=new Scene(),shadow=new NodeMaterial();shadow.isShadowPassMaterial=true;shadow.colorNode=vec4(0,0,0,1);scene.overrideMaterial=shadow;let seen=false;Renderer.prototype.renderObject.call({_handleObjectFunction(object,selected){seen=true;assert.equal(selected.positionNode,material.positionNode);const saved=object.material;try{object.material=selected;const pass=gpu.backend.createNodeBuilder(object,gpu);pass.scene=scene;pass.camera=new PerspectiveCamera();pass.build();assert.match(pass.vertexShader,/textureLoad/);}finally{object.material=saved;}}},mesh,scene,{},mesh.geometry,material,null,null);assert(seen);}finally{mesh.material=previous;}}assert(tags>0);assert.equal(f.acquires,1);assert.deepEqual(f.errors,[]);}finally{f.close();}
});

test('ordinary picking keeps the stopped original Farm body while its Idle clip clock advances',async()=>{
 const f=await fixture({urgent:true});try{const {parts}=await f.prepare();f.advance(.2);f.sync();adopt(f,parts);const actor=f.roster.get(f.actor),anchor=actor.root.position.clone(),camera=new PerspectiveCamera(45,1,.1,100),picker=createWebGpuPicker({scene:f.scene,camera,state:f.state,animals:{get:()=>null},workers:f.roster,cropBounds:()=>[]});for(const dt of [0,.5,1]){f.advance(dt);f.sync();f.submit();const pose=f.body(1),y=f.residency.surface(pose.x,pose.z);camera.position.set(pose.x,y+3,pose.z+6);camera.lookAt(pose.x,y+.8,pose.z);camera.updateMatrixWorld(true);let hit=null;for(const height of [.7,1,1.3,.4,1.5]){const point=new Vector3(pose.x,y+height,pose.z).project(camera),result=picker.pick({x:point.x,y:point.y});if(result.entityId===f.actor){hit=result;break;}}assert(hit);assert(actor.root.position.equals(anchor));}assert.equal(f.worker.idleState,null);assert.equal(f.acquires,1);assert.deepEqual(f.errors,[]);}finally{f.close();}
});

test('pthread Farm stop retains the original actor/bank and exact held native source',async()=>{
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),runtime=await createThreadedSpatialWorld(factory);let f;try{f=await fixture({core:runtime.core,urgent:true});const actor=f.roster.get(f.actor),{parts}=await f.prepare();f.advance(.2);f.sync();adopt(f,parts);assert.equal(f.roster.get(f.actor),actor);assert.equal(f.worker.nativeRouteAdmission,'native-farm-arrival-held');assert.equal(f.acquires,1);assert.deepEqual(f.errors,[]);}finally{f?.close();await runtime.dispose();}
});

test('confirmed raid flight keeps the original Farm rig through prepared and acquired Stop24',async()=>{
 const f=await fixture({peer:false});
 try{
  const actor=f.roster.get(f.actor),resources=owned(f),worker=f.worker;
  const raid={id:'raid-'+f.state.day+'-day',daytime:true,animals:[{id:'animal-1000000',species:'warthog'}]};
  const spawn={id:'event-29208',type:'RaidSpawned',simulationTime:f.state.elapsed,
   raidFacts:{id:raid.id,day:f.state.day,elapsed:f.state.elapsed,daytime:true,actors:structuredClone(raid.animals)}};
  Object.assign(worker,{status:'fleeing',nativeRouteAdmission:'pending-farm-flight-stop',idleState:null,destinationId:null,path:null});
  f.state.raid=raid;f.state.events=[];f.sync();
  await assert.rejects(f.prepare(),/changed during preparation/);
  f.state.events=[spawn];
  const {parts}=await f.prepare(),part=parts[0];
  assert(part.valid());
  function rejectsChange(object,key,bad){
   const original=object[key];object[key]=bad;f.sync();assert.equal(part.valid(),false,key);
   object[key]=original;f.sync();assert(part.valid(),key);
  }
  rejectsChange(raid,'id','raid-other');
  rejectsChange(raid.animals[0],'id','animal-99');
  for(const [key,bad] of Object.entries({x:worker.x+.01,contractDay:worker.contractDay+1,taskId:'task-99',villageId:'village-99'}))
   rejectsChange(worker,key,bad);
  const proof=f.commitStop();
  const pose=f.source.pose;
  Object.assign(worker,{nativeRouteAdmission:'pending-raid-flight-resources',x:pose.x,z:pose.z,
   heading:pose.yaw,runPhase:pose.runPhase,walkPhase:pose.walkPhase,carryPhase:pose.carryPhase,
   runRemaining:pose.runRemaining,running:false,gateWaiting:false});f.sync();
  assert.equal(part.valid(),false);
  assert(part.acceptNativeStopBinding(proof));assert(part.valid());
  rejectsChange(worker,'walkPhase',worker.walkPhase+.01);
  part.activate();part.attach();const release=part.finalize();release.retire();release.notify();
  f.submit();f.flush();
  assert.equal(f.roster.get(f.actor),actor);assert.equal(f.acquires,1);assert.deepEqual(owned(f),resources);
  assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});

test('delayed Stop24 stages on the confirmed moving Farm sample and adopts only its final pose',async()=>{
 const f=await fixture({peer:false});
 try{
  const worker=f.worker,spawnTime=f.state.elapsed,rig=f.roster.get(f.actor);
  const animal={id:'animal-22',species:'warthog'},raid={id:'raid-'+f.state.day+'-day',daytime:true,animals:[animal]};
  const spawn={id:'event-45',type:'RaidSpawned',simulationTime:spawnTime,
   raidFacts:{id:raid.id,day:f.state.day,elapsed:spawnTime,daytime:true,actors:[{...animal}]}};
  const initialX=worker.x,initialZ=worker.z;
  f.advance(.2);
  const e=f.planner.nativeFarmArrivalRouteExecution(f.nativeActor);
  assert.notDeepEqual([e.x,e.z],[initialX,initialZ]);
  const sample={at:e.executedThrough,nativeRoute:e.nativeRoute,bodyId:e.bodyId,eventId:45,spawnTime,
   pose:{x:e.x,z:e.z,heading:e.yaw,runPhase:e.runPhase,walkPhase:e.walkPhase,carryPhase:e.carryPhase,
    runRemaining:e.runRemaining,running:e.running,gateWaiting:!e.arrived&&e.currentSpeed===0}};
  Object.assign(worker,sample.pose,{status:'fleeing',nativeRouteAdmission:'pending-farm-flight-stop',
   idleState:null,destinationId:null,path:null});
  f.state.raid=raid;f.state.events=[spawn];f.sync();
  await assert.rejects(f.prepare(),/changed during preparation/);
  worker.nativeFarmFlightSample=sample;f.sync();
  const {parts:[part]}=await f.prepare();
  assert(part.valid());
  for(const other of [{...sample,at:spawnTime},{...sample,eventId:46},{...sample,spawnTime:spawnTime+.01},
   {...sample,bodyId:e.bodyId+1},{...sample,nativeRoute:{...e.nativeRoute,assignmentSequence:e.nativeRoute.assignmentSequence+1}},
   {...sample,nativeRoute:{...e.nativeRoute,routeHandle:{...e.nativeRoute.routeHandle,generation:e.nativeRoute.routeHandle.generation+1}}},
   {...sample,pose:{...sample.pose,walkPhase:sample.pose.walkPhase+.01}},null]){
   worker.nativeFarmFlightSample=other;f.sync();assert.equal(part.valid(),false);
  }
  worker.nativeFarmFlightSample=sample;worker.x+=.01;f.sync();assert.equal(part.valid(),false);
  worker.x=sample.pose.x;f.sync();assert(part.valid());
  const proof=f.commitStop(),{pose}=f.source;
  assert.equal(pose.x,e.x);assert.equal(pose.z,e.z);
  delete worker.nativeFarmFlightSample;
  Object.assign(worker,{nativeRouteAdmission:'pending-raid-flight-resources',running:false,gateWaiting:false});
  f.sync();assert.equal(part.valid(),false);
  assert(part.acceptNativeStopBinding(proof));assert(part.valid());
  worker.walkPhase+=.01;f.sync();assert.equal(part.valid(),false);
  worker.walkPhase=pose.walkPhase;f.sync();
  part.activate();part.attach();const release=part.finalize();release.retire();release.notify();f.submit();f.flush();
  assert.equal(f.roster.get(f.actor),rig);assert.equal(f.acquires,1);assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});

test('a restored Farm rig can stop after the earlier raid birth it actually prepared for',async()=>{
 const animal={id:'animal-22',species:'warthog'};
 let spawn,raid;
 const f=await fixture({peer:false,onFarmSource({state}){
  raid={id:'raid-'+state.day+'-day',daytime:true,animals:[animal]};
  const spawnTime=state.elapsed-.02;
  spawn={id:'event-45',type:'RaidSpawned',simulationTime:spawnTime,
   raidFacts:{id:raid.id,day:state.day,elapsed:spawnTime,daytime:true,actors:[{...animal}]}};
  state.raid=raid;state.events=[spawn];
  Object.assign(state.workers[0],{status:'fleeing',nativeRouteAdmission:'pending-farm-flight-restore',
   idleState:null,destinationId:null,path:null,running:false,gateWaiting:false});
 }});
 try{
  const {worker}=f,rig=f.roster.get(f.actor),motion=f.planner.nativeFarmArrivalRouteExecution(f.nativeActor);
  assert(spawn.simulationTime<motion.binding.reference.worldBoundary.effectiveTime);
  const pose={x:motion.x,z:motion.z,heading:motion.yaw,runPhase:motion.runPhase,walkPhase:motion.walkPhase,carryPhase:motion.carryPhase,
   runRemaining:motion.runRemaining,running:motion.running,gateWaiting:!motion.arrived&&motion.currentSpeed===0};
  const sample={at:motion.executedThrough,nativeRoute:motion.nativeRoute,bodyId:motion.bodyId,eventId:45,spawnTime:spawn.simulationTime,pose};
  Object.assign(worker,pose,{status:'fleeing',nativeRouteAdmission:'pending-farm-flight-stop',
   idleState:null,destinationId:null,path:null,nativeFarmFlightSample:sample});
  f.sync();
  const alternate={...spawn,id:'event-46'};
  f.state.events=[alternate];worker.nativeFarmFlightSample={...sample,eventId:46};f.sync();
  await assert.rejects(f.prepare(),/changed during preparation/);
  f.state.events=[spawn];worker.nativeFarmFlightSample=sample;f.sync();
  const {parts:[part]}=await f.prepare();assert(part.valid());
  const proof=f.commitStop();assert(part.acceptNativeStopBinding(proof));
  delete worker.nativeFarmFlightSample;
  Object.assign(worker,{nativeRouteAdmission:'pending-raid-flight-resources',running:false,gateWaiting:false});
  f.sync();assert(part.valid());part.activate();part.attach();const release=part.finalize();release.retire();release.notify();f.submit();f.flush();
  assert.equal(f.roster.get(f.actor),rig);assert.equal(f.acquires,1);assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});
