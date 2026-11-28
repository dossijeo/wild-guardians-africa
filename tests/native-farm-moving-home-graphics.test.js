import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,PerspectiveCamera,Vector3} from 'three';
import {WebGPURenderer,NodeMaterial} from 'three/webgpu';
import {vec4} from 'three/tsl';
import Renderer from '../node_modules/three/src/renderers/common/Renderer.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {nativeFarmMovingHomeGraphicsFixture} from './helpers/native-farm-moving-home-graphics.js';
import {installRemoteClockBindings} from '../src/rendering/remote-clock-bindings.js';
import {createWebGpuPicker} from '../src/rendering/webgpu-picker.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';

function meshes(root){const values=[];root.traverse(mesh=>{if(mesh.isMesh&&!mesh.userData.wgCpuPickProxy)values.push({mesh,geometry:mesh.geometry,index:mesh.geometry.index,material:mesh.material,visible:mesh.visible});});return values;}
for(const profile of PROFILES)for(const urgent of [false,true])test(`${profile.id} ${urgent?'running':'walking'} original held Farm actor survives Home preparation, rollback and late acquisition`,async()=>{
 const f=await nativeFarmMovingHomeGraphicsFixture({profile:profile.id,urgent});let part;try{
  const actor=f.roster.get(f.actor),before=meshes(actor.root),body=f.body(1);let restore=actor.preparePick();restore();assert.equal(f.source.kind,'native-farm-arrival-held-execution');
  part=await f.roster.prepareNativeHomeRouteProposal(f.support,{getPickTime:f.getPickTime});assert(part.valid());part.activate();assert(part.valid());part.rollback();assert(part.valid());
  for(const item of before){assert.equal(item.mesh.material,item.material);assert.equal(item.mesh.visible,item.visible);}restore=actor.preparePick();restore();
  f.advance(f.source.sourceReference.endTime-f.nativeState.elapsed+.2);f.sync();assert(part.valid());restore=actor.preparePick();restore();assert.deepEqual(f.body(1),body);
  const next=f.planner.revalidateNativeHomeRouteProposal(f.proposal.ticket);assert.equal(next.status,'revalidated');assert(next.timeTranslation.sameFloat32Motion);part.activate();assert(part.valid());const data=f.commitHome();part.finalize(data);assert(f.planner.projectNativeHomeExecution(f.nativeState,f.worker));f.sync();f.flush();f.setPickTime(data.nativeHomeRouteBinding.reference.worldBoundary.effectiveTime);restore=actor.preparePick();restore();
  assert.equal(f.roster.get(f.actor),actor);assert.equal(f.acquires,1);assert.equal(f.worker.nativeRouteAdmission,'native-home');for(const item of before){assert.equal(item.mesh.geometry,item.geometry);assert.equal(item.mesh.geometry.index,item.index);}assert.deepEqual(f.body(1),body);assert.equal(f.registry.status().owned.filter(r=>r.namespace==='native-gpu-motion').length,1);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});

test('unpublished Farm to Home retarget retains both motion owners and the original actor',async()=>{
 const f=await nativeFarmMovingHomeGraphicsFixture(),hook=installRemoteClockBindings({backend:{get:()=>({buffer:null}),updateBinding(){}}},{registerClockBinding(){throw Error('No physical binding compiled');}});let part;try{
  const actor=f.roster.get(f.actor);part=await f.roster.prepareNativeHomeRouteProposal(f.support,{getPickTime:f.getPickTime});const owned=f.registry.status().owned.filter(r=>r.namespace==='native-gpu-motion');assert.equal(owned.length,2);
  f.advance(.2);f.sync();const next=f.planner.revalidateNativeHomeRouteProposal(f.proposal.ticket);assert.equal(next.status,'revalidated');assert.equal(part.retarget(f.supportFor(next.proposal),{retagClock:hook.retagNativeHomeRoute}),true);assert.deepEqual(f.registry.status().owned.filter(r=>r.namespace==='native-gpu-motion'),owned);assert.equal(f.roster.get(f.actor),actor);assert.equal(f.acquires,1);assert(part.cancel());f.flush();assert.equal(f.registry.status().owned.filter(r=>r.namespace==='native-gpu-motion').length,1);const restore=actor.preparePick();restore();
 }finally{part?.cancel();hook.dispose();f.close();}
});

test('Farm to Home finalization rejects a changed native association without retiring the retained owner',async()=>{
 const f=await nativeFarmMovingHomeGraphicsFixture();let part;try{
  part=await f.roster.prepareNativeHomeRouteProposal(f.support,{getPickTime:f.getPickTime});part.activate();const data=f.commitHome(),bad=structuredClone(data);bad.nativeHomeRouteBinding.assignmentSequence++;assert.throws(()=>part.validateCommit(bad));assert(part.valid());assert.equal(f.registry.status().owned.filter(r=>r.namespace==='native-gpu-motion').length,2);part.finalize(data);assert(f.planner.projectNativeHomeExecution(f.nativeState,f.worker));f.sync();f.flush();assert.equal(f.registry.status().owned.filter(r=>r.namespace==='native-gpu-motion').length,1);assert.equal(f.acquires,1);
 }finally{part?.cancel();f.close();}
});

test('Farm to Home shaders share authored banks in real color and shadow compilation',async()=>{
 const f=await nativeFarmMovingHomeGraphicsFixture({urgent:true}),gpu=new WebGPURenderer({canvas:{width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}}});gpu.hasFeature=()=>true;let part;try{
  const banks=[...f.bakes.values()].map(b=>({texture:b.texture,data:b.texture.image.data,version:b.texture.version}));part=await f.roster.prepareNativeHomeRouteProposal(f.support,{getPickTime:f.getPickTime});let tags=0;
  for(const {mesh,material} of part.request.options.materialAlternatives){const previous=mesh.material;try{
   mesh.material=material;const build=(scene,selected)=>{const saved=mesh.material;try{mesh.material=selected;const builder=gpu.backend.createNodeBuilder(mesh,gpu);builder.scene=scene;builder.camera=new PerspectiveCamera();builder.build();assert.match(builder.vertexShader,/textureLoad/);const textures=builder.getBindings().flatMap(g=>g.bindings??[]).filter(b=>b.isSampledTexture).map(b=>b.texture);assert(banks.some(b=>textures.includes(b.texture)));for(const group of builder.getBindings())for(const binding of group.bindings??[])for(const u of binding.uniforms??[]){const tag=u.nodeUniform?.node?.[Symbol.for('wild-guardians.remote-clock')];if(tag?.nativeHome){tags++;assert.deepEqual(tag.nativeHome,f.support.presentation.nativeHome);assert.equal(tag.nativeFarmArrival,undefined);assert.equal(tag.nativeStopped,undefined);}}}finally{mesh.material=saved;}};
   build(f.scene,material);const scene=new Scene(),shadow=new NodeMaterial();shadow.isShadowPassMaterial=true;shadow.colorNode=vec4(0,0,0,1);scene.overrideMaterial=shadow;let seen=false;Renderer.prototype.renderObject.call({_handleObjectFunction(object,selected){seen=true;assert.equal(selected.positionNode,material.positionNode);build(scene,selected);}},mesh,scene,{},mesh.geometry,material,null,null);assert(seen);
  }finally{mesh.material=previous;}}
  assert(tags>0);for(const b of banks){assert.equal(b.texture.image.data,b.data);assert.equal(b.texture.version,b.version);}assert.equal(f.acquires,1);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});

test('ordinary picking follows the retained Farm body then the acquired Home on the same root',async()=>{
 const f=await nativeFarmMovingHomeGraphicsFixture({urgent:true});let part;try{
  const actor=f.roster.get(f.actor),root=actor.root,anchor=root.position.clone(),camera=new PerspectiveCamera(45,1,.1,100),picker=createWebGpuPicker({scene:f.scene,camera,state:f.state,animals:{get:()=>null},workers:f.roster,cropBounds:()=>[]});
  const pick=()=>{const pose=f.body(1),y=f.residency.surface(pose.x,pose.z);camera.position.set(pose.x,y+3,pose.z+6);camera.lookAt(pose.x,y+.8,pose.z);camera.updateMatrixWorld(true);let hit=null;for(const dx of [0,-.15,.15,-.3,.3])for(const height of [.7,1,1.3,.4,1.5]){const point=new Vector3(pose.x+dx,y+height,pose.z).project(camera),result=picker.pick({x:point.x,y:point.y});if(result.entityId===f.actor){hit=result;break;}}assert(hit);assert.equal(actor.root,root);assert(root.position.equals(anchor));};
  pick();part=await f.roster.prepareNativeHomeRouteProposal(f.support,{getPickTime:f.getPickTime});f.advance(.5);f.sync();pick();assert.equal(f.planner.revalidateNativeHomeRouteProposal(f.proposal.ticket).status,'revalidated');part.activate();const data=f.commitHome();part.finalize(data);assert(f.planner.projectNativeHomeExecution(f.nativeState,f.worker));f.sync();f.flush();f.setPickTime(f.nativeState.elapsed);pick();const before=f.body(1);f.advance(1.3);assert(f.planner.projectNativeHomeExecution(f.nativeState,f.worker));f.sync();f.setPickTime(f.nativeState.elapsed);assert.notDeepEqual(f.body(1),before);pick();assert.equal(f.acquires,1);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});

test('pthread Farm to Home retains the original authored actor and acquires only its new route',async()=>{
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),runtime=await createThreadedSpatialWorld(factory);let f,part;try{
  f=await nativeFarmMovingHomeGraphicsFixture({core:runtime.core,urgent:true});const actor=f.roster.get(f.actor);part=await f.roster.prepareNativeHomeRouteProposal(f.support,{getPickTime:f.getPickTime});part.activate();part.finalize(f.commitHome());assert(f.planner.projectNativeHomeExecution(f.nativeState,f.worker));f.sync();f.flush();assert.equal(f.roster.get(f.actor),actor);assert.equal(f.worker.nativeRouteAdmission,'native-home');assert.equal(f.acquires,1);assert.equal(f.registry.status().owned.filter(r=>r.namespace==='native-gpu-motion').length,1);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f?.close();await runtime.dispose();}
});

test('altered confirmed Farm pose cannot seed Home preparation from a real held source',async()=>{
 const f=await nativeFarmMovingHomeGraphicsFixture();try{
  const body=f.body(1);f.state.workers[0].x+=.1;f.roster.sync();await assert.rejects(f.roster.prepareNativeHomeRouteProposal(f.support,{getPickTime:f.getPickTime}),/matching source worker/);assert.deepEqual(f.body(1),body);assert.equal(f.acquires,1);assert.equal(f.registry.status().owned.filter(r=>r.namespace==='native-gpu-motion').length,1);assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});
for(const mode of ['cancel','remove','changed-pose','changed-heading','changed-policy','changed-profile','changed-village'])test(`held Farm Home ${mode} preserves or invalidates its existing owner`,async()=>{
 const f=await nativeFarmMovingHomeGraphicsFixture();let part;try{
  const actor=f.roster.get(f.actor),before=meshes(actor.root),owned=f.registry.status().owned.length;part=await f.roster.prepareNativeHomeRouteProposal(f.support,{getPickTime:f.getPickTime});part.activate();
  if(mode==='cancel'){assert(part.cancel());f.flush();assert.equal(f.registry.status().owned.length,owned);for(const item of before){assert.equal(item.mesh.material,item.material);assert.equal(item.mesh.visible,item.visible);}const restore=actor.preparePick();restore();}
  else if(mode==='remove'){f.state.workers=[];f.roster.sync();assert(!part.valid());f.flush();assert.equal(f.registry.status().owned.length,0);}
  else{const worker=f.state.workers[0];if(mode==='changed-pose')worker.x+=.1;else if(mode==='changed-heading')worker.heading+=.1;else if(mode==='changed-policy')worker.contractDay--;else if(mode==='changed-profile')worker.profile=PROFILES.find(p=>p.id!==worker.profile).id;else worker.villageId='village-12345';f.roster.sync();assert(!part.valid());}
  assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});
