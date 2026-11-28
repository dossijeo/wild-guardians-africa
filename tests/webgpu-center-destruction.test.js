import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';import {MeshStandardNodeMaterial} from 'three/webgpu';import {createWebGpuCenterDestructionTemplate} from '../src/rendering/webgpu-center-destruction.js';import {createWebGpuAdmittedCenterDamage} from '../src/rendering/webgpu-center-damage-admission.js';
import {COLLAPSE_SECONDS} from '../src/rendering/destruction-native.js';

const effectBuffers=owner=>[[owner.group.children[2],'aOffset'],[owner.group.children[3],'aPosSize']].map(([part,name])=>{
 const buffer=part.geometry.getAttribute(name).data,count=part.geometry.instanceCount;
 return {count,bytes:Uint8Array.from(new Uint8Array(buffer.array.buffer,0,count*buffer.stride*buffer.array.BYTES_PER_ELEMENT))};
});
test('center damage keeps separate instance state and restores intact geometry after repair',()=>{const source=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(4,3,4),new MeshStandardNodeMaterial());source.add(mesh);const template=createWebGpuCenterDestructionTemplate({gltf:{scene:source},building:{seed:123},renderer:{library:{}}}),first=template.instantiate(),second=template.instantiate();first.update({status:'ruined',hp:0,maxHp:100});second.update({status:'intact',hp:100,maxHp:100});assert.equal(first.group.children[0].visible,false);assert.equal(first.group.children[1].visible,true);assert.equal(second.group.children[0].visible,true);assert.equal(second.group.children[1].visible,false);first.update({status:'intact',hp:100,maxHp:100});assert.equal(first.group.children[0].visible,true);assert.equal(first.group.children[1].visible,false);assert.throws(()=>first.update({status:'intact',hp:0,maxHp:0}),/Invalid/);first.dispose();second.dispose();template.dispose();mesh.geometry.dispose();mesh.material.dispose();});
test('admission preserves the real destruction instance across ash transitions',async()=>{
 const source=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(4,3,4),new MeshStandardNodeMaterial());source.add(mesh);
 const template=createWebGpuCenterDestructionTemplate({gltf:{scene:source},building:{seed:123},renderer:{library:{}}}),damage=template.instantiate(),objects=damage.group.children.slice(),pending=[];
 const pipelineAdmission={prepare(object){return new Promise(resolve=>pending.push({object,resolve}));}},view=createWebGpuAdmittedCenterDamage({damage,pipelineAdmission}),turn=()=>new Promise(resolve=>setImmediate(resolve));
 try{view.update({status:'intact',hp:90,maxHp:100},1);await turn();pending[0].resolve();await turn();view.update({status:'intact',hp:60,maxHp:100},2);await turn();assert.equal(pending[1].object,objects[1]);assert.equal(objects[1].visible,false);pending[1].resolve();await turn();assert.equal(objects[1].visible,true);assert.deepEqual(damage.group.children,objects);view.update({status:'ruined',hp:0,maxHp:100},3);await turn();assert.equal(objects[0].visible,false);assert.deepEqual(damage.group.children,objects);}finally{view.dispose();template.dispose();mesh.geometry.dispose();mesh.material.dispose();}
});
test('destruction smoke uses the shared terrain depth binding with a safe disabled fallback',async()=>{
 const {WebGPURenderer}=await import('three/webgpu'),{createWebGpuVfxSoftDepth}=await import('../src/rendering/webgpu-vfx-sprite-material.js'),depth=new THREE.DepthTexture(8,8),next=new THREE.DepthTexture(16,16),binding=createWebGpuVfxSoftDepth(depth),source=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(4,3,4),new MeshStandardNodeMaterial());source.add(mesh);const template=createWebGpuCenterDestructionTemplate({gltf:{scene:source},building:{seed:123},renderer:{library:{}},softDepth:binding}),damage=template.instantiate(),camera=new THREE.PerspectiveCamera(),canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas});renderer.hasFeature=()=>true;renderer.backend.renderer=renderer;
 try{damage.update({status:'intact',hp:100,maxHp:100},0);damage.update({status:'collapsing',collapseRemaining:1,hp:0,maxHp:100},1);damage.prepare(camera);assert.equal(damage.needsSoftDepth,true);damage.setSoftDepthEnabled(true);const smoke=damage.group.children[3],scene=new THREE.Scene();scene.add(damage.group);const builder=renderer.backend.createNodeBuilder(smoke,renderer);builder.scene=scene;builder.camera=camera;builder.build();assert.match(builder.fragmentShader,/textureLoad/);assert.match(builder.fragmentShader,/texture_depth_2d/);binding.setDepthTexture(next);assert.equal(binding.depthNode.value,next);damage.setSoftDepthEnabled(false);assert.throws(()=>damage.setSoftDepthEnabled(1),/Invalid/);}finally{damage.dispose();template.dispose();mesh.geometry.dispose();mesh.material.dispose();depth.dispose();next.dispose();}
});

