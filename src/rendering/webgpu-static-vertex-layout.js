import {StaticDrawUsage,InterleavedBuffer,InterleavedBufferAttribute} from 'three';

// Call only on an owned geometry before admission. Immutable vertex channels
// share a buffer; independently updated instance/vertex channels keep theirs.
// A channel remains an attribute, so the shader and its precision do not change.
export function packWebGpuStaticVertexLayout(geometry){
 if(!geometry?.isBufferGeometry)throw TypeError('Expected owned buffer geometry');
 const groups=new Map();
 for(const [name,attribute] of Object.entries(geometry.attributes)){
  if(!(attribute.array instanceof Float32Array)||attribute.isInterleavedBufferAttribute||attribute.isInstancedBufferAttribute||attribute.usage!==StaticDrawUsage||attribute.isGLBufferAttribute)continue;
  const key=attribute.array.constructor.name+':'+attribute.gpuType+':'+attribute.count;
  let group=groups.get(key);if(!group)groups.set(key,group=[]);group.push({name,attribute});
 }
 for(const group of groups.values()){
  if(group.length<2)continue;
  const stride=group.reduce((sum,item)=>sum+item.attribute.itemSize,0),first=group[0].attribute,array=new first.array.constructor(first.count*stride),buffer=new InterleavedBuffer(array,stride);let offset=0;
  for(const {name,attribute} of group){
   for(let i=0;i<attribute.count;i++)for(let c=0;c<attribute.itemSize;c++)array[i*stride+offset+c]=attribute.array[i*attribute.itemSize+c];
   const packed=new InterleavedBufferAttribute(buffer,attribute.itemSize,offset,attribute.normalized);packed.name=attribute.name;packed.gpuType=attribute.gpuType;geometry.setAttribute(name,packed);offset+=attribute.itemSize;
  }
 }
 return geometry;
}
