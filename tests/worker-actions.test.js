import {createWateringEmitter} from '../src/rendering/watering-emitter.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {workerPose,applyWorkerPose,nativeCrate} from '../src/rendering/worker-actions.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const libraries=JSON.parse(readFileSync(new URL('../public/content/worker-actions.json',import.meta.url),'utf8'));
function geometryOnlyGlb(buffer){
  const size=buffer.readUInt32LE(12),doc=JSON.parse(buffer.subarray(20,20+size));
  // Node has no image decoder. Keep native geometry, skins and action channels
  // intact; texture appearance is verified separately in the browser.
  for(const material of doc.materials){
    delete material.normalTexture;delete material.occlusionTexture;delete material.emissiveTexture;
    delete material.pbrMetallicRoughness?.baseColorTexture;delete material.pbrMetallicRoughness?.metallicRoughnessTexture;
  }
  const json=Buffer.from(JSON.stringify(doc)),length=Math.ceil(json.length/4)*4,bin=buffer.subarray(20+size);
  const output=Buffer.alloc(20+length+bin.length,32);buffer.copy(output,0,0,20);output.writeUInt32LE(output.length,8);output.writeUInt32LE(length,12);json.copy(output,20);bin.copy(output,20+length);
  return output.buffer.slice(output.byteOffset,output.byteOffset+output.length);
}
for(const [profile,library] of Object.entries(libraries))test(`${profile}: Three loads and applies every native action to its real rig`,async()=>{
  const buffer=readFileSync(new URL('../public'+library.url,import.meta.url));
  const gltf=await new GLTFLoader().parseAsync(geometryOnlyGlb(buffer),'');
  const mixer=new THREE.AnimationMixer(gltf.scene);let skins=0;
  gltf.scene.traverse(node=>{if(node.isSkinnedMesh)skins++;});assert.ok(skins>0);
  gltf.scene.updateMatrixWorld(true);const rest=new Map();gltf.scene.traverse(node=>{if(node.isBone)rest.set(node,[...node.matrixWorld.elements]);});
  for(const clip of gltf.animations){
    const action=mixer.clipAction(clip);action.reset().play();action.paused=true;action.time=clip.duration*.55;mixer.update(0);gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse(node=>{
      assert.ok(node.matrixWorld.elements.every(Number.isFinite),`${clip.name}/${node.name}`);
      if(node.isSkinnedMesh){node.skeleton.update();assert.ok(node.skeleton.boneMatrices.every(Number.isFinite));}
    });action.stop();
  }
  const data={mixer,clips:gltf.animations,name:null};
  applyWorkerPose(data,{profile,status:'acting',actionRemaining:1.5},{kind:'water'},1,library);
  gltf.scene.updateMatrixWorld(true);let moved=false;
  for(const [bone,matrix] of rest)if(bone.matrixWorld.elements.some((v,i)=>Math.abs(v-matrix[i])>1e-5))moved=true;
  assert.ok(moved,'Native action must change the rig, not leave a bind pose');
  assert.ok(gltf.scene.getObjectByName('Prop_WateringCan').scale.length()>1);
  assert.ok(gltf.scene.getObjectByName('Prop_FruitCrate').scale.length()<.001);
  applyWorkerPose(data,{profile,status:'carrying'},null,1,library);
  assert.ok(gltf.scene.getObjectByName('Prop_FruitCrate').scale.length()>1);
  assert.ok(gltf.scene.getObjectByName('Prop_WateringCan').scale.length()<.001);
  const crate=nativeCrate(gltf),box=new THREE.Box3().setFromObject(crate),size=box.getSize(new THREE.Vector3());
  assert.ok(size.x>.2&&size.y>.1&&size.z>.2,'Dropped crate must preserve full native geometry');
  assert.ok(Math.abs(box.min.y)<1e-5,'Dropped crate rests on the terrain');
});
for(const [profile,library] of Object.entries(libraries))test(`${profile}: native action tracks are finite and preserve their last key`,()=>{
  const buffer=readFileSync(new URL('../public'+library.url,import.meta.url)),size=buffer.readUInt32LE(12),doc=JSON.parse(buffer.subarray(20,20+size));
  const binary=buffer.subarray(28+size);
  assert.equal(doc.animations.length,12);assert.equal(doc.skins[0].joints.length,28);
  for(const animation of doc.animations)for(const sampler of animation.samplers){
    const times=doc.accessors[sampler.input],values=doc.accessors[sampler.output],view=doc.bufferViews[times.bufferView];
    assert.equal(times.count,values.count);
    const offset=(view.byteOffset??0)+(times.byteOffset??0);let last=-Infinity;
    for(let i=0;i<times.count;i++){const t=binary.readFloatLE(offset+i*4);assert.ok(Number.isFinite(t)&&t>last);last=t;}
    assert.ok(Math.abs(last-library.actions[animation.name].duration)<1e-5);
    const valueView=doc.bufferViews[values.bufferView],n={VEC3:3,VEC4:4}[values.type];
    const start=(valueView.byteOffset??0)+(values.byteOffset??0);
    for(let i=0;i<values.count*n;i++)assert.ok(Number.isFinite(binary.readFloatLE(start+i*4)));
  }
});
test('Combined initial work shows planting followed by first watering for both age speeds',()=>{
  for(const profile of ['olderMale','youngFemale']){
    const speed=profile==='youngFemale'?1.5:1,library=libraries[profile];
    const worker={profile,status:'acting',actionRemaining:(7.2-3)/speed};
    assert.equal(workerPose(worker,{kind:'initial'},0,library).name,'Plant');
    worker.actionRemaining=(7.2-4.8)/speed;
    const pose=workerPose(worker,{kind:'initial'},0,library);assert.equal(pose.name,'Water');assert.ok(Math.abs(pose.time-1)<1e-5);
  }
});
test('Incapacitation retreats using slowed Run; first hit holds the native Fall instead',()=>{
  const library=libraries.olderMale;
  assert.equal(workerPose({profile:'olderMale',status:'incapacitated',incapacitated:true},null,1,library).name,'Run');
  assert.equal(workerPose({profile:'olderMale',status:'fleeing',fallRemaining:2},null,1,library).name,'Fall');
});
test('Carrying uses the original crate and idle uses the supplied resting pose',()=>{
  const library=libraries.olderFemale;
  assert.equal(workerPose({profile:'olderFemale',status:'carrying'},null,0,library).name,'Carry_Crate');
  assert.equal(workerPose({profile:'olderFemale',status:'idle'},null,0,library).name,'Idle');
});

