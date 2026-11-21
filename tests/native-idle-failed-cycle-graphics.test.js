import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,PerspectiveCamera,Vector3} from 'three';
import {WebGPURenderer,NodeMaterial} from 'three/webgpu';
import {vec4} from 'three/tsl';
import Renderer from '../node_modules/three/src/renderers/common/Renderer.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {installRemoteClockBindings} from '../src/rendering/remote-clock-bindings.js';
import {createWebGpuPicker} from '../src/rendering/webgpu-picker.js';
import {nativeIdleFailedCycleGraphics as fixture} from './helpers/native-idle-failed-cycle-graphics.js';

function meshes(root){const out=[];root.traverse(mesh=>{if(mesh.isMesh&&!mesh.userData.wgCpuPickProxy)out.push({mesh,geometry:mesh.geometry,index:mesh.geometry.index,material:mesh.material,visible:mesh.visible});});return out;}
const prepare=f=>f.roster.prepareNativeIdleCycleProposal(f.support,{getPickAge:f.getPickAge,getPickPhaseOffset:f.getPickPhaseOffset});

for(const profile of PROFILES)for(const threaded of [false,true])test(`${profile.id} ${threaded?'pthread':'normal'} failed WALK reuses its resident actor for first21 without20/22`,async()=>{
 const f=await fixture({profile:profile.id,threaded,retry:.25});let part;try{
  const actor=f.roster.get(f.actor),root=actor.root,at=root.position.clone(),before=meshes(root),body=f.body(1),worker=structuredClone(f.worker),rng=f.nativeState.rng,banks=[...f.bakes.values()].map(b=>({texture:b.texture,data:b.texture.image.data,version:b.texture.version}));let disposed=0;for(const b of banks)b.texture.addEventListener('dispose',()=>disposed++);
  assert.equal(f.roster.status().native,0);assert.equal(f.planner.nativeInitialIdleBodyBinding(f.nativeActor),null);assert.equal(f.planner.nativeIdleStrollBinding(f.nativeActor),null);assert.equal(f.proposal.nativeIdleCycle.sourceBody.kind,'native-idle-stroll-failed-source');assert.deepEqual(f.proposal.nativeIdleCycle.sourceBody.sourceRequest,f.sourceRequest);
  part=await prepare(f);part.activate();part.rollback();assert(part.valid());assert.deepEqual(f.worker,worker);assert.deepEqual(f.body(1),body);for(const m of before){assert.equal(m.mesh.material,m.material);assert.equal(m.mesh.visible,m.visible);}
  part.activate();const data=f.commit();assert(part.validateCommit(data));part.finalize(data);f.sync();f.flush();
  assert.equal(f.roster.get(f.actor),actor);assert.equal(actor.root,root);assert(root.position.equals(at));assert.equal(f.acquires,1);assert.equal(f.roster.status().native,1);assert.equal(f.worker.idleState.mode,'rest');assert.equal(f.nativeState.rng,rng);assert.deepEqual(f.body(1),body);assert.equal(disposed,0);
  for(const m of before){assert.equal(m.mesh.geometry,m.geometry);assert.equal(m.mesh.geometry.index,m.index);}for(const b of banks){assert.equal(b.texture.image.data,b.data);assert.equal(b.texture.version,b.version);}assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();await f.dispose();}
});

