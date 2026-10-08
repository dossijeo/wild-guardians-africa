// Disabled training constructor. New stem faces have derived identities;
// unchanged soil/leaf face identities are verified, not silently reassigned.
import * as THREE from 'three';
import {partitionCropGeometry} from './frontside-crop-partition.mjs';
export function derivedStemGeometry(source,originalLabels,payload,bilateral=false){
 if(payload.status!=='BLENDER_STEM_REMODELLING_TRAINING_NOT_APPROVED'||payload.mesh!=='maiz_05_maduro'||payload.corners.length!==payload.faceLabels.length)throw Error('Unexpected stem derivative payload');
 if(Object.keys(source.morphAttributes).length||source.getAttribute('tangent'))throw Error('Unexpected crop morph/tangent contract');
 const sourceIndex=source.index?.array??Uint32Array.from({length:source.getAttribute('position').count},(_,i)=>i),sourceFaces=sourceIndex.length/3;
 if(originalLabels.length!==sourceFaces)throw Error('Original regional labels mismatch');
 const unchanged=originalLabels.flatMap((label,face)=>label!==1?[face]:[]);
 if(JSON.stringify(unchanged)!==JSON.stringify(payload.originalUnchangedFaceIds))throw Error('Original soil/leaf identities changed');
 const bits=value=>new Uint32Array(new Float32Array([value]).buffer)[0];
 for(let face=0;face<unchanged.length;face++){
  if(payload.faceLabels[face]!==originalLabels[unchanged[face]])throw Error('Unchanged regional label changed');
  for(let corner=0;corner<3;corner++){const v=sourceIndex[unchanged[face]*3+corner],p=source.getAttribute('position'),n=source.getAttribute('normal'),uv=source.getAttribute('uv'),expected=[p.getX(v),p.getY(v),p.getZ(v),n.getX(v),n.getY(v),n.getZ(v),uv.getX(v),uv.getY(v)],actual=payload.corners[face][corner];if(actual.length!==8||actual.some((value,lane)=>bits(value)!==bits(expected[lane])))throw Error('Original soil/leaf corner bit changed');}
 }
 if(payload.faceLabels.slice(unchanged.length).some(label=>label!==1))throw Error('Derivative escaped stem driver1');
 const rows=[],table=new Map(),indices=[];
 for(const triangle of payload.corners){if(triangle.length!==3)throw Error('Invalid triangle');for(const corner of triangle){if(corner.length!==8||!corner.every(Number.isFinite))throw Error('Invalid derived lanes');const row=new Float32Array(corner),key=Array.from(new Uint32Array(row.buffer)).join(',');if(!table.has(key)){table.set(key,rows.length);rows.push(row);}indices.push(table.get(key));}}
 const geometry=new source.constructor(),positions=[],normals=[],uv=[];
 for(const row of rows){positions.push(...row.subarray(0,3));normals.push(...row.subarray(3,6));uv.push(...row.subarray(6,8));}
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);
 for(const [name,attribute] of Object.entries(source.attributes))if(!['position','normal','uv'].includes(name)){if(!attribute.isInstancedBufferAttribute)throw Error('Unexpected source lane '+name);geometry.setAttribute(name,attribute);}
 geometry.computeBoundingBox();geometry.computeBoundingSphere();geometry.userData={...source.userData,qaStemDerived:true,qaDerivedForwardFaceLabels:[...payload.faceLabels],qaUnchangedOriginalFaceIds:[...unchanged],qaDerivedNewFaceStart:unchanged.length};
 if(!bilateral)return{geometry,forwardStemFaces:payload.faceLabels.filter(label=>label===1).length,reverseStemFaces:0};
 const reverseFaces=payload.faceLabels.flatMap((label,face)=>label===1?[face]:[]),result=partitionCropGeometry(geometry,payload.faceLabels,[1],reverseFaces);
 result.geometry.userData.qaTriangleIdentityMeaning='Indices refer to NEW derived forward faces; never original stem face IDs. Only qaUnchangedOriginalFaceIds retains original correspondence.';
 // The temporary forward geometry was never uploaded. The returned partition
 // shares its newly constructed attribute objects; no private reverse lanes.
 return{geometry:result.geometry,forwardStemFaces:reverseFaces.length,reverseStemFaces:reverseFaces.length};
}
