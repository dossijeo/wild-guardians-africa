import {Vector3,Quaternion} from 'three';
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const X=new Vector3(1,0,0),Z=new Vector3(0,0,1);
const sampleCache=new WeakMap();
function contactIndices(geometry){
 if(sampleCache.has(geometry))return sampleCache.get(geometry);const p=geometry.attributes.position,indices=geometry.attributes.skinIndex,weights=geometry.attributes.skinWeight,directions=[];
 for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)if(x||y||z)directions.push([x,y,z]);
 const groups=new Map(),chosen=new Set();for(let i=0;i<p.count;i++){
  let dominant=0;for(let k=1;k<4;k++)if(weights.getComponent(i,k)>weights.getComponent(i,dominant))dominant=k;const id=indices.getComponent(i,dominant);let group=groups.get(id);if(!group){group=directions.map(()=>({score:-Infinity,index:0}));groups.set(id,group);}
  for(let j=0;j<directions.length;j++){const d=directions[j],score=p.getX(i)*d[0]+p.getY(i)*d[1]+p.getZ(i)*d[2];if(score>group[j].score){group[j].score=score;group[j].index=i;}}
 }
 for(const group of groups.values())for(const item of group)chosen.add(item.index);for(let i=0;i<p.count;i+=Math.max(1,Math.ceil(p.count/240)))chosen.add(i);const out=[...chosen];sampleCache.set(geometry,out);return out;
}


