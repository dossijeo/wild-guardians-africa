const cache=new WeakMap();
function bonesFor(model){let bones=cache.get(model);if(!bones){bones=[];model.traverse(node=>{if(node.isBone)bones.push(node);});cache.set(model,bones);}return bones;}
const valid=value=>Array.isArray(value)&&value.length===10&&value.every(Number.isFinite);
// Verify the complete pose before touching any render object. The caller must
// only provide a pose paired with an accepted authoritative publication.
export function applyConfirmedAnimalPose(root,model,pose){
 if(!root||!model||!pose||typeof pose.actorId!=='string'||pose.active!==true||!valid(pose.root)||!valid(pose.model)||!Array.isArray(pose.bones))throw TypeError('Invalid confirmed animal pose');
 const bones=bonesFor(model);if(bones.length!==pose.bones.length||bones.some((bone,i)=>bone.name!==pose.bones[i]?.name||!valid(pose.bones[i]?.transform)))throw Error('Confirmed animal rig mismatch');
 const set=(node,value)=>{node.position.fromArray(value,0);node.quaternion.fromArray(value,3);node.scale.fromArray(value,7);};
 set(root,pose.root);set(model,pose.model);for(let i=0;i<bones.length;i++)set(bones[i],pose.bones[i].transform);root.updateMatrixWorld(true);
}