for(const mode of ['cancel','remove','birth','kind','rng','destination','pose','marker','task'])test(`failed-WALK ${mode} restores or invalidates only the prepared graphic candidate`,async()=>{
 const f=await fixture();let part;try{
  const actor=f.roster.get(f.actor),before=meshes(actor.root),body=f.body(1),owned=f.registry.status().owned;part=await prepare(f);part.activate();
  if(mode==='cancel'){assert(part.cancel());f.flush();for(const m of before){assert.equal(m.mesh.material,m.material);assert.equal(m.mesh.visible,m.visible);assert.equal(m.mesh.geometry,m.geometry);}assert.deepEqual(f.registry.status().owned,owned);assert.equal(f.roster.get(f.actor),actor);}
  else{const e=f.state.workers[0];if(mode==='remove')f.state.workers=[];else if(mode==='birth')e.idleState.remaining+=.1;else if(mode==='kind'){e.idleState.remaining=0;e.destinationId=e.idleState.destination.id=`idle-${e.id}`;}else if(mode==='rng')e.idleState.rng++;else if(mode==='destination')e.idleState.destination.x+=.1;else if(mode==='pose')e.x+=.1;else if(mode==='marker')e.nativeRouteAdmission='native-idle';else f.state.tasks.push({workerId:e.id});f.roster.sync();assert(!part.valid());}
  assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeIdleCycleBinding(f.nativeActor),null);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();await f.dispose();}
});

test('local failed WALK uses its genuine local source without borrowing an approach',async()=>{
 const f=await fixture({local:true});let part;try{
  assert.equal(f.sourceRequest.approach,undefined);part=await prepare(f);part.activate();part.finalize(f.commit());f.sync();f.flush();assert.equal(f.worker.idleState.mode,'rest');assert.equal(f.acquires,1);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();await f.dispose();}
});

test('a local-looking failed-source reference cannot borrow an outside approach actor',async()=>{
 const f=await fixture();try{
  const proposal=structuredClone(f.proposal);delete proposal.nativeIdleCycle.sourceBody.sourceRequest.approach;
  assert.throws(()=>f.supportFor(proposal));assert.equal(f.roster.status().native,0);assert.equal(f.planner.nativeIdleCycleBinding(f.nativeActor),null);assert.deepEqual(f.errors,[]);
 }finally{await f.dispose();}
});

test('late failed-WALK retarget changes clock tags on the same resident graph',async()=>{
 const f=await fixture(),hook=installRemoteClockBindings({backend:{get:()=>({buffer:null}),updateBinding(){}}},{registerClockBinding(){throw Error('No physical clock compiled');}});let part;try{
  const actor=f.roster.get(f.actor),before=meshes(actor.root);part=await prepare(f);const owned=f.registry.status().owned;f.advance(.3);const next=f.planner.revalidateNativeIdleCycleProposal(f.proposal.ticket);assert.equal(next.status,'revalidated');assert(part.retarget(f.supportFor(next.proposal),{retagClock:hook.retagNativeIdleCycle}));assert.deepEqual(f.registry.status().owned,owned);part.activate();part.finalize(f.commit(next.proposal));f.sync();f.flush();assert.equal(f.roster.get(f.actor),actor);assert.equal(f.acquires,1);for(const m of before)assert.equal(m.mesh.geometry,m.geometry);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();hook.dispose();await f.dispose();}
});

test('failed-WALK REST and WATCH successors retain actor, geometry and banks across actual native acquisitions',async()=>{
 const f=await fixture({retry:'rest-end'}),parts=[];try{
  const actor=f.roster.get(f.actor),before=meshes(actor.root),banks=[...f.bakes.values()].map(b=>b.texture),body=f.body(1);let current=f,old;
  for(let i=0;i<3;i++){
   const part=await f.roster.prepareNativeIdleCycleProposal(current.support,{getPickAge:f.getPickAge});parts.push(part);part.activate();const data=f.commit(current.proposal);part.finalize(data);f.sync();f.flush();if(old)assert.equal(f.roster.releaseNativeIdleCycle(f.actor,old),false);old=data.nativeIdleCycleBinding;
   assert.equal(f.roster.get(f.actor),actor);assert.equal(f.acquires,1);assert.deepEqual(f.body(1),body);for(const m of before)assert.equal(m.mesh.geometry,m.geometry);for(const [i,b] of [...f.bakes.values()].entries())assert.equal(b.texture,banks[i]);
   if(i<2){const next=f.advanceCycle();assert.equal(next.idleState.mode,'watch');f.sync();current=f.prepare();}
  }assert.deepEqual(f.errors,[]);
 }finally{for(const p of parts.reverse())p.cancel();await f.dispose();}
});