// A staged get-up from the exact physical pose. The caller first moves the
// logical root to the fallen pelvis; the world-space snapshot preserves the
// visible pose during that reconciliation. No return to the pre-impact origin.
export class BeastRecovery{
 constructor(binding,snapshot,{surface,duration=1.65}={}){
  this.binding=binding;this.surface=surface;this.duration=duration;this.age=0;this.done=false;this.lift=0;this.v=new Vector3();
  this.entries=binding.entries.map(e=>({bone:e.bone,standingQ:e.bone.quaternion.clone(),standingP:e.bone.position.clone(),fallenQ:new Quaternion(),fallenP:new Vector3(),crouchQ:e.bone.quaternion.clone(),crouchP:e.bone.position.clone()}));
  binding.apply(snapshot);for(const e of this.entries){e.fallenQ.copy(e.bone.quaternion);e.fallenP.copy(e.bone.position);}binding.restore();
  const hips=this.entries[0],height=Math.max(.4,hips.standingP.y);hips.crouchP.y-=height*.38;
  for(const e of this.entries){const n=e.bone.name;
   if(/UpLeg$/.test(n))e.crouchQ.multiply(new Quaternion().setFromAxisAngle(X,-.55));
   else if(/(?:Left|Right)Leg$/.test(n))e.crouchQ.multiply(new Quaternion().setFromAxisAngle(X,1.05));
   else if(/Spine$/.test(n))e.crouchQ.multiply(new Quaternion().setFromAxisAngle(X,.28));
   else if(/ForeArm$/.test(n))e.crouchQ.multiply(new Quaternion().setFromAxisAngle(X,-.65));
   else if(/(?:Left|Right)Arm$/.test(n))e.crouchQ.multiply(new Quaternion().setFromAxisAngle(Z,n.includes('Left')?.3:-.3));
  }
  // Bounded skin samples during recovery only: cached extremes per influencing
  // bone plus uniform coverage, including sparse toes, tusks and fingers.
  this.legs=['Left','Right'].map(side=>{const upper=binding.bones.get(side+'UpLeg'),knee=binding.bones.get(side+'Leg'),foot=binding.bones.get(side+'Foot'),target=foot.getWorldPosition(new Vector3());return {upper,knee,foot,target,length1:upper.getWorldPosition(new Vector3()).distanceTo(knee.getWorldPosition(new Vector3())),length2:knee.getWorldPosition(new Vector3()).distanceTo(target)};});
  const footClearance=Math.min(...this.legs.map(l=>l.target.y-(surface?.(l.target.x,l.target.z)??0)));for(const l of this.legs)l.target.y=(surface?.(l.target.x,l.target.z)??0)+Math.max(.05,footClearance);
  this.ik={p:new Vector3(),k:new Vector3(),f:new Vector3(),direction:new Vector3(),pole:new Vector3(),desired:new Vector3(),current:new Vector3(),q:new Quaternion(),parent:new Quaternion(),local:new Quaternion()};
  this.samples=[];binding.model.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;for(const index of contactIndices(mesh.geometry))this.samples.push({mesh,index});});
 }
 apply(dt){
  this.age=Math.min(this.duration,this.age+Math.max(0,dt));const t=this.age/this.duration,brace=smooth(t/.42),rise=smooth((t-.42)/.58);
  for(const e of this.entries){if(t<.42){e.bone.quaternion.slerpQuaternions(e.fallenQ,e.crouchQ,brace);e.bone.position.lerpVectors(e.fallenP,e.crouchP,brace);}else{e.bone.quaternion.slerpQuaternions(e.crouchQ,e.standingQ,rise);e.bone.position.lerpVectors(e.crouchP,e.standingP,rise);}}
  const model=this.binding.model;model.updateMatrixWorld(true);
  const contactWeight=smooth((t-.2)/.22)*(1-smooth((t-.85)/.15));for(const leg of this.legs)this.legIK(leg,contactWeight);
  model.updateMatrixWorld(true);let penetration=0;
  if(this.surface)for(const {mesh,index} of this.samples){mesh.getVertexPosition(index,this.v).applyMatrix4(mesh.matrixWorld);penetration=Math.max(penetration,this.surface(this.v.x,this.v.z)+.02-this.v.y);}
  // Contact correction is vertical and never modifies horizontal navigation.
  this.lift=penetration;const hip=this.entries[0].bone;hip.getWorldPosition(this.v);this.v.y+=penetration;hip.position.copy(hip.parent.worldToLocal(this.v));model.updateMatrixWorld(true);this.done=this.age>=this.duration;
  return this.done;
 }
 legIK(leg,weight){
  if(weight<=0)return;const a=this.ik;leg.upper.getWorldPosition(a.p);leg.knee.getWorldPosition(a.k);leg.foot.getWorldPosition(a.f);a.direction.copy(leg.target).sub(a.p);const distance=Math.max(Math.abs(leg.length1-leg.length2)+.001,Math.min(leg.length1+leg.length2-.001,a.direction.length()));a.direction.normalize();
  a.pole.set(0,0,1).applyQuaternion(this.binding.model.getWorldQuaternion(a.parent));a.pole.addScaledVector(a.direction,-a.pole.dot(a.direction)).normalize();
  const along=(leg.length1*leg.length1+distance*distance-leg.length2*leg.length2)/(2*distance),height=Math.sqrt(Math.max(0,leg.length1*leg.length1-along*along));a.desired.copy(a.p).addScaledVector(a.direction,along).addScaledVector(a.pole,height);
  this.aimBone(leg.upper,a.k,a.desired,weight);leg.knee.getWorldPosition(a.k);leg.foot.getWorldPosition(a.f);this.aimBone(leg.knee,a.f,leg.target,weight);
 }
 aimBone(bone,endpoint,target,weight){const a=this.ik;bone.getWorldPosition(a.p);a.current.copy(endpoint).sub(a.p).normalize();a.direction.copy(target).sub(a.p).normalize();a.q.setFromUnitVectors(a.current,a.direction);bone.getWorldQuaternion(a.local).premultiply(a.q);bone.parent.getWorldQuaternion(a.parent).invert();a.local.premultiply(a.parent);bone.quaternion.slerp(a.local,weight);bone.updateWorldMatrix(false,true);}
 restore(){for(const e of this.entries){e.bone.quaternion.copy(e.standingQ);e.bone.position.copy(e.standingP);}this.binding.model.updateMatrixWorld(true);}
}
