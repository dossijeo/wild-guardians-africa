import {Vector3,Quaternion} from 'three';

// Short visual handoff; navigation remains authoritative. Hip orientation is
// blended in world space because the next path can immediately turn the root.
export class BeastRecoveryExit {
 constructor(model,at,duration=.3){
  this.model=model;this.at=at;this.duration=duration;this.entries=[];
  model.updateWorldMatrix(true,true);
  model.traverse(bone=>{if(bone.isBone)this.entries.push({bone,p:bone.position.clone(),q:bone.quaternion.clone(),nativeP:bone.position.clone(),nativeQ:bone.quaternion.clone()});});
  this.hip=this.entries.find(e=>/^(mixamorig[:_]?)?Hips$/.test(e.bone.name))?.bone;
  if(!this.hip)throw Error('Recovery exit lacks Hips');
  this.position=this.hip.getWorldPosition(new Vector3());this.rotation=this.hip.getWorldQuaternion(new Quaternion());
  this.v=new Vector3();this.q=new Quaternion();this.parentQ=new Quaternion();this.blendQ=new Quaternion();this.applied=false;
 }
 restore(){if(!this.applied)return;for(const e of this.entries){e.bone.position.copy(e.nativeP);e.bone.quaternion.copy(e.nativeQ);}this.model.updateMatrixWorld(true);this.applied=false;}
 apply(now){
  const t=Math.max(0,Math.min(1,(now-this.at)/this.duration)),weight=t*t*(3-2*t);
  if(t>=1)return true;
  this.model.updateWorldMatrix(true,true);this.hip.getWorldPosition(this.v);this.hip.getWorldQuaternion(this.q);
  for(const e of this.entries){e.nativeP.copy(e.bone.position);e.nativeQ.copy(e.bone.quaternion);e.bone.position.lerpVectors(e.p,e.nativeP,weight);e.bone.quaternion.copy(e.q).slerp(e.nativeQ,weight);}
  this.model.updateMatrixWorld(true);
  this.v.lerpVectors(this.position,this.v,weight);this.hip.position.copy(this.hip.parent.worldToLocal(this.v));
  this.hip.parent.getWorldQuaternion(this.parentQ).invert();this.hip.quaternion.copy(this.parentQ.multiply(this.blendQ.copy(this.rotation).slerp(this.q,weight)));
  this.model.updateMatrixWorld(true);this.applied=true;return false;
 }
}
