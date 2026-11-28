const cache=new WeakMap();
function bonesFor(model){let bones=cache.get(model);if(!bones){bones=[];model.traverse(node=>{if(node.isBone)bones.push(node);});cache.set(model,bones);}return bones;}
const valid=value=>Array.isArray(value)&&value.length===10&&value.every(Number.isFinite);
// Physics may create toe tips absent from an authored visual skeleton. They
// are not deforming bones; every other mismatch remains a hard failure.
export function normalizeConfirmedAnimalPose(model,pose){
 if(!model||!Array.isArray(pose?.bones))return pose;
 const names=new Set(bonesFor(model).map(bone=>bone.name)),seen=new Set(),bones=[];let changed=false;
 for(const bone of pose.bones){
  if(!names.has(bone?.name)&&(bone?.name==='LeftToeBase'||bone?.name==='RightToeBase')){
   if(seen.has(bone.name))throw Error('Duplicate auxiliary physics bone');
   if(!valid(bone.transform))throw Error('Invalid auxiliary physics bone');
   seen.add(bone.name);changed=true;
  }else bones.push(bone);
 }
 return changed?{...pose,bones}:pose;
}
// Verify the complete pose before touching any render object. The caller must
// only provide a pose paired with an accepted authoritative publication.
export function validateConfirmedAnimalPose(model,pose){
 if(!model||!pose||typeof pose.actorId!=='string'||pose.active!==true||!valid(pose.root)||!valid(pose.model)||!Array.isArray(pose.bones))throw TypeError('Invalid confirmed animal pose');
 pose=normalizeConfirmedAnimalPose(model,pose);
 const bones=bonesFor(model),mismatch=bones.findIndex((bone,i)=>bone.name!==pose.bones[i]?.name||!valid(pose.bones[i]?.transform));if(bones.length!==pose.bones.length||mismatch>=0)throw Error(`Confirmed animal rig mismatch: ${pose.actorId}, visual=${bones.length}, authority=${pose.bones.length}, index=${mismatch}, visualBone=${bones[mismatch]?.name??''}, authorityBone=${pose.bones[mismatch]?.name??''}`);
 return bones;
}
export function applyConfirmedAnimalPose(root,model,pose){
 if(!root)throw TypeError('Invalid confirmed animal root');pose=normalizeConfirmedAnimalPose(model,pose);const bones=validateConfirmedAnimalPose(model,pose);
 const set=(node,value)=>{node.position.fromArray(value,0);node.quaternion.fromArray(value,3);node.scale.fromArray(value,7);};
 set(root,pose.root);set(model,pose.model);for(let i=0;i<bones.length;i++)set(bones[i],pose.bones[i].transform);root.updateMatrixWorld(true);
}
