import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFarmArrivedIdleCycleGraphicsFixture as fixture} from './helpers/native-farm-arrived-idle-cycle-graphics.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {Scene,PerspectiveCamera,Vector3} from 'three';
import {WebGPURenderer,NodeMaterial} from 'three/webgpu';
import {vec4} from 'three/tsl';
import Renderer from '../node_modules/three/src/renderers/common/Renderer.js';
import {createWebGpuPicker} from '../src/rendering/webgpu-picker.js';
import {installRemoteClockBindings} from '../src/rendering/remote-clock-bindings.js';

function meshes(root){const out=[];root.traverse(mesh=>{if(mesh.isMesh&&!mesh.userData.wgCpuPickProxy)out.push({mesh,geometry:mesh.geometry,index:mesh.geometry.index,material:mesh.material,visible:mesh.visible});});return out;}
for(const profile of PROFILES)for(const urgent of [false,true])for(const inside of [false,true])test(`${profile.id} ${urgent?'run':'walk'} ${inside?'inside':'travelled'} completed Farm retains its original actor through Idle21`,async()=>{
 const f=await fixture({profile:profile.id,urgent,inside});let part;try{
  const actor=f.roster.get(f.actor),root=actor.root,before=meshes(root),body=f.body(1),rng=f.nativeState.rng,banks=[...f.bakes.values()].map(b=>({texture:b.texture,data:b.texture.image.data,version:b.texture.version}));let disposedBanks=0;for(const b of banks)b.texture.addEventListener('dispose',()=>disposedBanks++);
  assert.equal(f.worker.status,'arriving');assert.equal(f.worker.idleState,null);part=await f.roster.prepareNativeIdleCycleProposal(f.support,{getPickAge:f.getPickAge});assert(part.valid());part.activate();part.rollback();assert(part.valid());for(const item of before){assert.equal(item.mesh.material,item.material);assert.equal(item.mesh.visible,item.visible);}
  f.advance(1.8);f.sync();assert(part.valid());assert.equal(f.worker.status,'arriving');assert.equal(f.worker.idleState,null);assert.deepEqual(f.body(1),body);const next=f.planner.revalidateNativeIdleCycleProposal(f.proposal.ticket);assert.equal(next.status,'revalidated');assert(next.timeTranslation.compatible);part.activate();const data=f.commitCycle();part.finalize(data);f.projectIdle();f.sync();f.flush();
  assert.equal(f.roster.get(f.actor),actor);assert.equal(actor.root,root);assert.equal(f.acquires,1);assert.equal(f.worker.status,'idle');assert.equal(f.worker.nativeRouteAdmission,'native-idle');assert.equal(f.worker.idleState.mode,'rest');assert.equal(f.nativeState.rng,rng);assert.deepEqual(f.body(1),body);for(const item of before){assert.equal(item.mesh.geometry,item.geometry);assert.equal(item.mesh.geometry.index,item.index);}for(const b of banks){assert.equal(b.texture.image.data,b.data);assert.equal(b.texture.version,b.version);}assert.equal(disposedBanks,0);assert.equal(f.registry.status().owned.filter(r=>r.namespace==='native-gpu-motion').length,0);assert.equal(f.roster.releaseNativeRoute(f.actor,f.farm.nativeRoute),false);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});

test('pthread completed Farm to Idle retains the original authored root and clip banks',async()=>{
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),runtime=await createThreadedSpatialWorld(factory);let f,part;try{f=await fixture({core:runtime.core,urgent:true});const actor=f.roster.get(f.actor);part=await f.roster.prepareNativeIdleCycleProposal(f.support,{getPickAge:f.getPickAge});part.activate();part.finalize(f.commitCycle());f.projectIdle();f.sync();f.flush();assert.equal(f.roster.get(f.actor),actor);assert.equal(f.acquires,1);assert.deepEqual(f.errors,[]);}finally{part?.cancel();f?.close();await runtime.dispose();}
});

