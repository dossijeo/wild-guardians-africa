// QA-only candidate builder. Production crop-batch does not import this module.
import * as THREE from 'three';
const fields={position:3,normal:3,uv:2,aRoot:3,aPeerRoot:3,aSpin:4,aPart:4};
export function patchReverseDerivativeFrame(material,bridge=false){
 const compile=material.onBeforeCompile,cache=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  compile.call(this,shader,renderer);
  if(!shader.vertexShader.includes('void main() {')||!shader.fragmentShader.includes('#include <normal_fragment_begin>'))throw Error('Unexpected normal-frame shader contract');
  shader.vertexShader=(bridge?'':'attribute float aQaReverse;\n')+'varying float vQaReverse;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('void main() {',`void main() { vQaReverse=${bridge?'aPart.w':'aQaReverse'};`);
  shader.fragmentShader='varying float vQaReverse;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
// Actual crop states/bridges omit authored tangents. Match DoubleSide's XY
// frame inversion after deriving from the already reversed shading normal.
#if defined(USE_NORMALMAP_TANGENTSPACE) || defined(USE_CLEARCOAT_NORMALMAP) || defined(USE_ANISOTROPY)
 if(vQaReverse>.5){tbn[0]*=-1.;tbn[1]*=-1.;}
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
 if(vQaReverse>.5){tbn2[0]*=-1.;tbn2[1]*=-1.;}
#endif`);
 };
 material.customProgramCacheKey=function(){return cache.call(this)+'|qa-reverse-derivative-frame-v1|'+(bridge?'bridge':'state');};
}
export function reverseIndexedState(geometry,faces){
 if(!geometry.index||geometry.getAttribute('tangent')||Object.keys(geometry.morphAttributes).length)throw Error('Expected indexed derivative-frame crop state without morphs');
 const count=geometry.getAttribute('position').count,index=geometry.index.array,chosen=new Set(faces);
 if(chosen.size!==faces.length||faces.some(f=>!Number.isInteger(f)||f<0||f>=index.length/3))throw Error('Invalid state reverse faces');
 const extra=[...new Set(faces.flatMap(f=>Array.from(index.slice(f*3,f*3+3))))].sort((a,b)=>a-b),lookup=new Map(extra.map((v,i)=>[v,count+i])),result=geometry.clone();
 for(const [name,attribute] of Object.entries(geometry.attributes)){
  if(attribute.isInstancedBufferAttribute){result.setAttribute(name,attribute);continue;}
  if(attribute.isInterleavedBufferAttribute||!(attribute.array instanceof Float32Array))throw Error('Unexpected crop state attribute '+name);
  const size=attribute.itemSize,array=new Float32Array((count+extra.length)*size),bits=new Uint32Array(array.buffer),source=new Uint32Array(attribute.array.buffer,attribute.array.byteOffset,attribute.array.length);bits.set(source);
  extra.forEach((v,i)=>{for(let c=0;c<size;c++)bits[(count+i)*size+c]=source[v*size+c];if(name==='normal')for(let c=0;c<size;c++)array[(count+i)*size+c]=-array[(count+i)*size+c];});
  result.setAttribute(name,new THREE.BufferAttribute(array,size,attribute.normalized));
 }
 const flag=new Float32Array(count+extra.length);flag.fill(1,count);result.setAttribute('aQaReverse',new THREE.BufferAttribute(flag,1));
 const indices=Array.from(index);for(const face of faces)for(const corner of [0,2,1])indices.push(lookup.get(index[face*3+corner]));
 result.setIndex(new THREE.BufferAttribute(count+extra.length<=65536?Uint16Array.from(indices):Uint32Array.from(indices),1));
 return result;
}
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
