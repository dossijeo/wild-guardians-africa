import {Quaternion,Vector3} from 'three';

// Small forward torso correction for the lion's authored backward walking lean.
// Apply after a fresh mixer sample, before grounding. Legs and pelvis stay native.
const rigs=new WeakMap(),axis=new Vector3(1,0,0),modelQ=new Quaternion(),parentQ=new Quaternion(),delta=new Quaternion();
export const LION_WALK_LEAN=Math.PI/36; // 5 degrees toward the model's +Z front.
export function balanceLionWalk(model){
 if(model.userData.beastSpecies!=='lion')return;
 let spine=rigs.get(model);if(!spine){spine=model.getObjectByName('Spine1');if(!spine)return;rigs.set(model,spine);}
 model.updateWorldMatrix(true,true);
 model.getWorldQuaternion(modelQ);spine.parent.getWorldQuaternion(parentQ).invert();
 axis.set(1,0,0).applyQuaternion(modelQ).applyQuaternion(parentQ).normalize();
 spine.quaternion.premultiply(delta.setFromAxisAngle(axis,LION_WALK_LEAN));
 model.updateMatrixWorld(true);
}

