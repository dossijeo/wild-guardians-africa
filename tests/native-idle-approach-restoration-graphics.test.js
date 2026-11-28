import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeIdleApproachRestorationGraphicsFixture as fixture} from './helpers/native-idle-approach-restoration-graphics.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {installRemoteClockBindings} from '../src/rendering/remote-clock-bindings.js';
import {Scene,PerspectiveCamera,Vector3} from 'three';
import {WebGPURenderer,NodeMaterial} from 'three/webgpu';
import {vec4} from 'three/tsl';
import Renderer from '../node_modules/three/src/renderers/common/Renderer.js';
import {createWebGpuPicker} from '../src/rendering/webgpu-picker.js';

function meshes(root){const out=[];root.traverse(mesh=>{if(mesh.isMesh&&!mesh.userData.wgCpuPickProxy)out.push({mesh,geometry:mesh.geometry,index:mesh.geometry.index,material:mesh.material,visible:mesh.visible});});return out;}
for(const profile of PROFILES)for(const position of ['inside','arrived'])test(`${profile.id} restored ${position} approach keeps actor/geometry/all banks through22 and actual REST21`,async()=>{
 const f=await fixture({profile:profile.id,position});let part,rest;try{
  const actor=f.roster.get(f.actor),root=actor.root,before=meshes(root),at=root.position.clone(),body=f.body(1),worker=structuredClone(f.worker),rng=f.nativeState.rng,banks=[...f.bakes.values()].map(b=>({texture:b.texture,data:b.texture.image.data,version:b.texture.version}));let disposed=0;for(const b of banks)b.texture.addEventListener('dispose',()=>disposed++);
  assert(f.proposal.nativeIdleStroll.sourceRequest.approach);assert.equal(f.proposal.nativeIdleStroll.sourceFarm,undefined);assert.equal(f.planner.nativeInitialIdleBodyBinding(f.nativeActor),null);assert.equal(f.planner.nativeIdleCycleBinding(f.nativeActor),null);
  part=await f.roster.prepareNativeIdleStrollProposal(f.support,{getPickTime:f.getPickTime});part.activate();part.rollback();assert(part.valid());assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,worker);for(const m of before){assert.equal(m.mesh.material,m.material);assert.equal(m.mesh.visible,m.visible);}
  part.activate();const data=f.commitStroll();part.finalize(data);f.sync();f.flush();assert.equal(f.acquires,1);assert.equal(f.roster.get(f.actor),actor);assert.equal(f.worker.destinationId,f.worker.idleState.anchorId);assert.equal(f.worker.idleState.remaining,f.proposal.nativeIdleStroll.idleSeconds*2);
  f.advance(Math.max(0,data.nativeIdleStrollBinding.reference.endTime-f.nativeState.elapsed)+.05);f.sync();const p=f.planner.prepareNativeIdleCycleProposal(f.nativeActor);assert.equal(p.status,'proposed');const q=p.proposal,support=f.terrain.prepareNativeIdleCycle(q.nativeIdleCycle);rest=await f.roster.prepareNativeIdleCycleProposal(support,{getPickAge:()=>0});
  rest.activate();assert.equal(f.w.nav_idle_cycle_proposal_commit_bound(...f.tuple().slice(0,5),q.ticket.ticket),1);f.planner.commitNativeCausalClock();const binding=f.planner.nativeIdleCycleBinding(f.nativeActor);rest.finalize({nativeIdleCycleBinding:binding,resources:{version:1,kind:21,phase:'committed',worldBoundary:binding.reference.worldBoundary,nativeIdleCycleBinding:binding}});f.planner.projectNativeIdleCycle(f.nativeState,f.worker);f.sync();f.flush();
  assert.equal(f.roster.get(f.actor),actor);assert.equal(actor.root,root);assert(root.position.equals(at));assert.equal(f.acquires,1);for(const m of before){assert.equal(m.mesh.geometry,m.geometry);assert.equal(m.mesh.geometry.index,m.index);}for(const b of banks){assert.equal(b.texture.image.data,b.data);assert.equal(b.texture.version,b.version);}assert.equal(disposed,0);assert.equal(f.registry.status().owned.filter(r=>r.namespace==='native-gpu-motion').length,0);assert.equal(f.worker.idleState.mode,'rest');assert.equal(f.nativeState.rng,rng);assert.deepEqual(f.errors,[]);
 }finally{rest?.cancel();part?.cancel();f.close();}
});

