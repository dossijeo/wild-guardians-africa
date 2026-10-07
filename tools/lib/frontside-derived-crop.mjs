// QA-only frozen Blender corner data; never activates a runtime source asset.
import * as THREE from 'three';
export function derivedCropGeometry(source,payload,reverseLeaves=false){
 if(payload.status!=='BLENDER_REMODELLING_TRAINING_NOT_APPROVED'||payload.corners.length!==payload.faceLabels.length)throw Error('Invalid derived corner archive');
 if(Object.keys(source.morphAttributes).length||source.getAttribute('tangent'))throw Error('Unexpected derived crop morph/tangent contract');
 const geometry=new source.constructor(),table=new Map(),rows=[],indices=[],reverseFaces=[];
 function corner(values,reverse){
  if(values.length!==8||!values.every(Number.isFinite))throw Error('Invalid derived vertex lanes');
  const lanes=new Float32Array([...values,reverse?1:0]);if(reverse)for(let i=3;i<6;i++)lanes[i]*=-1;
  const key=Array.from(new Uint32Array(lanes.buffer)).join(',');if(!table.has(key)){table.set(key,rows.length);rows.push(lanes);}return table.get(key);
 }
 payload.corners.forEach((triangle,face)=>{if(triangle.length!==3)throw Error('Invalid derived triangle');triangle.forEach(v=>indices.push(corner(v,false)));if(payload.faceLabels[face]>=2)reverseFaces.push(face);});
 if(reverseLeaves)for(const face of reverseFaces)for(const c of [0,2,1])indices.push(corner(payload.corners[face][c],true));
 const position=[],normal=[],uv=[],reverse=[];for(const row of rows){position.push(...row.slice(0,3));normal.push(...row.slice(3,6));uv.push(...row.slice(6,8));reverse.push(row[8]);}
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(position,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normal,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 if(reverseLeaves)geometry.setAttribute('aQaReverse',new THREE.Float32BufferAttribute(reverse,1));
 for(const [name,attribute] of Object.entries(source.attributes))if(!['position','normal','uv'].includes(name)){if(!attribute.isInstancedBufferAttribute)throw Error('Unknown source lane '+name);geometry.setAttribute(name,attribute);}
 geometry.setIndex(indices);geometry.computeBoundingBox();geometry.computeBoundingSphere();
 geometry.userData={...source.userData,qaDerivedArchiveSource:payload.sourceSha256,qaDerivedFaceLabels:[...payload.faceLabels,...(reverseLeaves?reverseFaces.map(f=>payload.faceLabels[f]):[])]};
 return geometry;
}
