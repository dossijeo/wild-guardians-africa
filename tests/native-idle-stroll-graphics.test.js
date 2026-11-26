import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeIdleStrollGraphicsFixture} from './helpers/native-idle-stroll-graphics.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {copyNativeIdleStrollResources} from '../src/world/native-idle-stroll.js';
import {installRemoteClockBindings} from '../src/rendering/remote-clock-bindings.js';
import {Scene,PerspectiveCamera,Vector3} from 'three';
import {WebGPURenderer,NodeMaterial} from 'three/webgpu';
import Renderer from '../node_modules/three/src/renderers/common/Renderer.js';
import {vec4} from 'three/tsl';
import {createWebGpuPicker} from '../src/rendering/webgpu-picker.js';
import {emit} from '../src/simulation/game.js';
import {cropBecameInactive} from '../src/simulation/active-crops.js';

function meshes(root){const out=[];root.traverse(mesh=>{if(mesh.isMesh&&!mesh.userData.wgCpuPickProxy)out.push({mesh,geometry:mesh.geometry,index:mesh.geometry.index,material:mesh.material,visible:mesh.visible});});return out;}
test('reanchoring an arrived stroll preserves the original worker rig and holds it until adoption',async()=>{
 const f=await nativeIdleStrollGraphicsFixture();let stroll,idle;try{
  const actor=f.roster.get(f.actor),root=actor.root;
  stroll=await f.roster.prepareNativeIdleStrollProposal(f.support,{getPickTime:f.getPickTime});
  stroll.activate();const data=f.commitStroll();stroll.finalize(data);
  f.planner.projectNativeIdleStroll(f.nativeState,f.worker);f.sync();f.flush();
  const reference=data.nativeIdleStrollBinding.reference;
  f.advance(reference.endTime-f.nativeState.elapsed+.1);f.planner.projectNativeIdleStroll(f.nativeState,f.worker);f.sync();
  const plant=f.nativeState.plants.find(row=>row.id===`plant-${reference.anchor.id}`);
  plant.alive=false;cropBecameInactive(f.nativeState.plants);emit(f.nativeState,'CropDestroyed',{targetId:plant.id});f.planner.flushWorldEvents();
  const stopped=f.body(1),parts=meshes(root),{proposal,support}=f.prepare();
  assert.equal(proposal.nativeIdleCycle.sourceBody.kind,'native-idle-stroll-reanchor-source');
  idle=await f.roster.prepareNativeIdleCycleProposal(support,{getPickAge:()=>0});assert(idle.valid());
  idle.activate();idle.rollback();assert(idle.valid());
  assert.deepEqual(meshes(root),parts);
  idle.activate();const acquired=f.commit(proposal);idle.finalize(acquired);
  f.planner.projectNativeIdleCycle(f.nativeState,f.worker);f.sync();f.flush();
  assert.equal(f.roster.get(f.actor),actor);assert.equal(actor.root,root);
  for(const part of parts){assert.equal(part.mesh.geometry,part.geometry);assert.equal(part.mesh.geometry.index,part.index);}
  assert.deepEqual(f.body(1),stopped);assert.deepEqual(f.errors,[]);
 }finally{idle?.cancel();stroll?.cancel();f.close();}
});
for(const profile of PROFILES)test(`${profile.id} stroll reversibly replaces its genuine finite Idle on the same authored actor`,async()=>{
 const f=await nativeIdleStrollGraphicsFixture({profile:profile.id});let part;try{
  const actor=f.roster.get(f.actor),before=meshes(actor.root),position=actor.root.position.clone(),body=f.body(1),worker=structuredClone(f.worker);part=await f.roster.prepareNativeIdleStrollProposal(f.support,{getPickTime:f.getPickTime});assert(part.valid());part.activate();part.rollback();assert(part.valid());for(const item of before){assert.equal(item.mesh.material,item.material);assert.equal(item.mesh.visible,item.visible);}assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,worker);
  part.activate();const data=f.commitStroll();assert.deepEqual(copyNativeIdleStrollResources(data.resources),data.resources);part.finalize(data);f.sync();f.flush();assert.equal(f.roster.get(f.actor),actor);assert.equal(f.acquires,1);assert(actor.root.position.equals(position));for(const item of before){assert.equal(item.mesh.geometry,item.geometry);assert.equal(item.mesh.geometry.index,item.index);}assert.equal(f.registry.status().owned.filter(r=>r.namespace==='native-gpu-motion').length,1);assert.equal(f.roster.releaseNativeIdleCycle(f.actor,f.cycleData.nativeIdleCycleBinding),false);
  f.advance(.2);f.setPickTime(f.proposal.startTime+.2);const restore=actor.preparePick();restore();assert.notDeepEqual(f.body(1),body);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});

