import * as T from 'three';
const yAxis=new T.Vector3(0,1,0);
// Bind palm normals from the original open-palm pose before animation sampling.
export class GuardianLapPose {
 constructor(model,group){
  this.group=group;this.sides=[];model.updateMatrixWorld(true);
  for(const [side,sign] of [['L',-1],['R',1]]){
   const bones=['Arm','Forearm','Hand'].map(n=>model.getObjectByName(n+side)??model.getObjectByName(n+'.'+side));if(bones.some(b=>!b))continue;
   const q=bones[2].getWorldQuaternion(new T.Quaternion());
   const normal=new T.Vector3(0,1,0).applyQuaternion(q.invert());normal.addScaledVector(yAxis,-normal.dot(yAxis)).normalize();
   this.sides.push({bones,sign,normal,rest:bones.map(()=>new T.Quaternion())});
  }
  this.a=new T.Vector3();this.b=new T.Vector3();this.c=new T.Vector3();this.target=new T.Vector3();this.axis=new T.Vector3();this.pole=new T.Vector3();this.elbow=new T.Vector3();this.normal=new T.Vector3();this.desired=new T.Vector3();this.cross=new T.Vector3();
  this.q=new T.Quaternion();this.parent=new T.Quaternion();this.delta=new T.Quaternion();this.groupQ=new T.Quaternion();
 }
 orient(bone,direction){
  bone.getWorldQuaternion(this.q);this.axis.copy(yAxis).applyQuaternion(this.q);this.delta.setFromUnitVectors(this.axis,direction.normalize());this.q.premultiply(this.delta);
  bone.parent.getWorldQuaternion(this.parent).invert();bone.quaternion.copy(this.parent.multiply(this.q));bone.updateWorldMatrix(false,true);
 }
 update(weight){
  if(weight<=0)return;this.group.getWorldQuaternion(this.groupQ);
  for(const s of this.sides){
   const [arm,fore,hand]=s.bones;s.bones.forEach((b,i)=>s.rest[i].copy(b.quaternion));
   arm.getWorldPosition(this.a);fore.getWorldPosition(this.b);hand.getWorldPosition(this.c);const l1=this.a.distanceTo(this.b),l2=this.b.distanceTo(this.c);
   // Wrists in front of the mantle, separated so both palms remain readable.
   this.target.set(s.sign*.17,-.13,.29);this.group.localToWorld(this.target);
   this.axis.copy(this.target).sub(this.a);const d=T.MathUtils.clamp(this.axis.length(),Math.abs(l1-l2)+.001,l1+l2-.001);this.axis.normalize();this.target.copy(this.a).addScaledVector(this.axis,d);
   this.pole.set(s.sign*.6,-.1,.08);this.group.localToWorld(this.pole);this.pole.sub(this.a).addScaledVector(this.axis,-this.pole.dot(this.axis)).normalize();
   const along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along));this.elbow.copy(this.a).addScaledVector(this.axis,along).addScaledVector(this.pole,height);
   this.b.copy(this.elbow).sub(this.a);this.orient(arm,this.b);fore.getWorldPosition(this.b);this.b.subVectors(this.target,this.b);this.orient(fore,this.b);
   this.b.set(s.sign*.35,-.85,.1).normalize().applyQuaternion(this.groupQ);this.orient(hand,this.b);
   hand.getWorldQuaternion(this.q);this.normal.copy(s.normal).applyQuaternion(this.q);this.desired.set(0,0,1).applyQuaternion(this.groupQ);this.desired.addScaledVector(this.b,-this.desired.dot(this.b)).normalize();
   const angle=Math.atan2(this.cross.crossVectors(this.normal,this.desired).dot(this.b),this.normal.dot(this.desired));this.delta.setFromAxisAngle(this.b,angle);this.q.premultiply(this.delta);hand.parent.getWorldQuaternion(this.parent).invert();hand.quaternion.copy(this.parent.multiply(this.q));
   s.bones.forEach((bone,i)=>bone.quaternion.slerp(s.rest[i],1-weight));arm.updateWorldMatrix(false,true);
  }
 }
}
