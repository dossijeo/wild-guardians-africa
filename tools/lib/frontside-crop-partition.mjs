// QA-only two-group design. Leaves retain DoubleSide; no source is modified.
import * as THREE from 'three';
export function partitionCropGeometry(source,faceLabels,frontLabels=[0,1],reverseFaces=[]){
 if(source.groups.length||Object.keys(source.morphAttributes).length||source.drawRange.start!==0||source.drawRange.count!==Infinity)throw Error('Unexpected source crop grouping/morph/range');
 const vertexCount=source.getAttribute('position').count,index=source.index?.array??Uint32Array.from({length:vertexCount},(_,i)=>i);
 if(index.length%3||faceLabels.length!==index.length/3||faceLabels.some(label=>!Number.isInteger(label)||label<0))throw Error('Invalid face labels');
 if(!Array.isArray(frontLabels)||!frontLabels.length||frontLabels.some(l=>!Number.isInteger(l)||l<0)||new Set(frontLabels).size!==frontLabels.length)throw Error('Invalid Front regional subset');
 const front=[],double=[];
 faceLabels.forEach((label,face)=>(frontLabels.includes(label)?front:double).push(face));
 if(!Array.isArray(reverseFaces)||new Set(reverseFaces).size!==reverseFaces.length||reverseFaces.some(face=>!Number.isInteger(face)||face<0||face>=faceLabels.length||!frontLabels.includes(faceLabels[face])))throw Error('Invalid regional reverse faces');
 const faces=[...front,...double],IndexType=source.index?source.index.array.constructor:vertexCount<=65535?Uint16Array:Uint32Array;
 const indices=new IndexType(index.length+reverseFaces.length*3);
 faces.forEach((face,output)=>indices.set(index.subarray(face*3,face*3+3),output*3));
 reverseFaces.forEach((face,output)=>indices.set([index[face*3],index[face*3+2],index[face*3+1]],index.length+output*3));
 const geometry=new source.constructor();
 // Attribute objects (including live iGrowth/iBridge instance buffers) are
 // borrowed, never copied or reordered. Only the index array is owned here.
 for(const [name,attribute] of Object.entries(source.attributes))geometry.setAttribute(name,attribute);
 geometry.setIndex(new THREE.BufferAttribute(indices,1));
 geometry.boundingBox=source.boundingBox?.clone()??null;geometry.boundingSphere=source.boundingSphere?.clone()??null;
 if(source.isInstancedBufferGeometry)geometry.instanceCount=source.instanceCount;
 if(front.length)geometry.addGroup(0,front.length*3,0);
 if(double.length)geometry.addGroup(front.length*3,double.length*3,1);
 if(reverseFaces.length)geometry.addGroup(index.length,reverseFaces.length*3,2);
 const provenance=[...faces,...reverseFaces];
 geometry.userData={...source.userData,qaTriangleSourceFaces:provenance.map(face=>source.userData.qaTriangleSourceFaces?.[face]??face),qaFaceLabels:provenance.map(face=>faceLabels[face]),qaReversedFaceStart:faces.length};
 return {geometry,sourceFaceOrder:provenance,frontFaces:front.length,doubleFaces:double.length,reverseFaces:reverseFaces.length,indexArrayBytes:indices.byteLength,additionalActiveIndexBytes:source.index?indices.byteLength-source.index.array.byteLength:indices.byteLength};
}

// Private reverse draw material: geometry has actually reversed winding and
// GL culls FrontSide, while the source's back-facing normal/TBN recipe remains
// unchanged. Attributes need no private normal/UV/driver duplicates. This is
// a disabled derived-model experiment, not proof of mapped-shading equality.
export function preserveSourceBackFacingRecipe(material){
 material.side=THREE.FrontSide;material.defines={...material.defines,DOUBLE_SIDED:''};
 const compile=material.onBeforeCompile,key=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){compile?.call(this,shader,renderer);
  const include='#include <normal_fragment_begin>';
  if(!shader.fragmentShader.includes(include))throw Error('Missing source normal fragment path');
  shader.fragmentShader=shader.fragmentShader.replace(include,THREE.ShaderChunk.normal_fragment_begin.replace('float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;','float faceDirection = -1.0;'));
 };
 material.customProgramCacheKey=function(){return (key?.call(this)??'')+'|qa-source-back-facing-recipe-v1';};
 material.needsUpdate=true;
}