test('cancelled stroll restores the resident stationary variant and removal retires both owners',async()=>{
 for(const remove of [false,true]){const f=await nativeIdleStrollGraphicsFixture();let part;try{
  const actor=f.roster.get(f.actor),before=meshes(actor.root),owned=f.registry.status().owned.length,body=f.body(1);part=await f.roster.prepareNativeIdleStrollProposal(f.support,{getPickTime:f.getPickTime});part.activate();if(remove){f.state.workers=[];f.roster.sync();assert.equal(part.valid(),false);assert.equal(part.cancel(),false);f.flush();assert.equal(f.registry.status().owned.length,0);}else{assert(part.cancel());f.flush();assert.equal(f.registry.status().owned.length,owned);for(const item of before){assert.equal(item.mesh.material,item.material);assert.equal(item.mesh.visible,item.visible);assert.equal(item.mesh.geometry,item.geometry);}}assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeIdleStrollBinding(f.nativeActor),null);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}}
});

test('stroll requires its actual admitted source cycle and a terminal unchanged Game phase',async()=>{
 const f=await nativeIdleStrollGraphicsFixture();let part;try{
  for(const mutate of [r=>{r.sourceCycleSequence++;},r=>{r.pose.yaw+=.1;},r=>{r.bodyId++;},r=>{r.anchor.id++;}]){const bad={...f.support,presentation:structuredClone(f.proposal)};mutate(bad.presentation.nativeIdleStroll);await assert.rejects(f.roster.prepareNativeIdleStrollProposal(bad,{getPickTime:f.getPickTime}),/source/);}
  part=await f.roster.prepareNativeIdleStrollProposal(f.support,{getPickTime:f.getPickTime});f.state.workers[0].idleState.remaining=1;f.roster.sync();assert.equal(part.valid(),false);assert.throws(()=>part.activate(),/activation unavailable/);assert(part.cancel());assert.equal(f.planner.nativeIdleStrollBinding(f.nativeActor),null);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});

test('retimed stroll renews its original actor with one route-data owner',async()=>{
 const f=await nativeIdleStrollGraphicsFixture(),hook=installRemoteClockBindings({backend:{get:()=>({buffer:null}),updateBinding(){}}},{registerClockBinding(){throw Error('No compiled physical binding');}});let part;try{
  const actor=f.roster.get(f.actor),before=meshes(actor.root);part=await f.roster.prepareNativeIdleStrollProposal(f.support,{getPickTime:f.getPickTime});part.activate();part.rollback();f.advance(.3);const next=f.planner.revalidateNativeIdleStrollProposal(f.proposal.ticket);assert.equal(next.status,'revalidated');assert(part.retarget(f.supportFor(next.proposal),{retagClock:hook.retagNativeIdleStroll}));assert.equal(f.registry.status().owned.filter(r=>r.namespace==='native-gpu-motion').length,1);part.activate();const data=f.commitStroll(next.proposal);part.finalize(data);f.sync();f.flush();assert.equal(f.roster.get(f.actor),actor);for(const item of before)assert.equal(item.mesh.geometry,item.geometry);assert.deepEqual(data.nativeIdleStrollBinding.reference,next.proposal.nativeIdleStroll);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();hook.dispose();f.close();}
});

test('confirmed stroll resources reject a foreign kind, association, boundary or hidden family',async()=>{
 const f=await nativeIdleStrollGraphicsFixture();try{const {resources}=f.commitStroll();assert.deepEqual(copyNativeIdleStrollResources(resources),resources);for(const mutate of [v=>{v.kind=18;},v=>{v.nativeHomeRouteBinding=v.nativeIdleStrollBinding;},v=>{v.nativeRoute.assignmentSequence++;},v=>{v.worldBoundary={...v.worldBoundary,ticket:v.worldBoundary.ticket+1};},v=>{v.presentation.worldBoundary={...v.worldBoundary,ticket:v.worldBoundary.ticket+1};},v=>{v.nativeIdleStrollBinding.reference.pose.x+=.1;v.nativeIdleStrollBinding.preparedReference.pose.x+=.1;}]){const bad=structuredClone(resources);mutate(bad);assert.throws(()=>copyNativeIdleStrollResources(bad),undefined,mutate.toString());}}finally{f.close();}
});

test('actor finalization rejects a resource receipt that names another prepared association',async()=>{
 const f=await nativeIdleStrollGraphicsFixture();let part;try{
  part=await f.roster.prepareNativeIdleStrollProposal(f.support,{getPickTime:f.getPickTime});part.activate();const data=f.commitStroll(),forged=structuredClone(data);forged.resources.nativeIdleStrollBinding=structuredClone(data.nativeIdleStrollBinding);forged.resources.nativeIdleStrollBinding.preparedReference.worldBoundary.ticket--;
  assert.throws(()=>part.validateCommit(forged),/association/);assert(part.validateCommit(data));part.finalize(data);f.flush();assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});

test('original stroll skinning keeps its own native clock in actual color and shadow programs',async()=>{
 const f=await nativeIdleStrollGraphicsFixture(),gpu=new WebGPURenderer({canvas:{width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}}});gpu.hasFeature=()=>true;let part;try{
  part=await f.roster.prepareNativeIdleStrollProposal(f.support,{getPickTime:f.getPickTime});let tags=0;for(const {mesh,material} of part.request.options.materialAlternatives){const previous=mesh.material;try{mesh.material=material;const builder=gpu.backend.createNodeBuilder(mesh,gpu);builder.scene=f.scene;builder.camera=new PerspectiveCamera();builder.build();assert.match(builder.vertexShader,/textureLoad/);for(const group of builder.getBindings())for(const b of group.bindings??[])for(const u of b.uniforms??[]){const tag=u.nodeUniform?.node?.[Symbol.for('wild-guardians.remote-clock')];if(tag?.nativeStroll){tags++;assert.deepEqual(tag.nativeStroll,f.proposal.nativeIdleStroll);assert.equal(tag.nativeHome,undefined);}}const scene=new Scene(),shadow=new NodeMaterial();shadow.isShadowPassMaterial=true;shadow.colorNode=vec4(0,0,0,1);scene.overrideMaterial=shadow;let seen=false;Renderer.prototype.renderObject.call({_handleObjectFunction(object,selected){seen=true;assert.equal(selected.positionNode,material.positionNode);const saved=object.material;try{object.material=selected;const pass=gpu.backend.createNodeBuilder(object,gpu);pass.scene=scene;pass.camera=new PerspectiveCamera();pass.build();assert.match(pass.vertexShader,/textureLoad/);}finally{object.material=saved;}}},mesh,scene,{},mesh.geometry,material,null,null);assert(seen);}finally{mesh.material=previous;}}assert(tags>0);assert.equal(f.planner.nativeIdleStrollBinding(f.nativeActor),null);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});

test('ordinary on-demand picking follows the native stroll while retaining the actual worker geometry',async()=>{
 const f=await nativeIdleStrollGraphicsFixture();let part;try{part=await f.roster.prepareNativeIdleStrollProposal(f.support,{getPickTime:f.getPickTime});part.activate();const data=f.commitStroll();part.finalize(data);f.sync();f.flush();const camera=new PerspectiveCamera(45,1,.1,100),picker=createWebGpuPicker({scene:f.scene,camera,state:f.state,animals:{get:()=>null},workers:f.roster,cropBounds:()=>[]});for(const fraction of [.1,.5,1]){const at=f.proposal.startTime+(f.proposal.endTime-f.proposal.startTime)*fraction;f.setPickTime(at);const pose=f.planner.sampleNativeRoute(data.resources.nativeRoute.routeHandle,at),y=f.residency.surface(pose.x,pose.z);camera.position.set(pose.x,y+3,pose.z+6);camera.lookAt(pose.x,y+.8,pose.z);camera.updateMatrixWorld(true);let hit=null;for(const height of [.7,1,1.3,.4,1.5]){const point=new Vector3(pose.x,y+height,pose.z).project(camera),result=picker.pick({x:point.x,y:point.y});if(result.entityId===f.actor){hit=result;break;}}assert(hit,'Stroll fraction '+fraction+' had no body hit');}assert.deepEqual(f.errors,[]);}finally{part?.cancel();f.close();}
});
