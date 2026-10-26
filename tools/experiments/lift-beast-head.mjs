// Offline quaternion-only correction. Original mesh, rig, textures, cloth and
// all non-head channels remain byte-identical; no runtime pose modifier.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {readGlb,writeGlb} from '../glb-container.mjs';
const species=process.argv[2]??'lion',degrees=Number(process.argv[3]??15);
assert(Number.isFinite(degrees)&&degrees>=0&&degrees<=30);
const library=JSON.parse(await readFile('content/manifests/animal-actions.json','utf8')).animals[species];
const original=await readFile(process.argv[4]??'public'+library.url),{json,bin}=readGlb(original);
const source='/assets/'+createHash('sha256').update(original).digest('hex')+'.glb';
assert(!json.asset.extras?.wildHeadPosture,'Already corrected: use the original GLB from the integration baseline');
const geometry=structuredClone(json);for(const m of geometry.materials??[]){delete m.normalTexture;delete m.pbrMetallicRoughness?.baseColorTexture;}
const bytes=writeGlb(geometry,bin),gltf=await new GLTFLoader().parseAsync(bytes.buffer,'');
const model=gltf.scene;model.updateMatrixWorld(true);
const head=model.getObjectByName('Head'),torso=model.getObjectByName('Spine2');assert(head&&torso);
const bindTorsoInverse=torso.getWorldQuaternion(new THREE.Quaternion()).invert();
const neckDegrees=degrees*2/3;
const mixer=new THREE.AnimationMixer(model),append=[],report={species,source,degrees,neckDegrees,channels:[],invariants:'Only Neck/Head rotation sampler outputs replaced; original BIN retained byte-for-byte, nodes/skins/meshes/materials/images unchanged.'};
let offset=Math.ceil(bin.byteLength/4)*4;
function accessorValues(index){const a=json.accessors[index],v=json.bufferViews[a.bufferView];assert.equal(a.componentType,5126);assert(!a.sparse&&!v.byteStride);return new Float32Array(bin.buffer,bin.byteOffset+(v.byteOffset??0)+(a.byteOffset??0),a.count*(a.type==='VEC4'?4:1));}
for(const animation of json.animations){
 if(animation.name==='restpose')continue;
 for(const boneName of ['Neck','Head']){
 const bone=model.getObjectByName(boneName);
 const channel=animation.channels.find(c=>json.nodes[c.target.node].name===boneName&&c.target.path==='rotation');assert(channel);
 const sampler=animation.samplers[channel.sampler];assert(['LINEAR',undefined].includes(sampler.interpolation));
 const times=accessorValues(sampler.input),values=new Float32Array(times.length*4);
 mixer.stopAllAction();const clip=gltf.animations.find(c=>c.name===animation.name);const action=mixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();
 let previous=null;
 for(let i=0;i<times.length;i++){
  mixer.setTime(times[i]);model.updateMatrixWorld(true);
  const torsoDelta=torso.getWorldQuaternion(new THREE.Quaternion()).multiply(bindTorsoInverse);
  const axis=new THREE.Vector3(1,0,0).applyQuaternion(torsoDelta);
  const rotation=new THREE.Quaternion().setFromAxisAngle(axis,-THREE.MathUtils.degToRad(boneName==='Neck'?neckDegrees:degrees)).multiply(bone.getWorldQuaternion(new THREE.Quaternion()));
  const parent=bone.parent.getWorldQuaternion(new THREE.Quaternion());
  if(boneName==='Head')parent.premultiply(new THREE.Quaternion().setFromAxisAngle(axis,-THREE.MathUtils.degToRad(neckDegrees)));
  rotation.premultiply(parent.invert()).normalize();
  if(previous&&previous.dot(rotation)<0)rotation.set(-rotation.x,-rotation.y,-rotation.z,-rotation.w);
  rotation.toArray(values,i*4);previous=rotation.clone();
 }
 const view=json.bufferViews.length;json.bufferViews.push({buffer:0,byteOffset:offset,byteLength:values.byteLength});
 const accessor=json.accessors.length;json.accessors.push({bufferView:view,componentType:5126,count:times.length,type:'VEC4'});
 sampler.output=accessor;append.push({offset,data:new Uint8Array(values.buffer)});offset+=values.byteLength;
 report.channels.push({clip:animation.name,bone:boneName,keys:times.length,duration:clip.duration});
 }
}
const combined=new Uint8Array(offset);combined.set(bin);for(const part of append)combined.set(part.data,part.offset);json.buffers[0].byteLength=offset;
json.asset.extras={...json.asset.extras,wildHeadPosture:{tool:'tools/experiments/lift-beast-head.mjs',headDegrees:degrees,neckDegrees,source}};
await mkdir('.codex-tmp/beast-head',{recursive:true});const output=`.codex-tmp/beast-head/${species}-${degrees}.glb`;
await writeFile(output,writeGlb(json,combined));await writeFile(output+'.json',JSON.stringify(report,null,2)+'\n');console.log(output);