for(const mode of ['cancel','remove','pose','heading','policy','center','profile'])test(`completed Farm Idle ${mode} restores or invalidates only its candidate`,async()=>{
 const f=await fixture();let part;try{
  const actor=f.roster.get(f.actor),before=meshes(actor.root);part=await f.roster.prepareNativeIdleCycleProposal(f.support,{getPickAge:f.getPickAge});part.activate();
  if(mode==='cancel'){assert(part.cancel());f.flush();for(const item of before){assert.equal(item.mesh.material,item.material);assert.equal(item.mesh.visible,item.visible);}assert.equal(f.roster.get(f.actor),actor);assert.equal(f.registry.status().owned.filter(r=>r.namespace==='native-gpu-motion').length,1);}
  else{const e=f.state.workers[0];if(mode==='remove')f.state.workers=[];else if(mode==='pose')e.x+=.1;else if(mode==='heading')e.heading+=.1;else if(mode==='policy')e.contractDay--;else if(mode==='center')e.centerId='structure-99999';else e.profile=PROFILES.find(p=>p.id!==e.profile).id;f.roster.sync();assert(!part.valid());}
  assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});

for(const urgent of [false,true])test(`late ${urgent?'run':'walk'} Farm acquisition retains the actual endpoint when its original row seeds Idle`,async()=>{
 const f=await fixture({urgent,farmDelay:.3});let part;try{assert(f.farm.nativeFarmArrivalBinding.reference.endTime>f.farm.nativeFarmArrivalBinding.preparedReference.endTime);const actor=f.roster.get(f.actor),body=f.body(1);part=await f.roster.prepareNativeIdleCycleProposal(f.support,{getPickAge:f.getPickAge});f.advance(.4);f.sync();assert(part.valid());assert.equal(f.planner.revalidateNativeIdleCycleProposal(f.proposal.ticket).status,'revalidated');part.activate();part.finalize(f.commitCycle());f.projectIdle();f.sync();f.flush();assert.equal(f.roster.get(f.actor),actor);assert.equal(f.acquires,1);assert.deepEqual(f.body(1),body);assert.deepEqual(f.errors,[]);}finally{part?.cancel();f.close();}
});

test('unpublished Farm Idle retarget changes only clock tags and retains old motion until adoption',async()=>{
 const f=await fixture(),hook=installRemoteClockBindings({backend:{get:()=>({buffer:null}),updateBinding(){}}},{registerClockBinding(){throw Error('No physical binding compiled');}});let part;try{
  const actor=f.roster.get(f.actor);part=await f.roster.prepareNativeIdleCycleProposal(f.support,{getPickAge:f.getPickAge});const owned=f.registry.status().owned;f.advance(.3);f.sync();const next=f.planner.revalidateNativeIdleCycleProposal(f.proposal.ticket);assert.equal(next.status,'revalidated');assert(part.retarget(f.supportFor(next.proposal),{retagClock:hook.retagNativeIdleCycle}));assert.deepEqual(f.registry.status().owned,owned);assert.equal(f.roster.get(f.actor),actor);assert.equal(f.acquires,1);part.activate();part.finalize(f.commitCycle());f.projectIdle();f.sync();f.flush();assert.equal(f.registry.status().owned.filter(r=>r.namespace==='native-gpu-motion').length,0);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();hook.dispose();f.close();}
});

test('foreign Idle association cannot retire the resident Farm motion before valid finalization',async()=>{
 const f=await fixture();let part;try{
  part=await f.roster.prepareNativeIdleCycleProposal(f.support,{getPickAge:f.getPickAge});part.activate();const data=f.commitCycle(),bad=structuredClone(data);for(const r of [bad.nativeIdleCycleBinding.reference,bad.nativeIdleCycleBinding.preparedReference]){r.bodyId=3;r.sourceBody.bodyId=3;}assert.throws(()=>part.validateCommit(bad));assert(part.valid());assert.equal(f.registry.status().owned.filter(r=>r.namespace==='native-gpu-motion').length,1);part.finalize(data);f.projectIdle();f.sync();f.flush();assert.equal(f.registry.status().owned.filter(r=>r.namespace==='native-gpu-motion').length,0);
 }finally{part?.cancel();f.close();}
});

test('incompatible native Farm source metadata cannot prepare a resident Idle variant',async()=>{
 const f=await fixture();try{
  const body=f.body(1);for(const edit of [r=>{r.bodyId=3;r.sourceBody.bodyId=3;},r=>r.sourceBody.sourceAt+=.01,r=>r.sourceBody.bodyFlags=5,r=>r.sourceBody.pose.radius+=.01,r=>r.sourceBody.pose.yaw+=.1,r=>r.sourceBody.pose.walkPhase+=.1]){const reference=structuredClone(f.support.reference);edit(reference);await assert.rejects(f.roster.prepareNativeIdleCycleProposal({...f.support,reference},{getPickAge:f.getPickAge}),/matching pending worker/);assert.equal(f.acquires,1);assert.deepEqual(f.body(1),body);assert.equal(f.registry.status().owned.filter(r=>r.namespace==='native-gpu-motion').length,1);}
 }finally{f.close();}
});

test('early Game Idle projection cannot impersonate the still-executing Farm source',async()=>{
 const f=await fixture();try{Object.assign(f.state.workers[0],{status:'idle',nativeRouteAdmission:'native-idle',idleState:{...f.proposal.nativeIdleCycle.initialState}});f.roster.sync();await assert.rejects(f.roster.prepareNativeIdleCycleProposal(f.support,{getPickAge:f.getPickAge}),/matching pending worker/);assert.equal(f.acquires,1);}finally{f.close();}
});

test('changed Farm policy before Idle preparation cannot borrow the existing actor',async()=>{
 for(const field of ['contractDay','personId']){const f=await fixture();try{const e=f.state.workers[0];if(field==='personId')e.personId='person-12345';else e.contractDay--;f.roster.sync();await assert.rejects(f.roster.prepareNativeIdleCycleProposal(f.support,{getPickAge:f.getPickAge}),/matching pending worker/);assert.equal(f.acquires,1);assert.equal(f.registry.status().owned.filter(r=>r.namespace==='native-gpu-motion').length,1);}finally{f.close();}}
});

test('Farm Idle color and shadow compilation use the authored Idle and Alert banks on the original meshes',async()=>{
 const f=await fixture(),gpu=new WebGPURenderer({canvas:{width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}}});gpu.hasFeature=()=>true;let part;try{
  part=await f.roster.prepareNativeIdleCycleProposal(f.support,{getPickAge:f.getPickAge});let tags=0;for(const {mesh,material} of part.request.options.materialAlternatives){const previous=mesh.material;try{
   const build=(scene,selected)=>{mesh.material=selected;const builder=gpu.backend.createNodeBuilder(mesh,gpu);builder.scene=scene;builder.camera=new PerspectiveCamera();builder.build();assert.match(builder.vertexShader,/textureLoad/);const textures=builder.getBindings().flatMap(g=>g.bindings??[]).filter(b=>b.isSampledTexture).map(b=>b.texture);for(const clip of ['Idle','Alert'])assert(textures.includes(f.bakes.get(clip).texture));for(const group of builder.getBindings())for(const binding of group.bindings??[])for(const u of binding.uniforms??[]){const tag=u.nodeUniform?.node?.[Symbol.for('wild-guardians.remote-clock')];assert.equal(tag?.nativeFarmArrival,undefined);if(tag?.nativeIdleCycle){tags++;assert.deepEqual(tag.nativeIdleCycle,f.proposal.nativeIdleCycle);assert.equal(tag.nativeFarmArrival,undefined);}}};
   build(f.scene,material);const scene=new Scene(),shadow=new NodeMaterial();shadow.isShadowPassMaterial=true;shadow.colorNode=vec4(0,0,0,1);scene.overrideMaterial=shadow;let seen=false;Renderer.prototype.renderObject.call({_handleObjectFunction(_object,selected){seen=true;assert.equal(selected.positionNode,material.positionNode);build(scene,selected);}},mesh,scene,{},mesh.geometry,material,null,null);assert(seen);
  }finally{mesh.material=previous;}}assert(tags>0);assert.equal(f.acquires,1);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});

test('ordinary picking retains the original root through Farm endpoint, late Idle and Watch',async()=>{
 const f=await fixture({urgent:true});let part;try{
  const actor=f.roster.get(f.actor),root=actor.root,anchor=root.position.clone(),camera=new PerspectiveCamera(45,1,.1,100),picker=createWebGpuPicker({scene:f.scene,camera,state:f.state,animals:{get:()=>null},workers:f.roster,cropBounds:()=>[]});
  const pick=()=>{const pose=f.body(1),y=f.residency.surface(pose.x,pose.z);camera.position.set(pose.x,y+3,pose.z+6);camera.lookAt(pose.x,y+.8,pose.z);camera.updateMatrixWorld(true);let found=false;for(const dx of [0,-.15,.15,-.3,.3])for(const height of [.7,1,1.3,.4,1.5]){const point=new Vector3(pose.x+dx,y+height,pose.z).project(camera);if(picker.pick({x:point.x,y:point.y}).entityId===f.actor)found=true;}assert(found);assert.equal(actor.root,root);assert(root.position.equals(anchor));};
  pick();part=await f.roster.prepareNativeIdleCycleProposal(f.support,{getPickAge:f.getPickAge});f.advance(.4);f.sync();pick();assert.equal(f.planner.revalidateNativeIdleCycleProposal(f.proposal.ticket).status,'revalidated');part.activate();part.finalize(f.commitCycle());f.projectIdle();f.sync();f.flush();pick();f.advance(f.proposal.nativeIdleCycle.watchStartOffset+.05);f.sync();assert.equal(f.worker.idleState.mode,'watch');pick();assert.equal(f.acquires,1);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});
