import {Matrix4} from 'three';

// Reuse the complete visual pose already sampled for kinematic physics.
// This includes passive bones (tail, jaw, ornaments), not only rigid links.
export class RecoveryPoseSample {
 constructor(model){
  this.model=model;this.age=null;this.world=new Matrix4();this.entries=[];
  model.traverse(bone=>{if(bone.isBone)this.entries.push({bone,p:bone.position.clone(),q:bone.quaternion.clone(),s:bone.scale.clone()});});
 }
 checkpoint(){return {version:1,age:this.age,world:this.world.toArray(),entries:this.entries.map(e=>({name:e.bone.name,p:e.p.toArray(),q:e.q.toArray(),s:e.s.toArray()}))};}
 restoreCheckpoint(data){
  const valid=(v,n)=>Array.isArray(v)&&v.length===n&&v.every(Number.isFinite);
  if(!data||data.version!==1||data.age!==null&&!Number.isFinite(data.age)||!valid(data.world,16)||!Array.isArray(data.entries)||data.entries.length!==this.entries.length||data.entries.some((e,i)=>e.name!==this.entries[i].bone.name||!valid(e.p,3)||!valid(e.q,4)||Math.hypot(...e.q)<1e-6||!valid(e.s,3)))throw Error('Invalid recovery pose checkpoint');
  this.age=data.age;this.world.fromArray(data.world);data.entries.forEach((saved,i)=>{const e=this.entries[i];e.p.fromArray(saved.p);e.q.fromArray(saved.q);e.s.fromArray(saved.s);});
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
