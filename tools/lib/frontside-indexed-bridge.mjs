// QA-only candidate builder. Production crop-batch does not import this module.
import * as THREE from 'three';
const fields={position:3,normal:3,uv:2,aRoot:3,aPeerRoot:3,aSpin:4,aPart:4};
export function indexBridgeGeometry(geometry,sourceKeys,reverseFaces=[]){
 if(geometry.index)throw Error('Expected original unindexed bridge');
 const count=geometry.getAttribute('position').count;
 if(count%3||sourceKeys.length!==count)throw Error('Bridge provenance dimensions differ');
 const attributes=Object.entries(fields).map(([name,size])=>{
  const attribute=geometry.getAttribute(name);
  if(!attribute||attribute.itemSize!==size||attribute.count!==count||!(attribute.array instanceof Float32Array)||attribute.isInterleavedBufferAttribute)throw Error('Unexpected bridge attribute '+name);
  return{name,size,attribute,bits:new Uint32Array(attribute.array.buffer,attribute.array.byteOffset,attribute.array.length)};
 });
 if(Object.keys(geometry.morphAttributes).length)throw Error('Unexpected bridge morph attributes');
 const selected=new Set(reverseFaces);
 if(selected.size!==reverseFaces.length||reverseFaces.some(f=>!Number.isInteger(f)||f<0||f>=count/3))throw Error('Invalid reverse face selection');
 const vertices=[],indices=[],unique=new Map();
 function append(source,reverse){
  const tuple=sourceKeys[source];
  if(!Array.isArray(tuple)||tuple.length!==3||tuple.some(v=>!Number.isInteger(v)||v<0))throw Error('Expected role/sourceVertexID/faceLabel provenance');
  const key=tuple.join('/')+'/'+Number(reverse);let index=unique.get(key);
  if(index===undefined){index=vertices.length;unique.set(key,index);vertices.push({source,reverse});}
  else{
   // Key identity alone is insufficient when the caller supplies inconsistent
   // provenance. Verify every float32 bit before sharing a vertex.
   const other=vertices[index].source;
   for(const {size,bits,name} of attributes)for(let c=0;c<size;c++)if(bits[source*size+c]!==bits[other*size+c])throw Error('Conflicting shader inputs for '+key+' '+name);
  }
  indices.push(index);
 }
 for(let vertex=0;vertex<count;vertex++)append(vertex,false);
 for(const face of reverseFaces)for(const corner of [0,2,1])append(face*3+corner,true);
 const result=geometry.clone();
 for(const [name,attribute] of Object.entries(geometry.attributes))if(attribute.isInstancedBufferAttribute)result.setAttribute(name,attribute);
 for(const {name,size,attribute,bits} of attributes){
  const array=new Float32Array(vertices.length*size),outBits=new Uint32Array(array.buffer);
  for(let v=0;v<vertices.length;v++){
   const {source,reverse}=vertices[v];
   for(let c=0;c<size;c++)outBits[v*size+c]=bits[source*size+c];
   if(reverse&&name==='normal')for(let c=0;c<3;c++)array[v*size+c]=-array[v*size+c];
   if(reverse&&name==='aPart')array[v*size+3]=1;
  }
  result.setAttribute(name,new THREE.BufferAttribute(array,size,attribute.normalized));
 }
 result.setIndex(new THREE.BufferAttribute(vertices.length<=65536?Uint16Array.from(indices):Uint32Array.from(indices),1));
 // Prefix roundtrip is bit-exact for all source shader inputs, including -0.
 for(const {name,size,bits} of attributes){const restored=result.getAttribute(name).array,restoredBits=new Uint32Array(restored.buffer);
  for(let source=0;source<count;source++)for(let c=0;c<size;c++)if(restoredBits[indices[source]*size+c]!==bits[source*size+c])throw Error('Source attribute reconstruction differs');
 }
 return{geometry:result,sourceVertices:count,indexedVertices:vertices.length,sourceTriangles:count/3,reverseTriangles:reverseFaces.length,
  // Triangle provenance remains source prefix plus reversed selected face IDs.
  triangleSourceFaces:[...Array(count/3).keys(),...reverseFaces],normalMapCompensationRequired:true};
}