test('a local-looking restored DTO cannot borrow the semantic body of an inside approach',async()=>{
 const f=await fixture();try{
  const p=structuredClone(f.proposal);delete p.nativeIdleStroll.sourceRequest.approach;const support=f.supportFor(p);assert(support?.valid());await assert.rejects(f.roster.prepareNativeIdleStrollProposal(support,{getPickTime:f.getPickTime}),/source worker/);assert.equal(f.planner.nativeIdleStrollBinding(f.nativeActor),null);assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});

for(const mode of ['cancel','remove','birth','kind','rng','destination','pose','marker'])test(`cold approach ${mode} rolls back or invalidates only its candidate`,async()=>{
 const f=await fixture();let part;try{
  const actor=f.roster.get(f.actor),before=meshes(actor.root),body=f.body(1);part=await f.roster.prepareNativeIdleStrollProposal(f.support,{getPickTime:f.getPickTime});part.activate();
  if(mode==='cancel'){assert(part.cancel());f.flush();for(const m of before){assert.equal(m.mesh.material,m.material);assert.equal(m.mesh.visible,m.visible);assert.equal(m.mesh.geometry,m.geometry);}assert.equal(f.roster.get(f.actor),actor);assert.equal(f.registry.status().owned.filter(r=>r.namespace==='native-gpu-motion').length,0);}
  else{const e=f.state.workers[0];if(mode==='remove')f.state.workers=[];else if(mode==='birth')e.idleState.remaining+=.1;else if(mode==='kind'){e.idleState.remaining=0;e.destinationId=e.idleState.destination.id=`idle-${e.id}`;}else if(mode==='rng')e.idleState.rng++;else if(mode==='destination')e.idleState.destination.x+=.1;else if(mode==='pose')e.x+=.1;else e.nativeRouteAdmission='native-idle';f.roster.sync();assert(!part.valid());}
  assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeIdleStrollBinding(f.nativeActor),null);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});

test('a local-looking Game source cannot borrow an actual approach request',async()=>{
 const f=await fixture();try{
  const e=f.state.workers[0];e.idleState.remaining=0;e.destinationId=e.idleState.destination.id=`idle-${e.id}`;f.roster.sync();const owned=f.registry.status().owned;
  await assert.rejects(f.roster.prepareNativeIdleStrollProposal(f.support,{getPickTime:f.getPickTime}),/source worker/);assert.deepEqual(f.registry.status().owned,owned);assert.equal(f.planner.nativeIdleStrollBinding(f.nativeActor),null);
 }finally{f.close();}
});

test('retarget of a cold approach preserves the actor and its single motion-data owner',async()=>{
 const f=await fixture(),hook=installRemoteClockBindings({backend:{get:()=>({buffer:null}),updateBinding(){}}},{registerClockBinding(){throw Error('No physical clock compiled');}});let part;try{
  const actor=f.roster.get(f.actor),before=meshes(actor.root);part=await f.roster.prepareNativeIdleStrollProposal(f.support,{getPickTime:f.getPickTime});const owned=f.registry.status().owned;f.advance(.3);const next=f.planner.revalidateNativeIdleStrollProposal(f.proposal.ticket);assert.equal(next.status,'revalidated');assert(part.retarget(f.supportFor(next.proposal),{retagClock:hook.retagNativeIdleStroll}));assert.deepEqual(f.registry.status().owned,owned);part.activate();part.finalize(f.commitStroll(next.proposal));f.sync();f.flush();assert.equal(f.roster.get(f.actor),actor);assert.equal(f.acquires,1);for(const m of before){assert.equal(m.mesh.geometry,m.geometry);assert.equal(m.mesh.geometry.index,m.index);}assert(f.planner.nativeIdleStrollBinding(f.nativeActor).reference.sourceRequest.approach);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();hook.dispose();f.close();}
});

test('pthread restored approach keeps the original authored actor',async()=>{
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),runtime=await createThreadedSpatialWorld(factory);let f,part;try{
  f=await fixture({core:runtime.core});const actor=f.roster.get(f.actor);part=await f.roster.prepareNativeIdleStrollProposal(f.support,{getPickTime:f.getPickTime});part.activate();part.finalize(f.commitStroll());f.sync();f.flush();assert.equal(f.roster.get(f.actor),actor);assert.equal(f.acquires,1);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f?.close();await runtime.dispose();}
});

