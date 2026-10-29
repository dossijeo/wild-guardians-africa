import {Quaternion,Vector3} from 'three';

// Small forward torso correction for the lion's authored backward walking lean.
// Apply after a fresh mixer sample, before grounding. Legs and pelvis stay native.
const rigs=new WeakMap(),axis=new Vector3(1,0,0),parentQ=new Quaternion(),delta=new Quaternion();
export const LION_WALK_LEAN=Math.PI/36; // 5 degrees toward the model's +Z front.
export function balanceLionWalk(model){
 if(model.userData.beastSpecies!=='lion')return;
 let rig=rigs.get(model);
 if(!rig){
  const spine=model.getObjectByName('Spine1');if(!spine)return;
  const parents=[];for(let p=spine.parent;p&&p!==model;p=p.parent)parents.push(p);
  rig={spine,parents};rigs.set(model,rig);
 }
 // Model/root rotation cancels when converting model X into parent space.
 // Compose only the short ancestor chain; grounding updates world matrices.
 parentQ.identity();for(const p of rig.parents)parentQ.premultiply(p.quaternion);
 axis.set(1,0,0).applyQuaternion(parentQ.invert()).normalize();
 rig.spine.quaternion.premultiply(delta.setFromAxisAngle(axis,LION_WALK_LEAN));
}
