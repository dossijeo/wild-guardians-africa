import * as THREE from 'three';
// QA-only geometry transplant. Keep the installed skeleton, materials and face bindings.
export function guardianLidStudy(target,donor){
 if(!target?.isSkinnedMesh||!donor?.isSkinnedMesh)throw Error('Missing skinned eyelids');
 const names=Object.keys(target.morphTargetDictionary),other=Object.keys(donor.morphTargetDictionary);
 if(JSON.stringify(names)!==JSON.stringify(other))throw Error('Blink target order differs');
 // bindMatrixInverse changes with the live mesh world transform in attached mode.
 for(const key of ['bindMatrix','matrix'])if(target[key].elements.some((v,i)=>Math.abs(v-donor[key].elements[i])>1e-5))throw Error('Incompatible eyelid '+key);
 const original=target.geometry,geometry=donor.geometry.clone(),skin=geometry.attributes.skinIndex;
 const remap=donor.skeleton.bones.map(b=>target.skeleton.bones.findIndex(t=>t.name===b.name));
 for(let i=0;i<skin.count;i++)for(let c=0;c<skin.itemSize;c++){const index=remap[skin.getComponent(i,c)];if(index<0){geometry.dispose();throw Error('Missing donor bone');}skin.setComponent(i,c,index);}
 const ao=original.attributes.ambientVisibility;
 if(ao){
  const src=original.attributes.position,dst=geometry.attributes.position,values=new Float32Array(dst.count),n=original.attributes.normal,dn=geometry.attributes.normal;
  // The half-density grid samples existing source vertices. Never invent AO for new positions.
  for(let i=0;i<dst.count;i++){let chosen=-1,bestDot=-Infinity;for(let j=0;j<src.count;j++){const d=Math.hypot(src.getX(j)-dst.getX(i),src.getY(j)-dst.getY(i),src.getZ(j)-dst.getZ(i));if(d>1e-7)continue;const dot=n.getX(j)*dn.getX(i)+n.getY(j)*dn.getY(i)+n.getZ(j)*dn.getZ(i);if(dot>bestDot){chosen=j;bestDot=dot;}}if(chosen<0){geometry.dispose();throw Error('Candidate lid vertex requires new AO bake');}values[i]=ao.getX(chosen);}
  geometry.setAttribute('ambientVisibility',new THREE.BufferAttribute(values,1));
 }
 let enabled=false;
 return {set(value){enabled=!!value;target.geometry=enabled?geometry:original;},get enabled(){return enabled;},report(){return {enabled,originalVertices:original.attributes.position.count,candidateVertices:geometry.attributes.position.count,originalTriangles:original.index.count/3,candidateTriangles:geometry.index.count/3,morphTargets:names};},dispose(){target.geometry=original;geometry.dispose();}};
}
