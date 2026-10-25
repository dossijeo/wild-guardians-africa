import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {readGlb,writeGlb} from './glb-container.mjs';
import {prepareAnimalClips,animalGroundSamples,applyAnimalPose} from '../src/rendering/animal-actions.js';
const species=process.argv[2]??'hyena';
const root=new URL('../',import.meta.url),library=JSON.parse(await readFile(new URL('content/manifests/animal-actions.json',root),'utf8')).animals[species];
const {json,bin}=readGlb(await readFile(new URL('public'+library.url,root)));
for(const m of json.materials){delete m.normalTexture;delete m.pbrMetallicRoughness.baseColorTexture;}
const bytes=writeGlb(json,bin),gltf=await new GLTFLoader().parseAsync(bytes.buffer,''),model=gltf.scene;
model.updateMatrixWorld(true);
const clips=prepareAnimalClips(gltf.animations),data={model,mixer:new THREE.AnimationMixer(model),clips,groundSamples:animalGroundSamples(model)};
const meshes=[];model.traverse(m=>{if(m.isSkinnedMesh)meshes.push(m);});
const v=new THREE.Vector3(),report={url:library.url,clips:[],soleVertices:[],scope:'Native production animation controller, 129 phases per clip. Geometry-only GLTF load in Node; GPU and textures checked separately in game.'};
const head=model.getObjectByName('Head'),bindHead=head.getWorldQuaternion(new THREE.Quaternion()),headQ=new THREE.Quaternion(),gaze=new THREE.Vector3();
for(const name of ['LeftFoot','RightFoot']){
 const points=[];
 for(const mesh of meshes){
  const p=mesh.geometry.attributes.position,weights=mesh.geometry.attributes.skinWeight,indices=mesh.geometry.attributes.skinIndex;
  const joint=mesh.skeleton.bones.findIndex(b=>b.name===name);let min=Infinity;
  for(let i=0;i<p.count;i++)if(indices.getX(i)===joint&&weights.getX(i)>.999)min=Math.min(min,p.getY(i));
  for(let i=0;i<p.count;i++)if(indices.getX(i)===joint&&weights.getX(i)>.999&&Math.abs(p.getY(i)-min)<.00001)points.push({mesh,index:i});
 }
 assert(points.length>=3,`No flat sole for ${name}`);report.soleVertices.push({name,count:points.length,points});
}
// Check rigid Neck weights. These vertices follow a single bone, so limb
// animation cannot deform their position relative to that bone.
let rigidNeck=0;
for(const mesh of meshes){const s=mesh.geometry.attributes.skinIndex,w=mesh.geometry.attributes.skinWeight,j=mesh.skeleton.bones.findIndex(b=>b.name==='Neck');for(let i=0;i<s.count;i++)if(s.getX(i)===j&&w.getX(i)>.999)rigidNeck++;}
if(['warthog','hyena'].includes(species))assert(rigidNeck>=500);report.rigidNeckVertices=rigidNeck;
for(const clip of clips){
 let minGround=Infinity,maxRaisedFoot=-Infinity,maxSupportClearance=-Infinity,maxSoleSpread=0,minGazePitch=Infinity,maxGazePitch=-Infinity;
 for(let phase=0;phase<129;phase++){
  const time=clip.duration*phase/129,attack=!['Walking','Running'].includes(clip.name);
  if(clip.name==='restpose'){
   data.action?.stop();data.key=null;data.mixer.stopAllAction();data.mixer.clipAction(clip).play();data.mixer.setTime(time);model.position.y=0;
  }else applyAnimalPose(data,attack?{species,status:'attacking',animation:clip.name,attackId:clip.name,attackDuration:clip.duration,attackRemaining:clip.duration-time}:{species,status:clip.name==='Running'?'entering':'walking',motionPhase:time},0);
  model.updateMatrixWorld(true);
  head.getWorldQuaternion(headQ).multiply(bindHead.clone().invert());gaze.set(0,0,1).applyQuaternion(headQ);
  const pitch=THREE.MathUtils.radToDeg(Math.atan2(gaze.y,Math.hypot(gaze.x,gaze.z)));minGazePitch=Math.min(minGazePitch,pitch);maxGazePitch=Math.max(maxGazePitch,pitch);
  let support=Infinity;
  for(const sole of report.soleVertices){
   let lo=Infinity,hi=-Infinity;
   for(const {mesh,index} of sole.points){mesh.getVertexPosition(index,v).applyMatrix4(mesh.matrixWorld);lo=Math.min(lo,v.y);hi=Math.max(hi,v.y);}
   maxSoleSpread=Math.max(maxSoleSpread,hi-lo);minGround=Math.min(minGround,lo);maxRaisedFoot=Math.max(maxRaisedFoot,lo);support=Math.min(support,lo);
  }
  maxSupportClearance=Math.max(maxSupportClearance,support);
 }
 report.clips.push({name:clip.name,duration:clip.duration,minGround,maxRaisedFoot,maxSupportClearance,maxSoleSpread,gazePitchDegrees:[minGazePitch,maxGazePitch]});
 assert(maxSoleSpread<(['buffalo','lion','rhino'].includes(species)?.003:.01),`${clip.name}: sole tilted/warped ${maxSoleSpread}`);
 if(clip.name!=='restpose')assert(minGround>=.0219,`${clip.name}: ground penetration ${minGround}`);
 assert(maxSupportClearance<.06,`${clip.name}: floating support ${maxSupportClearance}`);
 if(['Walking','Running'].includes(clip.name))assert(maxGazePitch-minGazePitch>.1,`${clip.name}: head movement frozen`);
}
for(const sole of report.soleVertices)delete sole.points;
await writeFile(new URL(`docs/qa/${species}-replacement/animation-audit.json`,root),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