for(const [profile,library] of Object.entries(libraries))test(`${profile}: cached water emitter follows the actual animated nozzle holes`,async()=>{
  const gltf=await new GLTFLoader().parseAsync(geometryOnlyGlb(readFileSync(new URL('../public'+library.url,import.meta.url))),'');
  const sample=createWateringEmitter(gltf),nozzle=gltf.scene.getObjectByName('Can_Nozzle'),clip=gltf.animations.find(c=>c.name==='Water'),mixer=new THREE.AnimationMixer(gltf.scene),action=mixer.clipAction(clip).play();action.paused=true;
  const origin=new THREE.Vector3(),outward=new THREE.Vector3(),actual=new THREE.Vector3(),direction=new THREE.Vector3();
  for(let i=0;i<90;i++){
    const time=(.52+i/89*1.554)/4.3*clip.duration;
    action.time=time;mixer.update(0);gltf.scene.updateMatrixWorld(true);actual.set(0,.023,0).applyMatrix4(nozzle.matrixWorld);gltf.scene.worldToLocal(actual);direction.set(0,1,0).transformDirection(nozzle.matrixWorld);
    sample(time/clip.duration,origin,outward);
    assert.ok(origin.distanceTo(actual)<.003,`${profile}: nozzle offset ${origin.distanceTo(actual)} at ${time}`);
    assert.ok(outward.dot(direction)>.999,`${profile}: water travels out of nozzle`);
  }
  action.stop();mixer.uncacheRoot(gltf.scene);
});
