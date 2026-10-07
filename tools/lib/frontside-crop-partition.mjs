// QA-only two-group design. Leaves retain DoubleSide; no source is modified.
import * as THREE from 'three';
export function partitionCropGeometry(source,faceLabels){
 if(source.groups.length||Object.keys(source.morphAttributes).length||source.drawRange.start!==0||source.drawRange.count!==Infinity)throw Error('Unexpected source crop grouping/morph/range');
 const vertexCount=source.getAttribute('position').count,index=source.index?.array??Uint32Array.from({length:vertexCount},(_,i)=>i);
 if(index.length%3||faceLabels.length!==index.length/3||faceLabels.some(label=>!Number.isInteger(label)||label<0))throw Error('Invalid face labels');
 const front=[],double=[];
 faceLabels.forEach((label,face)=>(label<2?front:double).push(face));
 const faces=[...front,...double],IndexType=source.index?source.index.array.constructor:vertexCount<=65535?Uint16Array:Uint32Array;
 const indices=new IndexType(index.length);
 faces.forEach((face,output)=>indices.set(index.subarray(face*3,face*3+3),output*3));
 const geometry=new source.constructor();
 // Attribute objects (including live iGrowth/iBridge instance buffers) are
 // borrowed, never copied or reordered. Only the index array is owned here.
 for(const [name,attribute] of Object.entries(source.attributes))geometry.setAttribute(name,attribute);
 geometry.setIndex(new THREE.BufferAttribute(indices,1));
 geometry.boundingBox=source.boundingBox?.clone()??null;geometry.boundingSphere=source.boundingSphere?.clone()??null;
 if(source.isInstancedBufferGeometry)geometry.instanceCount=source.instanceCount;
 if(front.length)geometry.addGroup(0,front.length*3,0);
 if(double.length)geometry.addGroup(front.length*3,double.length*3,1);
 geometry.userData={...source.userData,qaTriangleSourceFaces:faces.map(face=>source.userData.qaTriangleSourceFaces?.[face]??face),qaFaceLabels:faces.map(face=>faceLabels[face])};
 return {geometry,sourceFaceOrder:faces,frontFaces:front.length,doubleFaces:double.length,indexArrayBytes:indices.byteLength,additionalActiveIndexBytes:source.index?0:indices.byteLength};
}
