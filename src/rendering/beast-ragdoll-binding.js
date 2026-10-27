import {Vector3,Quaternion} from 'three';
import {RAGDOLL_LINKS} from '../simulation/beast-ragdoll.js';

// The physics snapshot is world-space. Only Hips translation is transferred;
// other bone lengths remain authored, so solver tolerances cannot stretch skin.
export class BeastRagdollBinding{
 constructor(model){
  this.model=model;this.bones=new Map();model.traverse(o=>{if(o.isBone)this.bones.set(o.name.replace(/^mixamorig[:_]?/,''),o);});
  this.entries=RAGDOLL_LINKS.map(([name,end])=>{const bone=this.bones.get(name),tip=this.bones.get(end);if(!bone||!tip)throw Error('Missing ragdoll bone '+name);return {bone,tip,offset:new Quaternion(),length:0,animatedQ:new Quaternion(),animatedP:new Vector3()};});
  this.v=new Vector3();this.q=new Quaternion();this.parentQ=new Quaternion();this.y=new Vector3(0,1,0);this.hip=new Vector3();
 }
 capture(){
  this.model.updateWorldMatrix(true,true);const pose={};for(const [name,bone] of this.bones){const p=bone.getWorldPosition(new Vector3());pose[name]={x:p.x,y:p.y,z:p.z};}
  for(const e of this.entries){this.v.copy(pose[e.tip.name.replace(/^mixamorig[:_]?/,'')]).sub(pose[e.bone.name.replace(/^mixamorig[:_]?/,'')]);e.length=this.v.length();this.q.setFromUnitVectors(this.y,this.v.normalize());e.offset.copy(this.q).invert().multiply(e.bone.getWorldQuaternion(this.parentQ));}
  return pose;
 }
 apply(snapshot,weight=1){
  if(snapshot.length!==this.entries.length*7)throw Error('Invalid ragdoll snapshot');
  for(const e of this.entries){e.animatedQ.copy(e.bone.quaternion);e.animatedP.copy(e.bone.position);}this.applied=true;
  for(let i=0;i<this.entries.length;i++){
   const e=this.entries[i],j=i*7;this.q.fromArray(snapshot,j+3).normalize();
   if(i===0){this.hip.set(0,-e.length/2,0).applyQuaternion(this.q).add(this.v.fromArray(snapshot,j));e.bone.parent.worldToLocal(this.hip);e.bone.position.lerp(this.hip,weight);}
   this.q.multiply(e.offset);e.bone.parent.getWorldQuaternion(this.parentQ).invert();this.q.premultiply(this.parentQ);e.bone.quaternion.slerp(this.q,weight);e.bone.updateWorldMatrix(false,true);
  }
 }
 restore(){if(!this.applied)return;for(const e of this.entries){e.bone.quaternion.copy(e.animatedQ);e.bone.position.copy(e.animatedP);}this.applied=false;this.model.updateWorldMatrix(true,true);}
}
