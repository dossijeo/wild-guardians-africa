import {Matrix4} from 'three';

// Reuse the complete visual pose already sampled for kinematic physics.
// This includes passive bones (tail, jaw, ornaments), not only rigid links.
export class RecoveryPoseSample {
 constructor(model){
  this.model=model;this.age=null;this.world=new Matrix4();this.entries=[];
  model.traverse(bone=>{if(bone.isBone)this.entries.push({bone,p:bone.position.clone(),q:bone.quaternion.clone(),s:bone.scale.clone()});});
 }
 capture(age){
  this.model.updateWorldMatrix(true,false);this.world.copy(this.model.matrixWorld);this.age=age;
  for(const e of this.entries){e.p.copy(e.bone.position);e.q.copy(e.bone.quaternion);e.s.copy(e.bone.scale);}
 }
 apply(age){
  if(this.age!==age)return false;
  this.model.updateWorldMatrix(true,false);
  if(!this.world.equals(this.model.matrixWorld))return false;
  for(const e of this.entries){e.bone.position.copy(e.p);e.bone.quaternion.copy(e.q);e.bone.scale.copy(e.s);}
  this.model.updateMatrixWorld(true);return true;
 }
}
