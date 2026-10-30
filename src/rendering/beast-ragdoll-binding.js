import {isTailContactVertex} from './beast-ground-contact.js';
import {Vector3,Quaternion,Bone} from 'three';
import {RAGDOLL_LINKS} from '../simulation/beast-ragdoll.js';
const colliderSamples=new WeakMap();
const supportDirections=Array.from({length:96},(_,k)=>{const y=1-2*(k+.5)/96,r=Math.sqrt(1-y*y),theta=k*2.399963229728653;return {x:Math.cos(theta)*r,y,z:Math.sin(theta)*r};});

// The physics snapshot is world-space. Only Hips translation is transferred;
// other bone lengths remain authored, so solver tolerances cannot stretch skin.
export class BeastRagdollBinding{
 constructor(model,{species=model.userData.beastSpecies}={}){
  // Calibrated on the expressive hyena, rhino and warthog: alternate sampling changes
  // support hull after local topology edits. Other rigs retain
  // their validated sampling. Only the first fit scans the full geometry.
  this.sampleStride=(species==='hyena'||species==='rhino'||species==='warthog')?1:2;
  this.model=model;this.bones=new Map();model.traverse(o=>{if(o.isBone)this.bones.set(o.name.replace(/^mixamorig[:_]?/,''),o);});
  // Replacement rigs omit toe markers and name the head tip Head_top.
  // Virtual endpoints define collision frames only; no skin weights or clips change.
  if(!this.bones.has('HeadTop_End')&&this.bones.has('Head_top'))this.bones.set('HeadTop_End',this.bones.get('Head_top'));
  for(const side of ['Left','Right'])if(!this.bones.has(side+'ToeBase')){
   const foot=this.bones.get(side+'Foot'),shin=this.bones.get(side+'Leg');
   if(foot&&shin){const tip=new Bone();tip.name=side+'ToeBase';model.updateWorldMatrix(true,true);const forward=new Vector3(0,0,Math.max(.08,foot.position.length()*.45)).applyQuaternion(model.getWorldQuaternion(new Quaternion()));tip.position.copy(foot.worldToLocal(foot.getWorldPosition(new Vector3()).add(forward)));foot.add(tip);this.bones.set(tip.name,tip);}
  }
  this.entries=RAGDOLL_LINKS.map(([name,end])=>{const bone=this.bones.get(name),tip=this.bones.get(end);if(!bone||!tip)throw Error('Missing ragdoll bone '+name);return {bone,tip,offset:new Quaternion(),length:0,animatedQ:new Quaternion(),animatedP:new Vector3()};});
  const physical=new Set(this.entries.map(e=>e.bone));this.passive=[...new Set(this.bones.values())].filter(bone=>!physical.has(bone)).map(bone=>({bone,capturedP:bone.position.clone(),capturedQ:bone.quaternion.clone(),animatedP:new Vector3(),animatedQ:new Quaternion()}));
  this.v=new Vector3();this.q=new Quaternion();this.parentQ=new Quaternion();this.y=new Vector3(0,1,0);this.hip=new Vector3();
 }
 capture(){
  for(const e of this.passive){e.capturedP.copy(e.bone.position);e.capturedQ.copy(e.bone.quaternion);}
  this.model.updateWorldMatrix(true,true);this.model.updateMatrixWorld(true);const pose={};for(const [name,bone] of this.bones){const p=bone.getWorldPosition(new Vector3());pose[name]={x:p.x,y:p.y,z:p.z};}
  for(const e of this.entries){this.v.copy(pose[e.tip.name.replace(/^mixamorig[:_]?/,'')]).sub(pose[e.bone.name.replace(/^mixamorig[:_]?/,'')]);e.length=this.v.length();this.q.setFromUnitVectors(this.y,this.v.normalize());e.offset.copy(this.q).invert().multiply(e.bone.getWorldQuaternion(this.parentQ).normalize());}
  // The replacement beasts attach their thighs to Spine, unlike the donor rigs.
  // Match physical constraints to the actual hierarchy to avoid skin/body drift.
  const owners=new Map(this.entries.map((e,i)=>[e.bone,i]));
  pose.parents=this.entries.map(e=>{let parent=e.bone.parent;while(parent&&!owners.has(parent))parent=parent.parent;return parent?owners.get(parent):-1;});
  return pose;
 }
 colliders({refit=false}={}){
  const groups=this.entries.map(()=>[]),owners=new Map(this.entries.map((e,i)=>[e.bone,i]));
  const frames=this.entries.map(e=>{const a=e.bone.getWorldPosition(new Vector3()),b=e.tip.getWorldPosition(new Vector3());return {center:a.clone().add(b).multiplyScalar(.5),inverse:new Quaternion().setFromUnitVectors(this.y,b.sub(a).normalize()).invert()};});
  const v=new Vector3(),selected=new Map();
  this.model.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const indices=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight;
   const mapping=mesh.skeleton.bones.map(b=>{while(b&&!owners.has(b))b=b.parent;return owners.get(b);});
   // Recovery poses can expose different skin extrema. Do not reuse or replace
   // the standing-pose support cache when rebuilding a knocked-down animal.
   const cached=refit?null:colliderSamples.get(mesh.geometry)?.get(this.sampleStride);if(!cached)selected.set(mesh.geometry,new Set());
   const samples=cached??Array.from({length:Math.ceil(indices.count/this.sampleStride)},(_,i)=>i*this.sampleStride);
   for(const i of samples){if(isTailContactVertex(mesh,i))continue;let best=0;for(let k=1;k<4;k++)if(weights.getComponent(i,k)>weights.getComponent(i,best))best=k;
    // Skin once; adjacent head/neck supports share the same world-space point.
    const primary=mapping[indices.getComponent(i,best)];if(primary===undefined)continue;
    mesh.getVertexPosition(i,v).applyMatrix4(mesh.matrixWorld);
    let secondary;
    if(primary===2||primary===3)for(let k=0;k<4;k++){const owner=mapping[indices.getComponent(i,k)];if(owner!==primary&&(owner===2||owner===3)&&weights.getComponent(i,k)>=.25)secondary=owner;}
    for(let k=0;k<(secondary===undefined?1:2);k++){const owner=k===0?primary:secondary,f=frames[owner],point=v.clone().sub(f.center).applyQuaternion(f.inverse);point.geometry=mesh.geometry;point.index=i;groups[owner].push(point);}
   }
  });
  const quantile=(values,p)=>{values.sort((a,b)=>a-b);return values[Math.floor((values.length-1)*p)];};
  const fits=groups.map((points,i)=>{if(points.length<8)return null;
   const x=quantile(points.map(p=>p.x),.5),z=quantile(points.map(p=>p.z),.5),lo=quantile(points.map(p=>p.y),.02),hi=quantile(points.map(p=>p.y),.98);
   const radius=Math.max(.05,quantile(points.map(p=>Math.hypot(p.x-x,p.z-z)),.96)+.025);
   const hull=[];for(const {x:dx,y:dy,z:dz} of supportDirections){let best=-Infinity,point=points[0];for(const p of points){const dot=p.x*dx+p.y*dy+p.z*dz;if(dot>best){best=dot;point=p;}}hull.push(point.x,point.y,point.z);selected.get(point.geometry)?.add(point.index);}
   return {hull,radius,halfHeight:Math.max(.005,(hi-lo)/2-radius),offset:{x,y:(lo+hi)/2,z},samples:points.length};
  });
  if(!refit)for(const [geometry,indices] of selected){let cache=colliderSamples.get(geometry);if(!cache)colliderSamples.set(geometry,cache=new Map());cache.set(this.sampleStride,[...indices]);}
  return fits;
 }
 physicalSnapshot(out){
  // Invert the original binding offset, preserving collider roll as well as
  // the segment direction. Re-fitting from endpoints would discard that roll.
  for(let i=0;i<this.entries.length;i++){
   const e=this.entries[i],j=i*7;
   e.bone.getWorldQuaternion(this.q).normalize();this.parentQ.copy(e.offset).invert();this.q.multiply(this.parentQ).normalize();
   e.bone.getWorldPosition(this.v);this.hip.set(0,e.length/2,0).applyQuaternion(this.q).add(this.v);
   this.hip.toArray(out,j);this.q.toArray(out,j+3);
  }
  return out;
 }
 apply(snapshot,weight=1){
  if(snapshot.length!==this.entries.length*7)throw Error('Invalid ragdoll snapshot');
  // Intermediate spine/shoulder joints and hands are not separate rigid
  // bodies. Retain their captured pose, particularly when a second hit takes
  // ownership during an authored get-up; native mixing must not reset them.
  for(const e of this.passive){e.animatedP.copy(e.bone.position);e.animatedQ.copy(e.bone.quaternion);e.bone.position.lerp(e.capturedP,weight);e.bone.quaternion.slerp(e.capturedQ,weight);}this.model.updateMatrixWorld(true);
  for(const e of this.entries){e.animatedQ.copy(e.bone.quaternion);e.animatedP.copy(e.bone.position);}this.applied=true;
  for(let i=0;i<this.entries.length;i++){
   const e=this.entries[i],j=i*7;this.q.fromArray(snapshot,j+3).normalize();
   if(i===0){this.hip.set(0,-e.length/2,0).applyQuaternion(this.q).add(this.v.fromArray(snapshot,j));e.bone.parent.worldToLocal(this.hip);e.bone.position.lerp(this.hip,weight);}
   this.q.multiply(e.offset);e.bone.parent.getWorldQuaternion(this.parentQ).normalize().invert();this.q.premultiply(this.parentQ);e.bone.quaternion.slerp(this.q,weight);e.bone.updateWorldMatrix(false,true);
  }
 }
 restore(){if(!this.applied)return;for(const e of this.passive){e.bone.quaternion.copy(e.animatedQ);e.bone.position.copy(e.animatedP);}for(const e of this.entries){e.bone.quaternion.copy(e.animatedQ);e.bone.position.copy(e.animatedP);}this.applied=false;this.model.updateWorldMatrix(true,true);}
}