test('failed-WALK original color/shadow programs keep Idle/Alert banks and strict source clock tags',async()=>{
 const f=await fixture(),gpu=new WebGPURenderer({canvas:{width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}}});gpu.hasFeature=()=>true;let part;try{
  part=await prepare(f);let tags=0;const semantics=new Set();
  for(const {mesh,material} of part.request.options.materialAlternatives){const before=mesh.material;try{
   const build=(scene,selected)=>{mesh.material=selected;const builder=gpu.backend.createNodeBuilder(mesh,gpu);builder.scene=scene;builder.camera=new PerspectiveCamera();builder.build();assert.match(builder.vertexShader,/textureLoad/);const textures=builder.getBindings().flatMap(g=>g.bindings??[]).filter(b=>b.isSampledTexture).map(b=>b.texture);for(const clip of ['Idle','Alert'])assert(textures.includes(f.bakes.get(clip).texture));for(const g of builder.getBindings())for(const b of g.bindings??[])for(const u of b.uniforms??[]){const tag=u.nodeUniform?.node?.[Symbol.for('wild-guardians.remote-clock')];if(tag?.nativeIdleCycle){tags++;semantics.add(tag.semantic);assert.deepEqual(tag.nativeIdleCycle,f.proposal.nativeIdleCycle);assert.equal(tag.nativeStroll,undefined);}}};
   build(f.scene,material);const scene=new Scene(),shadow=new NodeMaterial();shadow.isShadowPassMaterial=true;shadow.colorNode=vec4(0,0,0,1);scene.overrideMaterial=shadow;let seen=false;Renderer.prototype.renderObject.call({_handleObjectFunction(_object,selected){seen=true;assert.equal(selected.positionNode,material.positionNode);build(scene,selected);}},mesh,scene,{},mesh.geometry,material,null,null);assert(seen);
  }finally{mesh.material=before;}}assert(tags>0);assert(semantics.has('relative'));assert(semantics.has('idle-cycle-watch-knot'));assert(semantics.has('idle-offset'));assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();await f.dispose();}
});

test('failed-WALK picking follows submitted test clocks on the retained static root',async()=>{
 const f=await fixture({retry:.25});let part;try{
  const actor=f.roster.get(f.actor),root=actor.root,at=root.position.clone();part=await prepare(f);part.activate();part.finalize(f.commit());f.sync();f.flush();const camera=new PerspectiveCamera(45,1,.1,100),picker=createWebGpuPicker({scene:f.scene,camera,state:f.state,animals:{get:()=>null},workers:f.roster,cropBounds:()=>[]}),q=f.sourceRequest.pose,y=f.residency.surface(q.x,q.z);
  camera.position.set(q.x,y+3,q.z+6);camera.lookAt(q.x,y+.8,q.z);camera.updateMatrixWorld(true);
  for(const age of [0,Math.fround(.2),Math.fround(f.proposal.nativeIdleCycle.duration+1)]){f.setPickClock(age);let hit=false;for(const dx of [0,-.15,.15])for(const height of [.7,1,1.3,.4,1.5]){const point=new Vector3(q.x+dx,y+height,q.z).project(camera);if(picker.pick({x:point.x,y:point.y}).entityId===f.actor)hit=true;}assert(hit,'No pick at failed-WALK age '+age);assert.equal(actor.root,root);assert(root.position.equals(at));}assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();await f.dispose();}
});

test('foreign first21 finalization cannot replace the failed-WALK source association',async()=>{
 const f=await fixture();let part;try{
  part=await prepare(f);part.activate();const data=f.commit(),bad=structuredClone(data);bad.nativeIdleCycleBinding.reference.bodyId++;assert.throws(()=>part.validateCommit(bad));assert(part.valid());part.finalize(data);f.sync();f.flush();assert.equal(f.acquires,1);assert.equal(f.roster.status().native,1);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();await f.dispose();}
});
