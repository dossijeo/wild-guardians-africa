import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {readGlb,writeGlb} from './glb-container.mjs';
import {prepareAnimalClips,animalGroundSamples,applyAnimalPose} from '../src/rendering/animal-actions.js';
const root='docs/qa/rhino-replacement/',library=JSON.parse(await readFile('content/manifests/animal-actions.json','utf8')).animals.rhino;
const current=readGlb(await readFile('public'+library.url)),reference=readGlb(execFileSync('git',['show','da18a4159:public/assets/e259880e3924f0bcba90692ebb0c810b2e5bf1f0c1ecce87348111c270d4b2fc.glb'],{maxBuffer:150*1024*1024}));
function view(g,index){const a=g.json.accessors[index],v=g.json.bufferViews[a.bufferView];return Buffer.from(g.bin.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength))}
let primaryChannels=0;
for(const clip of reference.json.animations){
 const replacement=current.json.animations.find(c=>c.name===clip.name);assert(replacement);
 for(const channel of clip.channels){
  const name=reference.json.nodes[channel.target.node].name,other=replacement.channels.find(c=>current.json.nodes[c.target.node].name===name&&c.target.path===channel.target.path);assert(other,name);
  const a=clip.samplers[channel.sampler],b=replacement.samplers[other.sampler];assert(view(reference,a.input).equals(view(current,b.input)),name+' timing changed');assert(view(reference,a.output).equals(view(current,b.output)),name+' primary motion changed');primaryChannels++;
 }
}
for(const m of current.json.materials){delete m.normalTexture;delete m.occlusionTexture;delete m.emissiveTexture;delete m.pbrMetallicRoughness?.baseColorTexture;delete m.pbrMetallicRoughness?.metallicRoughnessTexture;}
const bytes=writeGlb(current.json,current.bin),gltf=await new GLTFLoader().parseAsync(bytes.buffer,''),model=gltf.scene;model.updateMatrixWorld(true);
for(const m of reference.json.materials){delete m.normalTexture;delete m.occlusionTexture;delete m.emissiveTexture;delete m.pbrMetallicRoughness?.baseColorTexture;delete m.pbrMetallicRoughness?.metallicRoughnessTexture;}
const oldBytes=writeGlb(reference.json,reference.bin),oldGltf=await new GLTFLoader().parseAsync(oldBytes.buffer,'');
function triangles(scene,bodyOnly=false){
 const rows=[];scene.traverse(mesh=>{if(!mesh.isSkinnedMesh||(bodyOnly&&/RearCloth|RearLegSkin/.test(mesh.name)))return;const p=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv,idx=mesh.geometry.index;
 for(let i=0;i<idx.count;i+=3){const corners=[];for(let j=0;j<3;j++){const v=idx.getX(i+j);corners.push([p.getX(v),p.getY(v),p.getZ(v),uv.getX(v),uv.getY(v)].map(x=>Math.round(x*1e6)).join(','));}rows.push(corners.sort().join('|'));}});return rows;
}
const referenceTriangles=new Set(triangles(oldGltf.scene)),bodyTriangles=triangles(model,true);assert(bodyTriangles.length>13000);assert(bodyTriangles.every(t=>referenceTriangles.has(t)),'Body geometry or UV changed outside separated garment');
const cloth=[],edges=[];model.traverse(mesh=>{
 if(!mesh.isSkinnedMesh||!mesh.name.includes('RearCloth'))return;
 const s=mesh.geometry.attributes.skinIndex,w=mesh.geometry.attributes.skinWeight,idx=mesh.geometry.index,p=mesh.geometry.attributes.position,seen=new Set();
 for(let i=0;i<s.count;i++){
  const names=Array.from({length:4},(_,j)=>({name:mesh.skeleton.bones[s.getComponent(i,j)].name,weight:w.getComponent(i,j)})).filter(g=>g.weight>.001);
  assert(names.every(g=>g.name==='Hips'||g.name.startsWith('ClothRear_')),'Garment still bound to a limb');cloth.push({mesh,index:i});
 }
 for(let i=0;i<idx.count;i+=3)for(const [a,b] of [[idx.getX(i),idx.getX(i+1)],[idx.getX(i+1),idx.getX(i+2)],[idx.getX(i+2),idx.getX(i)]]){
  const key=[Math.min(a,b),Math.max(a,b)].join(',');if(seen.has(key))continue;seen.add(key);const rest=new THREE.Vector3().fromBufferAttribute(p,a).distanceTo(new THREE.Vector3().fromBufferAttribute(p,b));if(rest>.005)edges.push({mesh,a,b,rest});
 }
});assert(cloth.length>100);const bones=[];model.traverse(b=>{if(b.isBone&&b.name.startsWith('ClothRear_'))bones.push(b)});assert.equal(bones.length,15);
const clips=prepareAnimalClips(gltf.animations),data={model,mixer:new THREE.AnimationMixer(model),clips,groundSamples:animalGroundSamples(model)},hips=model.getObjectByName('Hips'),point=new THREE.Vector3(),inverse=new THREE.Matrix4();
const points=(local=false)=>{if(local)inverse.copy(hips.matrixWorld).invert();return cloth.map(({mesh,index})=>{mesh.getVertexPosition(index,point).applyMatrix4(mesh.matrixWorld);if(local)point.applyMatrix4(inverse);return point.clone()})};
const report={model:library.url,referenceRef:'da18a4159',retainedBodyTriangles:bodyTriangles.length,bodyPositionAndUv:'All retained body triangles match da18a4159 at 1e-6 precision',unchangedPrimaryAnimationChannels:primaryChannels,clothBones:bones.length,clothVertices:cloth.length,limbWeights:0,scope:'Production controller; 65 phases per clip; thigh/knee perturbation; stretch and floor checks. Offline baked simulation.',clips:[]};
for(const clip of clips){
 let minHeight=Infinity,range=0,response=0,maxEdgeExtension=0,worstEdge,initial;
 for(let phase=0;phase<65;phase++){
  const time=clip.duration*phase/65,attack=!['Walking','Running'].includes(clip.name);
  applyAnimalPose(data,attack?{species:'rhino',status:'attacking',animation:clip.name,attackId:clip.name,attackDuration:clip.duration,attackRemaining:clip.duration-time}:{species:'rhino',status:clip.name==='Running'?'entering':'walking',motionPhase:time},0);model.updateMatrixWorld(true);
  const world=points(),local=points(true);if(!initial)initial=local;
  for(let i=0;i<world.length;i++){minHeight=Math.min(minHeight,world[i].y);range=Math.max(range,local[i].distanceTo(initial[i]));}
  const a=new THREE.Vector3(),b=new THREE.Vector3();for(const e of edges){e.mesh.getVertexPosition(e.a,a);e.mesh.getVertexPosition(e.b,b);const extension=a.distanceTo(b)-e.rest;if(extension>maxEdgeExtension){maxEdgeExtension=extension;worstEdge={phase:phase/65,rest:e.rest,posed:a.distanceTo(b),indices:[e.a,e.b],positions:[e.a,e.b].map(i=>Array.from(e.mesh.geometry.attributes.position.array.slice(i*3,i*3+3)))};}}
  if(phase===20){
   const saved=['LeftUpLeg','RightUpLeg','LeftLeg','RightLeg'].map(name=>{const b=model.getObjectByName(name);return {b,q:b.quaternion.clone()}});
   for(const {b} of saved)b.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),.6));model.updateMatrixWorld(true);
   const changed=points();for(let i=0;i<changed.length;i++)response=Math.max(response,changed[i].distanceTo(world[i]));
   for(const {b,q} of saved)b.quaternion.copy(q);model.updateMatrixWorld(true);
  }
 }
 let loopPositionError=0,loopAngleError=0;
 if(['Walking','Running'].includes(clip.name))for(const track of clip.tracks.filter(t=>t.name.startsWith('ClothRear_'))){
  const n=track.getValueSize(),last=track.values.length-n;
  if(track.name.endsWith('.quaternion'))loopAngleError=Math.max(loopAngleError,new THREE.Quaternion().fromArray(track.values).normalize().angleTo(new THREE.Quaternion().fromArray(track.values,last).normalize()));
  else for(let i=0;i<n;i++)loopPositionError=Math.max(loopPositionError,Math.abs(track.values[i]-track.values[last+i]));
 }
 const row={name:clip.name,minHeight,motionInHipSpace:range,maxResponseToLegOnlyRotation:response,maxEdgeExtension,worstEdge,loopPositionError,loopAngleError};report.clips.push(row);
 await writeFile(root+'cloth-audit.json',JSON.stringify(report,null,2)+'\n');
 assert(response<1e-7,'Garment responds to legs');assert(range>.003,'Cloth motion frozen');assert(minHeight>-.015,clip.name+' cloth under floor '+minHeight);assert(maxEdgeExtension<.3,clip.name+' excessive garment stretch '+maxEdgeExtension);assert(loopPositionError<1e-5&&loopAngleError<1e-3,'Cloth loop mismatch');
}
await writeFile(root+'cloth-audit.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
