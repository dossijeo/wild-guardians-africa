// Offline bind-space transfer. Production meshes and native clips are untouched.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {AnimationMixer,AnimationClip,QuaternionKeyframeTrack,VectorKeyframeTrack,LoopOnce,Vector3,Quaternion} from 'three';
import {BeastRecovery} from '../../src/rendering/beast-recovery.js';
const [sourcePath,targetPath,output]=process.argv.slice(2);
if(!output)throw Error('Usage: node tools/guardian/retarget_stand_up.mjs source.glb target.glb output.json');
function geometryOnly(bytes){
 const n=bytes.readUInt32LE(12),g=JSON.parse(bytes.subarray(20,20+n));
 for(const m of g.materials??[]){delete m.normalTexture;delete m.occlusionTexture;delete m.emissiveTexture;delete m.pbrMetallicRoughness?.baseColorTexture;delete m.pbrMetallicRoughness?.metallicRoughnessTexture;delete m.extensions;}
 const json=Buffer.from(JSON.stringify(g)),size=Math.ceil(json.length/4)*4,bin=bytes.subarray(20+n),out=Buffer.alloc(20+size+bin.length,32);bytes.copy(out,0,0,20);out.writeUInt32LE(out.length,8);out.writeUInt32LE(size,12);json.copy(out,20);bin.copy(out,20+size);return out.buffer.slice(out.byteOffset,out.byteOffset+out.length);
}
await MeshoptDecoder.ready;
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),sourceBytes=fs.readFileSync(sourcePath),targetBytes=fs.readFileSync(targetPath);
const source=await loader.parseAsync(geometryOnly(sourceBytes),''),target=await loader.parseAsync(geometryOnly(targetBytes),'');
const canonical=name=>name.replace(/^mixamorig[:_]?/,'').replace('HeadTop_End','Head_top');
function bones(root){const result=new Map();root.updateMatrixWorld(true);root.traverse(b=>{if(b.isBone)result.set(canonical(b.name),{bone:b,p:b.getWorldPosition(new Vector3()),q:b.getWorldQuaternion(new Quaternion()).normalize(),localP:b.position.clone(),localQ:b.quaternion.clone()});});return result;}
const from=bones(source.scene),to=bones(target.scene),clip=source.animations.find(c=>c.name==='Stand_Up1');if(!clip)throw Error('Missing Stand_Up1');
for(const name of ['Hips','Spine','Head','LeftArm','RightArm','LeftUpLeg','RightUpLeg'])if(!from.has(name)||!to.has(name))throw Error('Missing required mapping '+name);
const ratio=to.get('Hips').p.y/from.get('Hips').p.y;if(!(ratio>.1&&ratio<10))throw Error('Unsupported rig units '+ratio);
const endpoints=new Map();for(const side of ['Left','Right'])for(const [a,b]of [['Shoulder','Arm'],['Arm','ForeArm'],['ForeArm','Hand'],['UpLeg','Leg'],['Leg','Foot']])endpoints.set(side+a,side+b);
const mapped=[...to].filter(([name])=>from.has(name)),samples=BeastRecovery.contactSamples(target.scene),mixer=new AnimationMixer(source.scene),action=mixer.clipAction(clip).setLoop(LoopOnce,1);action.clampWhenFinished=true;action.play();
const secondary=[...to].filter(([name])=>/^ClothRear_.*_0[1-3]$/.test(name)),animated=[...mapped,...secondary];
// The donor's anatomical ankle bind axes do not describe a planted sole on
// the repaired game rigs. Calibrate relative ankle motion from the authored
// standing endpoint, retaining the target's own horizontal resting sole.
mixer.setTime(clip.duration);source.scene.updateMatrixWorld(true);
const ankleReference=new Map(['LeftFoot','RightFoot'].map(name=>[name,from.get(name).bone.getWorldQuaternion(new Quaternion()).normalize()]));
const times=[],values=new Map(animated.map(([name])=>[name,[]])),hipValues=[],ground=[];
const limitingBones=[];
const q=new Quaternion(),parentQ=new Quaternion(),delta=new Quaternion(),p=new Vector3(),desired=new Vector3(),posed=new Vector3(),v=new Vector3();
const frames=Math.ceil(clip.duration*60);
function aim(bone,tip,targetPoint){
 const start=bone.getWorldPosition(new Vector3()),current=tip.getWorldPosition(new Vector3()).sub(start).normalize(),wanted=targetPoint.clone().sub(start).normalize();
 const rotation=new Quaternion().setFromUnitVectors(current,wanted).multiply(bone.getWorldQuaternion(new Quaternion()).normalize());
 bone.quaternion.copy(bone.parent.getWorldQuaternion(new Quaternion()).normalize().invert().multiply(rotation));bone.updateWorldMatrix(false,true);
}
function supportAppendages(){
 for(const [name,item]of secondary){
  const bone=item.bone,child=bone.children.find(b=>b.isBone),start=bone.getWorldPosition(new Vector3());
  const end=child?child.getWorldPosition(new Vector3()):start.clone().add(start.clone().sub(bone.parent.getWorldPosition(new Vector3())));
  const direction=end.clone().sub(start),length=direction.length();if(length<1e-5)continue;
  const clearance=.045;if(end.y>=clearance)continue;
  const vertical=Math.min(.98,Math.max(-.98,(clearance-start.y)/length)),horizontal=Math.hypot(direction.x,direction.z);
  const wanted=new Vector3(horizontal>1e-6?direction.x/horizontal:1,0,horizontal>1e-6?direction.z/horizontal:0).multiplyScalar(Math.sqrt(1-vertical*vertical));wanted.y=vertical;
  const rotation=new Quaternion().setFromUnitVectors(direction.normalize(),wanted).multiply(bone.getWorldQuaternion(new Quaternion()).normalize());
  bone.quaternion.copy(bone.parent.getWorldQuaternion(new Quaternion()).normalize().invert().multiply(rotation));bone.updateWorldMatrix(false,true);
 }
}
function supportHand(side){
 const upper=to.get(side+'Arm').bone,elbow=to.get(side+'ForeArm').bone,hand=to.get(side+'Hand').bone;
 let bottom=Infinity;for(const {mesh,index}of samples){const indices=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight;let best=0;for(let k=1;k<4;k++)if(weights.getComponent(index,k)>weights.getComponent(index,best))best=k;let bone=mesh.skeleton.bones[indices.getComponent(index,best)];while(bone&&bone!==hand)bone=bone.parent;if(bone===hand){mesh.getVertexPosition(index,v).applyMatrix4(mesh.matrixWorld);bottom=Math.min(bottom,v.y);}}
 if(bottom>=0)return;
 const start=upper.getWorldPosition(new Vector3()),knee=elbow.getWorldPosition(new Vector3()),end=hand.getWorldPosition(new Vector3()),orientation=hand.getWorldQuaternion(new Quaternion()).normalize(),goal=end.clone();goal.y-=bottom;
 const l1=start.distanceTo(knee),l2=knee.distanceTo(end),axis=goal.clone().sub(start),distance=Math.max(Math.abs(l1-l2)+1e-5,Math.min(l1+l2-1e-5,axis.length()));axis.normalize();
 const pole=knee.clone().sub(start).addScaledVector(axis,-knee.clone().sub(start).dot(axis)).normalize(),along=(l1*l1-l2*l2+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,l1*l1-along*along));
 const desiredKnee=start.clone().addScaledVector(axis,along).addScaledVector(pole,height);goal.copy(start).addScaledVector(axis,distance);
 aim(upper,elbow,desiredKnee);aim(elbow,hand,goal);hand.quaternion.copy(hand.parent.getWorldQuaternion(new Quaternion()).normalize().invert().multiply(orientation));hand.updateWorldMatrix(false,true);
}
for(let frame=0;frame<=frames;frame++){
 const time=Math.min(clip.duration,frame/60);times.push(time);action.paused=false;mixer.setTime(time);source.scene.updateMatrixWorld(true);
 for(const [name,item]of to){item.bone.position.copy(item.localP);item.bone.quaternion.copy(item.localQ);}target.scene.updateMatrixWorld(true);
 for(const [name,item]of mapped){
  const donor=from.get(name);donor.bone.getWorldQuaternion(q).normalize();delta.copy(ankleReference.get(name)??donor.q).invert();q.multiply(delta).multiply(item.q);
  const end=endpoints.get(name);if(end&&to.has(end)&&from.has(end)){
   posed.copy(to.get(end).p).sub(item.p).applyQuaternion(delta.copy(item.q).invert()).applyQuaternion(q).normalize();
   desired.copy(from.get(end).bone.getWorldPosition(v)).sub(donor.bone.getWorldPosition(p)).normalize();q.premultiply(delta.setFromUnitVectors(posed,desired));
  }
  item.bone.parent.getWorldQuaternion(parentQ).normalize().invert();item.bone.quaternion.copy(q).premultiply(parentQ).normalize();
  if(name==='Hips'){donor.bone.getWorldPosition(p).sub(donor.p).multiplyScalar(ratio).add(item.p);item.bone.position.copy(item.bone.parent.worldToLocal(p));}
  item.bone.updateWorldMatrix(false,true);
 }
 const hip=to.get('Hips').bone;let bodyMinimum=Infinity;
 for(const {mesh,index}of samples){let best=0;for(let k=1;k<4;k++)if(mesh.geometry.attributes.skinWeight.getComponent(index,k)>mesh.geometry.attributes.skinWeight.getComponent(index,best))best=k;const name=canonical(mesh.skeleton.bones[mesh.geometry.attributes.skinIndex.getComponent(index,best)].name);if(/Arm|Hand|^Tail_|^ClothRear_/.test(name))continue;mesh.getVertexPosition(index,v).applyMatrix4(mesh.matrixWorld);bodyMinimum=Math.min(bodyMinimum,v.y);}
 hip.getWorldPosition(p);p.y-=bodyMinimum;hip.position.copy(hip.parent.worldToLocal(p));target.scene.updateMatrixWorld(true);
 // Longer target arms must bend at the elbow to support the character. Lifting
 // the pelvis to clear a hand would leave both feet visibly hovering.
 supportAppendages();supportHand('Left');supportHand('Right');target.scene.updateMatrixWorld(true);
 let minimum=Infinity,limiting='';for(const {mesh,index}of samples){mesh.getVertexPosition(index,v).applyMatrix4(mesh.matrixWorld);if(v.y<minimum){minimum=v.y;let best=0;for(let k=1;k<4;k++)if(mesh.geometry.attributes.skinWeight.getComponent(index,k)>mesh.geometry.attributes.skinWeight.getComponent(index,best))best=k;limiting=mesh.skeleton.bones[mesh.geometry.attributes.skinIndex.getComponent(index,best)].name;}}
 limitingBones.push(limiting);
 // Keep the complete skinned silhouette above the support plane, including
 // authored ornaments. Report correction; large corrections are not acceptance.
 hip.getWorldPosition(p);p.y-=minimum;hip.position.copy(hip.parent.worldToLocal(p));target.scene.updateMatrixWorld(true);ground.push(-minimum-bodyMinimum);
 for(const [name,item]of animated)item.bone.quaternion.toArray(values.get(name),values.get(name).length);hip.position.toArray(hipValues,hipValues.length);
}
const tracks=animated.map(([name,item])=>new QuaternionKeyframeTrack(item.bone.name+'.quaternion',times,values.get(name)));tracks.push(new VectorKeyframeTrack(to.get('Hips').bone.name+'.position',times,hipValues));
const result={schema:'wg-retargeted-recovery/1',sourceSha256:crypto.createHash('sha256').update(sourceBytes).digest('hex'),targetSha256:crypto.createHash('sha256').update(targetBytes).digest('hex'),ratio,samples:times.length,mappedBones:mapped.map(([name])=>name),unmappedBones:[...to.keys()].filter(name=>!from.has(name)),groundCorrection:{min:Math.min(...ground),max:Math.max(...ground),values:ground,limitingBones},clip:AnimationClip.toJSON(new AnimationClip('Stand_Up1',clip.duration,tracks))};
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result)+'\n');console.log(JSON.stringify({output,bytes:fs.statSync(output).size,samples:result.samples,mapped:result.mappedBones.length,ratio,groundCorrection:{min:result.groundCorrection.min,max:result.groundCorrection.max}},null,2));
