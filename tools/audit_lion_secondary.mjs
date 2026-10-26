import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {readGlb,writeGlb} from './glb-container.mjs';
import {prepareAnimalClips,animalGroundSamples,applyAnimalPose} from '../src/rendering/animal-actions.js';
const library=JSON.parse(await readFile('content/manifests/animal-actions.json','utf8')).animals.lion;
const {json,bin}=readGlb(await readFile('public'+library.url));
for(const m of json.materials){delete m.normalTexture;delete m.occlusionTexture;delete m.emissiveTexture;delete m.pbrMetallicRoughness?.baseColorTexture;delete m.pbrMetallicRoughness?.metallicRoughnessTexture;}
const bytes=writeGlb(json,bin),gltf=await new GLTFLoader().parseAsync(bytes.buffer,''),model=gltf.scene;model.updateMatrixWorld(true);
const repair=JSON.parse(await readFile('docs/qa/lion-replacement/repair.json','utf8')),scale=repair.scale,lowest=Math.min(...repair.feet.map(f=>f.floor));
const cloth=[],tail=[];let clothCount=0,tailRootCount=0;
model.traverse(mesh=>{
 if(!mesh.isSkinnedMesh)return;
 const s=mesh.geometry.attributes.skinIndex,w=mesh.geometry.attributes.skinWeight;
 for(let i=0;i<s.count;i++){
  const names=Array.from({length:4},(_,j)=>({name:mesh.skeleton.bones[s.getComponent(i,j)].name,weight:w.getComponent(i,j)})).filter(g=>g.weight>.001);
  if(mesh.name.includes('RearCloth')){assert(names.every(g=>g.name==='Hips'||g.name.startsWith('ClothRear_')),'Cloth still bound to limb');clothCount++;cloth.push({mesh,index:i});}
  const pos=mesh.geometry.attributes.position,x=pos.getX(i)/scale,y=-pos.getZ(i)/scale,z=pos.getY(i)/scale+lowest;
  const root=!mesh.name.includes('RearCloth')&&y>.105&&z>=.445&&z<.475&&Math.abs(x)<.065;
  if(root){assert(names.every(g=>g.name==='Hips'),'Tail bulb still follows a thigh');tailRootCount++;}
  if(root||names.some(g=>g.name.startsWith('Tail_'))){assert(names.every(g=>g.name==='Hips'||g.name.startsWith('Tail_')),'Tail still bound to limb');tail.push({mesh,index:i});}
 }
});
assert(clothCount>100&&tail.length>100&&tailRootCount>20);
const hipBind=model.getObjectByName('Hips').matrixWorld.clone(),edges=[];
model.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const p=mesh.geometry.attributes.position,idx=mesh.geometry.index,seen=new Set();for(let i=0;i<idx.count;i+=3)for(const [a,b] of [[idx.getX(i),idx.getX(i+1)],[idx.getX(i+1),idx.getX(i+2)],[idx.getX(i+2),idx.getX(i)]]){const key=[Math.min(a,b),Math.max(a,b)].join(',');if(seen.has(key))continue;seen.add(key);const rest=new THREE.Vector3().fromBufferAttribute(p,a).distanceTo(new THREE.Vector3().fromBufferAttribute(p,b));if(rest>.005)edges.push({mesh,a,b,rest})}});
const clips=prepareAnimalClips(gltf.animations),data={model,mixer:new THREE.AnimationMixer(model),clips,groundSamples:animalGroundSamples(model)},hips=model.getObjectByName('Hips'),p=new THREE.Vector3(),inverse=new THREE.Matrix4();
const lower=[];model.traverse(b=>{if(b.isBone&&/^ClothRear_.*_03$/.test(b.name))lower.push(b)});assert.equal(lower.length,4);
const points=(selection,local=false)=>{if(local)inverse.copy(hips.matrixWorld).invert();return selection.map(({mesh,index})=>{mesh.getVertexPosition(index,p).applyMatrix4(mesh.matrixWorld);if(local)p.applyMatrix4(inverse);return p.clone()})};
const report={model:library.url,clothVertices:clothCount,tailVertices:tail.length,tailRootWaistVertices:tailRootCount,clothLimbWeights:0,tailLimbWeights:0,clips:[]};
for(const clip of clips){
 let minFootSpacing=Infinity,maxEdgeExtension=0;let minCloth=Infinity,minTail=Infinity,clothRange=0,tailRange=0,legResponse=0,initialCloth,initialTail;
 for(let phase=0;phase<65;phase++){
  const time=clip.duration*phase/65,attack=!['Walking','Running'].includes(clip.name);
  applyAnimalPose(data,attack?{species:'lion',status:'attacking',animation:clip.name,attackId:clip.name,attackDuration:clip.duration,attackRemaining:clip.duration-time}:{species:'lion',status:clip.name==='Running'?'entering':'walking',motionPhase:time},0);model.updateMatrixWorld(true);
  const v1=new THREE.Vector3(),v2=new THREE.Vector3();
  for(const e of edges){e.mesh.getVertexPosition(e.a,v1);e.mesh.getVertexPosition(e.b,v2);maxEdgeExtension=Math.max(maxEdgeExtension,v1.distanceTo(v2)-e.rest);}
  if(!attack){
   const inverseDelta=new THREE.Matrix4().multiplyMatrices(hips.matrixWorld,hipBind.clone().invert()).invert();
   const left=model.getObjectByName('LeftFoot').getWorldPosition(v1).applyMatrix4(inverseDelta),right=model.getObjectByName('RightFoot').getWorldPosition(v2).applyMatrix4(inverseDelta);
   minFootSpacing=Math.min(minFootSpacing,left.x-right.x);
  }
  const clothWorld=points(cloth),tailWorld=points(tail),clothLocal=points(cloth,true),tailLocal=points(tail,true);
  for(const p of clothWorld)minCloth=Math.min(minCloth,p.y);for(const p of tailWorld)minTail=Math.min(minTail,p.y);
  if(!initialCloth){initialCloth=clothLocal;initialTail=tailLocal;}
  for(let i=0;i<cloth.length;i++)clothRange=Math.max(clothRange,clothLocal[i].distanceTo(initialCloth[i]));
  for(let i=0;i<tail.length;i++)tailRange=Math.max(tailRange,tailLocal[i].distanceTo(initialTail[i]));
  if(phase===20){
   const saved=['LeftUpLeg','RightUpLeg','LeftLeg','RightLeg'].map(name=>{const b=model.getObjectByName(name);return {b,q:b.quaternion.clone()}});
   for(const {b} of saved)b.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),.6));model.updateMatrixWorld(true);
   const changed=[...points(cloth),...points(tail)],before=[...clothWorld,...tailWorld];for(let i=0;i<changed.length;i++)legResponse=Math.max(legResponse,changed[i].distanceTo(before[i]));
   for(const {b,q} of saved)b.quaternion.copy(q);model.updateMatrixWorld(true);
  }
 }
 let loopPositionError=0,loopAngleError=0;
 if(['Walking','Running'].includes(clip.name))for(const track of clip.tracks.filter(t=>/ClothRear_|Tail_/.test(t.name))){
  const n=track.getValueSize(),last=track.values.length-n;
  if(track.name.endsWith('.quaternion'))loopAngleError=Math.max(loopAngleError,new THREE.Quaternion().fromArray(track.values,0).normalize().angleTo(new THREE.Quaternion().fromArray(track.values,last).normalize()));
  else for(let j=0;j<n;j++)loopPositionError=Math.max(loopPositionError,Math.abs(track.values[j]-track.values[last+j]));
 }
 assert(loopPositionError<1e-5&&loopAngleError<1e-3,'Secondary loop endpoint mismatch');
 assert(!['Walking','Running'].includes(clip.name)||minFootSpacing>.18,`${clip.name}: crossed or narrow foot tracks ${minFootSpacing}`);
 assert(maxEdgeExtension<.45,`${clip.name}: excessive skin edge stretch ${maxEdgeExtension}`);
 const row={minFootSpacing:Number.isFinite(minFootSpacing)?minFootSpacing:null,maxEdgeExtension,loopPositionError,loopAngleError,name:clip.name,minClothHeight:minCloth,minTailHeight:minTail,clothMotionInHipSpace:clothRange,tailMotionInHipSpace:tailRange,maxResponseToLegOnlyRotation:legResponse};report.clips.push(row);
 assert(legResponse<1e-7,`${clip.name}: secondary geometry responds to thigh rotations`);
 assert(!['Walking','Running'].includes(clip.name)||clothRange<.4,`${clip.name}: hanging cloth flips excessively ${clothRange}`);
 assert(clothRange>.003&&tailRange>.003,`${clip.name}: secondary motion frozen`);
 assert(minCloth>-.015,`${clip.name}: cloth under floor ${minCloth}`);assert(minTail>.01,`${clip.name}: tail under floor ${minTail}`);
}
await writeFile('docs/qa/lion-replacement/secondary-audit.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
