import {isTailContactVertex} from './beast-ground-contact.js';
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
 static contactSamples(model){const samples=[];model.traverse(mesh=>{if(mesh.isSkinnedMesh)for(const index of contactIndices(mesh.geometry))if(!isTailContactVertex(mesh,index))samples.push({mesh,index});});return samples;}
 static prewarm(model){model.traverse(mesh=>{if(mesh.isSkinnedMesh)contactIndices(mesh.geometry);});}
 constructor(binding,snapshot,{surface,duration=1.9,fallenWorldPose=null}={}){
  this.binding=binding;this.surface=surface;this.duration=duration;this.age=0;this.done=false;this.lift=0;this.v=new Vector3();
  this.entries=binding.entries.map(e=>({bone:e.bone,standingQ:e.bone.quaternion.clone(),standingP:e.bone.position.clone(),fallenQ:new Quaternion(),fallenP:new Vector3(),crouchQ:e.bone.quaternion.clone(),crouchP:e.bone.position.clone()}));
  if(fallenWorldPose){
   if(fallenWorldPose.length!==98||!fallenWorldPose.every(Number.isFinite))throw Error('Invalid fallen bone pose');
   const parent=new Quaternion();
   for(let i=0;i<this.entries.length;i++){const bone=this.entries[i].bone,j=i*7;if(i===0)bone.position.copy(bone.parent.worldToLocal(this.v.fromArray(fallenWorldPose,j)));bone.parent.getWorldQuaternion(parent).normalize().invert();bone.quaternion.fromArray(fallenWorldPose,j+3).premultiply(parent).normalize();bone.updateWorldMatrix(false,true);}
  }else binding.apply(snapshot);
  this.fallenSecondary=new Map();for(const [name,bone]of binding.bones)if(/^ClothRear_.*_01$/.test(name))this.fallenSecondary.set(bone,bone.getWorldQuaternion(new Quaternion()).normalize());
  this.fallenLegs=['Left','Right'].map(side=>{const upper=binding.bones.get(side+'UpLeg'),knee=binding.bones.get(side+'Leg'),foot=binding.bones.get(side+'Foot');return {target:foot.getWorldPosition(new Vector3()),orientation:foot.getWorldQuaternion(new Quaternion()).normalize(),pole:knee.getWorldPosition(new Vector3()).sub(upper.getWorldPosition(new Vector3())).normalize()};});
  this.fallenArms=['Left','Right'].map(side=>{const upper=binding.bones.get(side+'Arm'),knee=binding.bones.get(side+'ForeArm'),hand=binding.bones.get(side+'Hand');if(!upper||!knee||!hand)return null;return {target:hand.getWorldPosition(new Vector3()),orientation:hand.getWorldQuaternion(new Quaternion()).normalize(),pole:knee.getWorldPosition(new Vector3()).sub(upper.getWorldPosition(new Vector3())).normalize()};});
  for(const e of this.entries){e.fallenQ.copy(e.bone.quaternion);e.fallenP.copy(e.bone.position);}
  if(fallenWorldPose){for(const e of this.entries){e.bone.position.copy(e.standingP);e.bone.quaternion.copy(e.standingQ);}binding.model.updateMatrixWorld(true);}else binding.restore();
  const hips=this.entries[0],height=Math.max(.4,hips.standingP.y);hips.crouchP.y-=height*.6;
  for(const e of this.entries){const n=e.bone.name;
   if(/UpLeg$/.test(n))e.crouchQ.multiply(new Quaternion().setFromAxisAngle(X,-.55));
   else if(/(?:Left|Right)Leg$/.test(n))e.crouchQ.multiply(new Quaternion().setFromAxisAngle(X,1.05));
   else if(/Spine$/.test(n)){const parent=e.bone.parent.getWorldQuaternion(new Quaternion()),axis=X.clone().applyQuaternion(binding.model.getWorldQuaternion(new Quaternion()));e.crouchQ.copy(parent).invert().multiply(new Quaternion().setFromAxisAngle(axis,1.3)).multiply(parent).multiply(e.standingQ);}
   else if(/ForeArm$/.test(n))e.crouchQ.multiply(new Quaternion().setFromAxisAngle(X,-.65));
   else if(/(?:Left|Right)Arm$/.test(n))e.crouchQ.multiply(new Quaternion().setFromAxisAngle(Z,n.includes('Left')?.3:-.3));
  }
  // Fold rear cloth away from the support plane. Tails may cross the ground.
  this.secondary=[];
  for(const [name,bone] of binding.bones)if(/^ClothRear_.*_01$/.test(name)){
   const standingQ=bone.quaternion.clone(),parent=bone.parent.getWorldQuaternion(new Quaternion()),axis=X.clone().applyQuaternion(binding.model.getWorldQuaternion(new Quaternion()));
   const angle=-1.2;
   const crouchQ=parent.clone().invert().multiply(new Quaternion().setFromAxisAngle(axis,angle)).multiply(parent).multiply(standingQ);
   this.secondary.push({bone,standingQ,crouchQ,delay:0});
  }
  for(const e of this.entries){e.bone.position.copy(e.crouchP);e.bone.quaternion.copy(e.crouchQ);}for(const e of this.secondary)e.bone.quaternion.copy(e.crouchQ);binding.model.updateMatrixWorld(true);
  for(const e of this.secondary){e.fallenWorldQ=this.fallenSecondary.get(e.bone);e.crouchWorldQ=e.bone.getWorldQuaternion(new Quaternion()).normalize();}
  for(const e of this.entries){e.bone.position.copy(e.standingP);e.bone.quaternion.copy(e.standingQ);}for(const e of this.secondary)e.bone.quaternion.copy(e.standingQ);binding.model.updateMatrixWorld(true);
  this.samples=BeastRecovery.contactSamples(binding.model);
  // Bounded skin samples during recovery only: cached extremes per influencing
  // bone plus uniform coverage, including sparse toes, tusks and fingers.
  this.legs=['Left','Right'].map(side=>{const upper=binding.bones.get(side+'UpLeg'),knee=binding.bones.get(side+'Leg'),foot=binding.bones.get(side+'Foot'),target=foot.getWorldPosition(new Vector3());return {upper,knee,foot,target,contactOrientation:foot.getWorldQuaternion(new Quaternion()).normalize(),length1:upper.getWorldPosition(new Vector3()).distanceTo(knee.getWorldPosition(new Vector3())),length2:knee.getWorldPosition(new Vector3()).distanceTo(target)};});
  const footClearance=Math.min(...this.legs.map(l=>l.target.y-(surface?.(l.target.x,l.target.z)??0)));for(const l of this.legs)l.target.y=(surface?.(l.target.x,l.target.z)??0)+Math.max(.05,footClearance);
  for(const [i,leg]of this.legs.entries()){leg.supportTarget=leg.target.clone();leg.supportOrientation=leg.contactOrientation.clone();leg.fallen=this.fallenLegs[i];leg.poleWorld=new Vector3();}
  const facing=binding.model.getWorldQuaternion(new Quaternion()),forward=new Vector3(0,0,1).applyQuaternion(facing),sideways=new Vector3(1,0,0).applyQuaternion(facing);
  this.arms=['Left','Right'].flatMap((side,i)=>{
   const upper=binding.bones.get(side+'Arm'),knee=binding.bones.get(side+'ForeArm'),foot=binding.bones.get(side+'Hand');if(!upper||!knee||!foot)return [];
   const shoulder=upper.getWorldPosition(new Vector3()),elbow=knee.getWorldPosition(new Vector3()),hand=foot.getWorldPosition(new Vector3()),length1=shoulder.distanceTo(elbow),length2=elbow.distanceTo(hand),sign=i===0?1:-1;
   const target=this.legs[i].target.clone().addScaledVector(forward,(length1+length2)*.45).addScaledVector(sideways,sign*(length1+length2)*.12);
   let clearance=.07;
   for(const {mesh,index} of this.samples){
    const weights=mesh.geometry.attributes.skinWeight,indices=mesh.geometry.attributes.skinIndex;let dominant=0;for(let k=1;k<4;k++)if(weights.getComponent(index,k)>weights.getComponent(index,dominant))dominant=k;
    let bone=mesh.skeleton.bones[indices.getComponent(index,dominant)];while(bone&&bone!==foot)bone=bone.parent;
    if(bone===foot){mesh.getVertexPosition(index,this.v).applyMatrix4(mesh.matrixWorld);clearance=Math.max(clearance,hand.y-this.v.y+.01);}
   }
   target.y=(surface?.(target.x,target.z)??0)+clearance;
   return [{upper,knee,foot,target,standingHandQ:foot.quaternion.clone(),contactOrientation:foot.getWorldQuaternion(new Quaternion()).normalize(),length1,length2,pole:new Vector3(sign,0,-.3).normalize()}];
  });
  for(const [i,arm]of this.arms.entries()){arm.supportTarget=arm.target.clone();arm.supportOrientation=arm.contactOrientation.clone();arm.fallen=this.fallenArms[i];arm.poleWorld=new Vector3();}
  this.ik={upperStart:new Quaternion(),kneeStart:new Quaternion(),p:new Vector3(),k:new Vector3(),f:new Vector3(),direction:new Vector3(),pole:new Vector3(),desired:new Vector3(),current:new Vector3(),q:new Quaternion(),parent:new Quaternion(),local:new Quaternion()};
 }
 apply(dt){
  this.age=Math.min(this.duration,this.age+Math.max(0,dt));const t=this.age/this.duration,brace=smooth(t/.42),rise=smooth((t-.42)/.58);
  for(const e of this.entries){if(t<.42){e.bone.quaternion.slerpQuaternions(e.fallenQ,e.crouchQ,brace);e.bone.position.lerpVectors(e.fallenP,e.crouchP,brace);}else{e.bone.quaternion.slerpQuaternions(e.crouchQ,e.standingQ,rise);e.bone.position.lerpVectors(e.crouchP,e.standingP,rise);}}
  for(const arm of this.arms)arm.foot.quaternion.copy(arm.standingHandQ);
  this.binding.model.updateMatrixWorld(true);
  for(const e of this.secondary){const fold=smooth((t-e.delay)/(.42-e.delay)),release=smooth((t-.42-e.delay)/(.58-e.delay));if(t<.42){this.ik.local.slerpQuaternions(e.fallenWorldQ,e.crouchWorldQ,fold);e.bone.parent.getWorldQuaternion(this.ik.parent).normalize().invert();e.bone.quaternion.copy(this.ik.local).premultiply(this.ik.parent);e.bone.updateWorldMatrix(false,true);}else e.bone.quaternion.slerpQuaternions(e.standingQ,e.crouchQ,1-release);}
  const model=this.binding.model;model.updateMatrixWorld(true);
  const contactWeight=1-smooth((t-.85)/.15);for(const leg of this.legs){leg.target.lerpVectors(leg.fallen.target,leg.supportTarget,brace);leg.contactOrientation.slerpQuaternions(leg.fallen.orientation,leg.supportOrientation,brace);leg.poleWorld.set(0,0,1).applyQuaternion(model.getWorldQuaternion(this.ik.parent)).lerp(leg.fallen.pole,1-brace).normalize();this.legIK(leg,contactWeight);}
  const handWeight=1-smooth((t-.48)/.3);for(const arm of this.arms){arm.target.lerpVectors(arm.fallen.target,arm.supportTarget,brace);arm.contactOrientation.slerpQuaternions(arm.fallen.orientation,arm.supportOrientation,brace);arm.poleWorld.copy(arm.pole).applyQuaternion(model.getWorldQuaternion(this.ik.parent)).lerp(arm.fallen.pole,1-brace).normalize();this.legIK(arm,handWeight);}
  model.updateMatrixWorld(true);let penetration=0;
  if(this.surface)for(const {mesh,index} of this.samples){mesh.getVertexPosition(index,this.v).applyMatrix4(mesh.matrixWorld);penetration=Math.max(penetration,this.surface(this.v.x,this.v.z)+.01-this.v.y);}
  // Contact correction is vertical and never modifies horizontal navigation.
  this.lift=penetration;const hip=this.entries[0].bone;hip.getWorldPosition(this.v);this.v.y+=penetration;hip.position.copy(hip.parent.worldToLocal(this.v));model.updateMatrixWorld(true);this.done=this.age>=this.duration;
  return this.done;
 }
 legIK(leg,weight){
  if(weight<=0)return;const a=this.ik;a.upperStart.copy(leg.upper.quaternion);a.kneeStart.copy(leg.knee.quaternion);leg.upper.getWorldPosition(a.p);leg.knee.getWorldPosition(a.k);leg.foot.getWorldPosition(a.f);a.direction.copy(leg.target).sub(a.p);const distance=Math.max(Math.abs(leg.length1-leg.length2)+.001,Math.min(leg.length1+leg.length2-.001,a.direction.length()));a.direction.normalize();
  if(leg.poleWorld)a.pole.copy(leg.poleWorld);else{if(leg.pole)a.pole.copy(leg.pole);else a.pole.set(0,0,1);a.pole.applyQuaternion(this.binding.model.getWorldQuaternion(a.parent));}a.pole.addScaledVector(a.direction,-a.pole.dot(a.direction)).normalize();
  const along=(leg.length1*leg.length1+distance*distance-leg.length2*leg.length2)/(2*distance),height=Math.sqrt(Math.max(0,leg.length1*leg.length1-along*along));a.desired.copy(a.p).addScaledVector(a.direction,along).addScaledVector(a.pole,height);
  this.aimBone(leg.upper,a.k,a.desired,1);leg.knee.getWorldPosition(a.k);leg.foot.getWorldPosition(a.f);this.aimBone(leg.knee,a.f,leg.target,1);
  a.local.copy(leg.upper.quaternion);leg.upper.quaternion.slerpQuaternions(a.upperStart,a.local,weight);a.local.copy(leg.knee.quaternion);leg.knee.quaternion.slerpQuaternions(a.kneeStart,a.local,weight);leg.upper.updateWorldMatrix(false,true);
  // Keep the sole in its captured standing orientation while the leg folds.
  // Position-only IK otherwise points the toes through the ground, and the
  // whole-body contact correction lifts the pelvis to compensate.
  if(leg.contactOrientation){leg.foot.parent.getWorldQuaternion(a.parent).invert();a.local.copy(leg.contactOrientation).premultiply(a.parent);leg.foot.quaternion.slerp(a.local,weight);leg.foot.updateWorldMatrix(false,true);}
 }
 aimBone(bone,endpoint,target,weight){const a=this.ik;bone.getWorldPosition(a.p);a.current.copy(endpoint).sub(a.p).normalize();a.direction.copy(target).sub(a.p).normalize();a.q.setFromUnitVectors(a.current,a.direction);bone.getWorldQuaternion(a.local).premultiply(a.q);bone.parent.getWorldQuaternion(a.parent).invert();a.local.premultiply(a.parent);bone.quaternion.slerp(a.local,weight);bone.updateWorldMatrix(false,true);}
 restore(){for(const arm of this.arms)arm.foot.quaternion.copy(arm.standingHandQ);for(const e of this.secondary)e.bone.quaternion.copy(e.standingQ);for(const e of this.entries){e.bone.quaternion.copy(e.standingQ);e.bone.position.copy(e.standingP);}this.binding.model.updateMatrixWorld(true);}
}
