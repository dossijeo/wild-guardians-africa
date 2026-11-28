import * as THREE from 'three';
const up=new THREE.Vector3(0,1,0),aim=new THREE.Vector3(),axis=new THREE.Vector3(),q=new THREE.Quaternion(),identity=new THREE.Quaternion(),local=new THREE.Vector3();
const JOINTS=[['Arm',.95],['Forearm',1.05],['Hand',1.25]];
// Applied after the body mixer, leaving face, gaze and cloth layers independent.
export function pointGuardian(model,target,weight=1){
 const left=model.getObjectByName('ArmL')??model.getObjectByName('Arm.L'),right=model.getObjectByName('ArmR')??model.getObjectByName('Arm.R');
 if(!left||!right)return;
 const leftDistance=left.getWorldPosition(local).distanceToSquared(target),rightDistance=right.getWorldPosition(local).distanceToSquared(target);
 const side=leftDistance<rightDistance?'L':'R';
 for(const [part,limit] of JOINTS){
  const bone=model.getObjectByName(part+side)??model.getObjectByName(part+'.'+side);if(!bone)continue;
  bone.parent.worldToLocal(aim.copy(target));aim.sub(bone.position).normalize();axis.copy(up).applyQuaternion(bone.quaternion);q.setFromUnitVectors(axis,aim);
  const angle=q.angleTo(identity);if(angle>limit)q.slerp(identity,1-limit/angle);q.slerp(identity,1-weight);bone.quaternion.premultiply(q);bone.updateWorldMatrix(false,true);
 }
}
