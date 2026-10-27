import {Vector3,Quaternion,Bone} from 'three';
import {RAGDOLL_LINKS} from '../simulation/beast-ragdoll.js';
const colliderSamples=new WeakMap();

// The physics snapshot is world-space. Only Hips translation is transferred;
// other bone lengths remain authored, so solver tolerances cannot stretch skin.
export class BeastRagdollBinding{
 constructor(model){
  this.model=model;this.bones=new Map();model.traverse(o=>{if(o.isBone)this.bones.set(o.name.replace(/^mixamorig[:_]?/,''),o);});
  // Replacement rigs omit toe markers and name the head tip Head_top.
  // Virtual endpoints define collision frames only; no skin weights or clips change.
  if(!this.bones.has('HeadTop_End')&&this.bones.has('Head_top'))this.bones.set('HeadTop_End',this.bones.get('Head_top'));
  for(const side of ['Left','Right'])if(!this.bones.has(side+'ToeBase')){
   const foot=this.bones.get(side+'Foot'),shin=this.bones.get(side+'Leg');
   if(foot&&shin){const tip=new Bone();tip.name=side+'ToeBase';model.updateWorldMatrix(true,true);const forward=new Vector3(0,0,Math.max(.08,foot.position.length()*.45)).applyQuaternion(model.getWorldQuaternion(new Quaternion()));tip.position.copy(foot.worldToLocal(foot.getWorldPosition(new Vector3()).add(forward)));foot.add(tip);this.bones.set(tip.name,tip);}
  }
  this.entries=RAGDOLL_LINKS.map(([name,end])=>{const bone=this.bones.get(name),tip=this.bones.get(end);if(!bone||!tip)throw Error('Missing ragdoll bone '+name);return {bone,tip,offset:new Quaternion(),length:0,animatedQ:new Quaternion(),animatedP:new Vector3()};});
  this.v=new Vector3();this.q=new Quaternion();this.parentQ=new Quaternion();this.y=new Vector3(0,1,0);this.hip=new Vector3();
 }
 capture(){
  this.model.updateWorldMatrix(true,true);this.model.updateMatrixWorld(true);const pose={};for(const [name,bone] of this.bones){const p=bone.getWorldPosition(new Vector3());pose[name]={x:p.x,y:p.y,z:p.z};}
  for(const e of this.entries){this.v.copy(pose[e.tip.name.replace(/^mixamorig[:_]?/,'')]).sub(pose[e.bone.name.replace(/^mixamorig[:_]?/,'')]);e.length=this.v.length();this.q.setFromUnitVectors(this.y,this.v.normalize());e.offset.copy(this.q).invert().multiply(e.bone.getWorldQuaternion(this.parentQ).normalize());}
  // The replacement beasts attach their thighs to Spine, unlike the donor rigs.
  // Match physical constraints to the actual hierarchy to avoid skin/body drift.
  const owners=new Map(this.entries.map((e,i)=>[e.bone,i]));
  pose.parents=this.entries.map(e=>{let parent=e.bone.parent;while(parent&&!owners.has(parent))parent=parent.parent;return parent?owners.get(parent):-1;});
  return pose;
 }
 colliders(){
  const groups=this.entries.map(()=>[]),owners=new Map(this.entries.map((e,i)=>[e.bone,i]));
  const frames=this.entries.map(e=>{const a=e.bone.getWorldPosition(new Vector3()),b=e.tip.getWorldPosition(new Vector3());return {center:a.clone().add(b).multiplyScalar(.5),inverse:new Quaternion().setFromUnitVectors(this.y,b.sub(a).normalize()).invert()};});
  const v=new Vector3(),selected=new Map();
  this.model.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const indices=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight;
   const mapping=mesh.skeleton.bones.map(b=>{while(b&&!owners.has(b))b=b.parent;return owners.get(b);});
   const cached=colliderSamples.get(mesh.geometry);if(!cached)selected.set(mesh.geometry,new Set());
   const samples=cached??Array.from({length:Math.ceil(indices.count/2)},(_,i)=>i*2);
   for(const i of samples){let best=0;for(let k=1;k<4;k++)if(weights.getComponent(i,k)>weights.getComponent(i,best))best=k;
    // Shared head/neck skin needs support from both adjacent colliders.
    const owners=new Set();for(let k=0;k<4;k++){const owner=mapping[indices.getComponent(i,k)],primary=mapping[indices.getComponent(i,best)];if(owner!==undefined&&(k===best||weights.getComponent(i,k)>=.25&&(owner===2||owner===3)&&(primary===2||primary===3)))owners.add(owner);}
    for(const owner of owners){const f=frames[owner];mesh.getVertexPosition(i,v).applyMatrix4(mesh.matrixWorld).sub(f.center).applyQuaternion(f.inverse);const point=v.clone();point.geometry=mesh.geometry;point.index=i;groups[owner].push(point);}
   }
  });
  const quantile=(values,p)=>{values.sort((a,b)=>a-b);return values[Math.floor((values.length-1)*p)];};
  const fits=groups.map((points,i)=>{if(points.length<8)return null;
   const x=quantile(points.map(p=>p.x),.5),z=quantile(points.map(p=>p.z),.5),lo=quantile(points.map(p=>p.y),.02),hi=quantile(points.map(p=>p.y),.98);
   const radius=Math.max(.05,quantile(points.map(p=>Math.hypot(p.x-x,p.z-z)),.96)+.025);
   const hull=[];for(let k=0;k<96;k++){const dy=1-2*(k+.5)/96,r=Math.sqrt(1-dy*dy),theta=k*2.399963229728653,dx=Math.cos(theta)*r,dz=Math.sin(theta)*r;let best=-Infinity,point=points[0];for(const p of points){const dot=p.x*dx+p.y*dy+p.z*dz;if(dot>best){best=dot;point=p;}}hull.push(point.x,point.y,point.z);selected.get(point.geometry)?.add(point.index);}
   return {hull,radius,halfHeight:Math.max(.005,(hi-lo)/2-radius),offset:{x,y:(lo+hi)/2,z},samples:points.length};
  });
  for(const [geometry,indices] of selected)colliderSamples.set(geometry,[...indices]);
  return fits;
 }
 apply(snapshot,weight=1){
  if(snapshot.length!==this.entries.length*7)throw Error('Invalid ragdoll snapshot');
  for(const e of this.entries){e.animatedQ.copy(e.bone.quaternion);e.animatedP.copy(e.bone.position);}this.applied=true;
  for(let i=0;i<this.entries.length;i++){
   const e=this.entries[i],j=i*7;this.q.fromArray(snapshot,j+3).normalize();
   if(i===0){this.hip.set(0,-e.length/2,0).applyQuaternion(this.q).add(this.v.fromArray(snapshot,j));e.bone.parent.worldToLocal(this.hip);e.bone.position.lerp(this.hip,weight);}
   this.q.multiply(e.offset);e.bone.parent.getWorldQuaternion(this.parentQ).normalize().invert();this.q.premultiply(this.parentQ);e.bone.quaternion.slerp(this.q,weight);e.bone.updateWorldMatrix(false,true);
  }
 }
 restore(){if(!this.applied)return;for(const e of this.entries){e.bone.quaternion.copy(e.animatedQ);e.bone.position.copy(e.animatedP);}this.applied=false;this.model.updateWorldMatrix(true,true);}
}