test('cold approach compiles original color/shadow banks with the exact restored clock source',async()=>{
 const f=await fixture(),gpu=new WebGPURenderer({canvas:{width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}}});gpu.hasFeature=()=>true;let part;try{
  part=await f.roster.prepareNativeIdleStrollProposal(f.support,{getPickTime:f.getPickTime});let tags=0;
  for(const {mesh,material} of part.request.options.materialAlternatives){const previous=mesh.material;try{
   const build=(scene,selected)=>{mesh.material=selected;const builder=gpu.backend.createNodeBuilder(mesh,gpu);builder.scene=scene;builder.camera=new PerspectiveCamera();builder.build();assert.match(builder.vertexShader,/textureLoad/);const textures=builder.getBindings().flatMap(g=>g.bindings??[]).filter(b=>b.isSampledTexture).map(b=>b.texture);for(const clip of ['Walk_Skip','Idle'])assert(textures.includes(f.bakes.get(clip).texture));for(const g of builder.getBindings())for(const b of g.bindings??[])for(const u of b.uniforms??[]){const tag=u.nodeUniform?.node?.[Symbol.for('wild-guardians.remote-clock')];assert.equal(tag?.nativeFarmArrival,undefined);if(tag?.nativeStroll){tags++;assert.deepEqual(tag.nativeStroll,f.proposal.nativeIdleStroll);assert(tag.nativeStroll.sourceRequest.approach);}}};
   build(f.scene,material);const scene=new Scene(),shadow=new NodeMaterial();shadow.isShadowPassMaterial=true;shadow.colorNode=vec4(0,0,0,1);scene.overrideMaterial=shadow;let seen=false;Renderer.prototype.renderObject.call({_handleObjectFunction(_object,selected){seen=true;assert.equal(selected.positionNode,material.positionNode);build(scene,selected);}},mesh,scene,{},mesh.geometry,material,null,null);assert(seen);
  }finally{mesh.material=previous;}}assert(tags>0);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});

test('cold approach picking follows the submitted test clock while keeping its root static',async()=>{
 const f=await fixture();let part;try{
  const actor=f.roster.get(f.actor),root=actor.root,at=root.position.clone();part=await f.roster.prepareNativeIdleStrollProposal(f.support,{getPickTime:f.getPickTime});part.activate();const data=f.commitStroll();part.finalize(data);f.sync();f.flush();const camera=new PerspectiveCamera(45,1,.1,100),picker=createWebGpuPicker({scene:f.scene,camera,state:f.state,animals:{get:()=>null},workers:f.roster,cropBounds:()=>[]});
  for(const fraction of [.1,.5,1]){const time=f.proposal.startTime+(f.proposal.endTime-f.proposal.startTime)*fraction;f.setPickTime(time);const pose=f.planner.sampleNativeRoute(data.resources.nativeRoute.routeHandle,time),y=f.residency.surface(pose.x,pose.z);camera.position.set(pose.x,y+3,pose.z+6);camera.lookAt(pose.x,y+.8,pose.z);camera.updateMatrixWorld(true);let hit=false;for(const dx of [0,-.15,.15])for(const height of [.7,1,1.3,.4,1.5]){const point=new Vector3(pose.x+dx,y+height,pose.z).project(camera);if(picker.pick({x:point.x,y:point.y}).entityId===f.actor)hit=true;}assert(hit,'No hit at cold approach fraction '+fraction);assert.equal(actor.root,root);assert(root.position.equals(at));}assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});

test('foreign finalization cannot replace the actual fresh approach association',async()=>{
 const f=await fixture();let part;try{
  part=await f.roster.prepareNativeIdleStrollProposal(f.support,{getPickTime:f.getPickTime});part.activate();const data=f.commitStroll(),bad=structuredClone(data);for(const b of [bad.nativeIdleStrollBinding,bad.resources.nativeIdleStrollBinding])for(const r of [b.reference,b.preparedReference]){r.bodyId=3;r.sourceRequest.bodyId=3;}assert.throws(()=>part.validateCommit(bad));assert(part.valid());part.finalize(data);f.sync();f.flush();assert.equal(f.acquires,1);assert.equal(f.registry.status().owned.filter(r=>r.namespace==='native-gpu-motion').length,1);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});

test('cancelled REST preparation restores the actual arrived cold approach without an early Game phase',async()=>{
 const f=await fixture();let part,rest;try{
  const actor=f.roster.get(f.actor);part=await f.roster.prepareNativeIdleStrollProposal(f.support,{getPickTime:f.getPickTime});part.activate();const data=f.commitStroll();part.finalize(data);f.advance(data.nativeIdleStrollBinding.reference.endTime-f.nativeState.elapsed+.05);f.sync();f.flush();const before=meshes(actor.root),body=f.body(1),worker=structuredClone(f.worker),proposal=f.planner.prepareNativeIdleCycleProposal(f.nativeActor);assert.equal(proposal.status,'proposed');rest=await f.roster.prepareNativeIdleCycleProposal(f.terrain.prepareNativeIdleCycle(proposal.proposal.nativeIdleCycle),{getPickAge:()=>0});rest.activate();rest.rollback();assert(rest.valid());assert(rest.cancel());f.flush();assert.deepEqual(f.worker,worker);assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeIdleCycleBinding(f.nativeActor),null);assert.equal(f.registry.status().owned.filter(r=>r.namespace==='native-gpu-motion').length,1);for(const m of before){assert.equal(m.mesh.material,m.material);assert.equal(m.mesh.geometry,m.geometry);}assert.equal(f.roster.get(f.actor),actor);assert.equal(f.acquires,1);assert.deepEqual(f.errors,[]);
 }finally{rest?.cancel();part?.cancel();f.close();}
});