test('retained center ruin packs the same particles as the next confirmed frame',()=>{
 const gltf=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(4,3,4),new MeshStandardNodeMaterial());
 gltf.add(mesh);
 const template=createWebGpuCenterDestructionTemplate({gltf:{scene:gltf},building:{seed:123},renderer:{library:{}}});
 const retained=template.instantiate(),ordinary=template.instantiate(),camera=new THREE.PerspectiveCamera();
 camera.position.set(6,4,8);camera.lookAt(0,0,0);
 const active={kind:'center',status:'intact',hp:140,maxHp:600};
 const damaged={...active,status:'collapsing',hp:120},ruined={...damaged,status:'ruined',hp:0,collapseRemaining:0};
 const published=3.1,end=3.21;
 const prepare=(owner,entity,time)=>{owner.update(entity,time);owner.prepare(camera);};
 try{
  for(const owner of [retained,ordinary]){
   prepare(owner,active,0);
   for(let step=1;step<62;step++)prepare(owner,{...damaged,collapseRemaining:3.25-step*.05},step*.05);
   prepare(owner,{...damaged,collapseRemaining:.11},published);
  }
  const before=effectBuffers(retained);
  assert(before.every(pack=>pack.count>0));
  prepare(ordinary,ruined,end);
  const expected=effectBuffers(ordinary);
  assert(before.every((pack,i)=>!Buffer.from(pack.bytes).equals(expected[i].bytes)));
  const record=()=>{retained.prepare(camera);return effectBuffers(retained);};
  assert.deepEqual(retained.captureRuin(published,end,record),expected);
  assert.deepEqual(effectBuffers(retained),before);
  assert.throws(()=>retained.captureRuin(published,end,()=>{record();throw Error('capture cancelled');}),/capture cancelled/);
  assert.deepEqual(effectBuffers(retained),before);
  prepare(retained,ruined,end);
  assert.deepEqual(effectBuffers(retained),expected);
 }finally{retained.dispose();ordinary.dispose();template.dispose();mesh.geometry.dispose();mesh.material.dispose();}
});

test('a center first seen during collapse reconstructs both bursts at its saved age',()=>{
 const gltf=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(4,3,4),new MeshStandardNodeMaterial());
 gltf.add(mesh);
 const template=createWebGpuCenterDestructionTemplate({gltf:{scene:gltf},building:{seed:123},renderer:{library:{}}});
 const cold=template.instantiate(),live=template.instantiate(),alreadyRuined=template.instantiate();
 const camera=new THREE.PerspectiveCamera();camera.position.set(6,4,8);camera.lookAt(0,0,0);
 const active={kind:'center',status:'intact',hp:140,maxHp:600};
 const collapsing={...active,status:'collapsing',hp:120},ruined={...collapsing,status:'ruined',hp:0,collapseRemaining:0};
 const age=COLLAPSE_SECONDS-.16,published=47.8,end=published+.16;
 const saved={...collapsing,collapseRemaining:.16};
 try{
  live.update(active,0);
  live.update({...collapsing,collapseRemaining:COLLAPSE_SECONDS},0);
  for(let step=1;step/30<age;step++)live.update({...collapsing,collapseRemaining:COLLAPSE_SECONDS-step/30},step/30);
  live.update(saved,age);live.prepare(camera);
  cold.update(saved,published);cold.prepare(camera);
  assert(cold.status().smoke>0&&cold.status().emitted>0);
  assert.deepEqual(cold.status(),live.status());
  assert.deepEqual(effectBuffers(cold),effectBuffers(live));
  const before=effectBuffers(cold);
  cold.update(saved,published);cold.prepare(camera);
  assert.deepEqual(effectBuffers(cold),before);
  const last=published+.15;
  cold.update({...saved,collapseRemaining:.01},last);
  const terminal=cold.captureRuin(last,end,()=>{cold.prepare(camera);return effectBuffers(cold);});
  assert(terminal[1].count>0);
  cold.update(ruined,end);cold.prepare(camera);
  assert.deepEqual(effectBuffers(cold),terminal);
  alreadyRuined.update(ruined,end);alreadyRuined.prepare(camera);
  assert.equal(alreadyRuined.status().smoke,0);
 }finally{cold.dispose();live.dispose();alreadyRuined.dispose();template.dispose();mesh.geometry.dispose();mesh.material.dispose();}
});

