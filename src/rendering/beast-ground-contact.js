// Tail skin is decorative during knockdown, never a support for the body.
// Unrigged tails may be explicitly marked with a per-vertex tailContactExempt
// attribute; do not infer them from pelvis weights or spatial thresholds.
export function isTailContactVertex(mesh,index){
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
