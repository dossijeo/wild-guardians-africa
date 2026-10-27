import {Vector3,Quaternion,Matrix4} from 'three';
import {BeastRecovery} from './beast-recovery.js';
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
// Playback only: the owner must reconcile navigation and supply obstacle clipping.
export class BakedBeastFall {
 constructor(binding,clip,{surface,clipPosition}={}){
  this.binding=binding;this.clip=clip;this.surface=surface;this.clipPosition=clipPosition;
  const model=binding.model;model.updateWorldMatrix(true,true);
  this.transform=new Matrix4().copy(model.matrixWorld);this.worldRotation=model.getWorldQuaternion(new Quaternion()).normalize();
  this.entries=binding.entries.map(e=>({bone:e.bone,position:e.bone.position.clone(),rotation:e.bone.quaternion.clone(),initialWorld:e.bone.getWorldQuaternion(new Quaternion()).normalize()}));
  this.initialHip=this.entries[0].bone.getWorldPosition(new Vector3());this.hip=this.initialHip.clone();
  this.values=new Float32Array(98);this.q=new Quaternion();this.parent=new Quaternion();this.v=new Vector3();this.lift=0;
  this.samples=BeastRecovery.contactSamples(model);
 }
 apply(age){
  this.restore();this.clip.sample(age,this.values);const blend=smooth(age/.18),v=this.values;
  for(let i=0;i<this.entries.length;i++){
   const e=this.entries[i],j=i*7;
   if(i===0){this.hip.fromArray(v,j).applyMatrix4(this.transform).lerp(this.initialHip,1-blend);this.clipPosition?.(this.hip,this.initialHip);e.bone.position.copy(e.bone.parent.worldToLocal(this.v.copy(this.hip)));}
   this.q.fromArray(v,j+3).premultiply(this.worldRotation).normalize();this.q.slerpQuaternions(e.initialWorld,this.q,blend);
   e.bone.parent.getWorldQuaternion(this.parent).normalize().invert();e.bone.quaternion.copy(this.q.premultiply(this.parent));e.bone.updateWorldMatrix(false,true);
  }
  this.lift=0;
  if(age>0&&this.surface){for(const {mesh,index} of this.samples){mesh.getVertexPosition(index,this.v).applyMatrix4(mesh.matrixWorld);this.lift=Math.max(this.lift,this.surface(this.v.x,this.v.z)+.01-this.v.y);}
   const hip=this.entries[0].bone;hip.getWorldPosition(this.hip);this.hip.y+=this.lift;hip.position.copy(hip.parent.worldToLocal(this.v.copy(this.hip)));this.binding.model.updateMatrixWorld(true);
  }
  this.entries[0].bone.getWorldPosition(this.hip);return age>=this.clip.duration;
 }
 restore(){for(const e of this.entries){e.bone.position.copy(e.position);e.bone.quaternion.copy(e.rotation);}this.binding.model.updateWorldMatrix(true,true);}
}
