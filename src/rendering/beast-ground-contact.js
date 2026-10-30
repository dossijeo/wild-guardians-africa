import {Uint8BufferAttribute} from 'three';
import {ACTOR_CONTACT_MASKS} from './actor-contact-masks.js';
const checked=new WeakSet();
export function applyAuthoredContactMask(mesh){
 const geometry=mesh.geometry;if(checked.has(geometry))return;checked.add(geometry);
 if(geometry.getAttribute('tailContactExempt'))return;
 const p=geometry.attributes.position;let hash=2166136261;
 for(let i=0;i<p.count;i++)for(let k=0;k<3;k++)hash=Math.imul(hash^Math.round(p.getComponent(i,k)*1e5),16777619);
 const mask=ACTOR_CONTACT_MASKS[p.count+':'+(hash>>>0)];if(!mask)return;
 const flags=new Uint8Array(p.count);for(const i of mask.indices)flags[i]=1;
 geometry.setAttribute('tailContactExempt',new Uint8BufferAttribute(flags,1));
}
// Tail skin is decorative during knockdown, never a support for the body.
// Unrigged tails may be explicitly marked with a per-vertex tailContactExempt
// attribute; do not infer them from pelvis weights or spatial thresholds.
export function isTailContactVertex(mesh,index){
 applyAuthoredContactMask(mesh);
 const mask=mesh.geometry.getAttribute('tailContactExempt');
 if(mask?.getX(index)>.5)return true;
 const indices=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight;
 if(!indices||!weights)return false;
 let tail=0,total=0;
 for(let k=0;k<4;k++){
  const weight=weights.getComponent(index,k);total+=weight;
  let bone=mesh.skeleton.bones[indices.getComponent(index,k)];
  while(bone?.isBone){
   if(/^(?:mixamorig[:_]?)?tail(?:[_.\d]|$)/i.test(bone.name)){tail+=weight;break;}
   bone=bone.parent;
  }
 }
 return total>0&&tail/total>.5;
}

// One immutable classification per scan, rather than walking four bone chains
// for every vertex. Rebuild for each scan so rig/mask edits are observed.
export function tailContactPredicate(mesh){
 applyAuthoredContactMask(mesh);
 const mask=mesh.geometry.getAttribute('tailContactExempt');
 const indices=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight;
 const tails=mesh.skeleton.bones.map(bone=>{
  for(let b=bone;b?.isBone;b=b.parent)if(/^(?:mixamorig[:_]?)?tail(?:[_.\d]|$)/i.test(b.name))return true;
  return false;
 });
 return index=>{
  if(mask?.getX(index)>.5)return true;
  if(!indices||!weights)return false;
  let tail=0,total=0;
  for(let k=0;k<4;k++){const weight=weights.getComponent(index,k);total+=weight;if(tails[indices.getComponent(index,k)])tail+=weight;}
  return total>0&&tail/total>.5;
 };
}