test('a replay integrates the confirmed ruin while the first damage meshes are still preparing',async()=>{
 const scene=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(4,3,4),new MeshStandardNodeMaterial());scene.add(mesh);
 const template=createWebGpuCenterDestructionTemplate({gltf:{scene},building:{seed:123},renderer:{library:{}}});
 const pending=[],live=template.instantiate(),replay=createWebGpuAdmittedCenterDamage({damage:template.instantiate(),
  pipelineAdmission:{prepare:()=>new Promise(resolve=>pending.push(resolve))}});
 const camera=new THREE.PerspectiveCamera();camera.position.set(6,4,8);camera.lookAt(0,0,0);
 const t1=47.97,published=48;
 const collapsing={kind:'center',status:'collapsing',hp:120,maxHp:600};
 const ruined={...collapsing,status:'ruined',hp:0,collapseRemaining:0};
 const turn=()=>new Promise(resolve=>setImmediate(resolve));
 try{
  for(const at of [47.8,47.85,47.9,47.95]){
   const sample={...collapsing,collapseRemaining:t1-at};
   live.update(sample,at);replay.update(sample,at);await turn();
   assert(!replay.ready&&!replay.group.visible);
  }
  live.update(ruined,t1);live.update(ruined,published);live.prepare(camera);
  replay.update(ruined,published,t1);await turn();
  assert.equal(pending.length,2);
  pending[0]();await turn();assert(!replay.ready);
  pending[1]();await turn();assert(replay.ready);replay.prepare(camera);
  assert(live.status().smoke>0&&live.status().debris>175);
  assert.deepEqual(replay.status(),live.status());
  const expected=effectBuffers(live);
  assert(effectBuffers(replay).every(({bytes},i)=>Buffer.from(bytes).equals(expected[i].bytes)),
    'the original and recovered particle buffers must agree');
 }finally{replay.dispose();live.dispose();template.dispose();mesh.geometry.dispose();mesh.material.dispose();}
});

test('a renewed center checkpoint restores active particles and later emissions on a new instance',()=>{
 const scene=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(4,3,4),new MeshStandardNodeMaterial());scene.add(mesh);
 const template=createWebGpuCenterDestructionTemplate({gltf:{scene},building:{seed:123},renderer:{library:{}}});
 const original=template.instantiate(),midway=template.instantiate(),replacement=template.instantiate();
 const camera=new THREE.PerspectiveCamera();camera.position.set(6,4,8);camera.lookAt(0,0,0);
 const center={id:'structure-2',kind:'center',status:'collapsing',hp:120,maxHp:600};
 const ruined={...center,status:'ruined',hp:0,collapseRemaining:0};
 const collapsing=elapsed=>({...center,collapseRemaining:COLLAPSE_SECONDS-elapsed});
 const at=2.5,after=COLLAPSE_SECONDS+.3;
 function compare(other){
  original.prepare(camera);other.prepare(camera);
  assert.deepEqual(other.status(),original.status());
  assert.deepEqual(effectBuffers(other),effectBuffers(original));
 }
 try{
  original.update(collapsing(0),0);
  for(let step=1;step<=50;step++)original.update(collapsing(step/20),step/20);
  const inFlight=original.exportRecoveryState(at);
  midway.update(collapsing(at),at);
  midway.restoreRecoveryState(inFlight,collapsing(at),at);
  compare(midway);
  for(let step=51;step/20<COLLAPSE_SECONDS;step++)for(const owner of [original,midway])owner.update(collapsing(step/20),step/20);
  for(const owner of [original,midway]){owner.update(ruined,COLLAPSE_SECONDS);owner.update(ruined,after);}
  compare(midway);
  const cut=original.exportRecoveryState(after);
  assert(cut.smoke.length>0&&cut.debris.length>0);
  const secondView=camera.clone();secondView.position.set(-7,4,-10);secondView.lookAt(0,0,0);
  original.prepare(secondView);
  assert(original.exportRecoveryState(after).smoke.every((particle,i)=>particle.phase===cut.smoke[i].phase),
   'packing smoke for another camera must preserve the checkpoint order');
  replacement.update(ruined,after);replacement.prepare(camera);assert.equal(replacement.status().smoke,0);
  assert.throws(()=>replacement.restoreRecoveryState({...cut,seed:124},ruined,after),/Invalid center destruction recovery state/);
  const malformed=structuredClone(cut);malformed.smoke[0].p[0]=NaN;
  assert.throws(()=>replacement.restoreRecoveryState(malformed,ruined,after),/Invalid center destruction recovery state/);
  assert.equal(replacement.status().smoke,0);
  replacement.restoreRecoveryState(cut,ruined,after);compare(replacement);
  const serialized=structuredClone(cut);cut.debris[0].p[0]+=100;
  assert.deepEqual(replacement.exportRecoveryState(after),serialized);
  for(const elapsed of [after+.05,after+.5,after+6]){
   original.update(ruined,elapsed);replacement.update(ruined,elapsed);compare(replacement);
  }
 }finally{replacement.dispose();midway.dispose();original.dispose();template.dispose();mesh.geometry.dispose();mesh.material.dispose();}
});
