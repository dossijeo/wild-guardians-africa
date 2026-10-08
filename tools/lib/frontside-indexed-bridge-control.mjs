// QA-only lossless bridge control. It changes submission indexing, never the
// corner stream, regional drivers, materials or original bridge metadata.
import * as THREE from 'three';
const lanes={position:3,normal:3,uv:2,aRoot:3,aPeerRoot:3,aSpin:4,aPart:4};
export function indexedBridgeControl(source){
 if(source.index||Object.keys(source.morphAttributes).length)throw Error('Expected native nonindexed procedural bridge');
 const count=source.getAttribute('position')?.count;
 if(!Number.isInteger(count)||count%3)throw Error('Invalid bridge corner count');
 const fields=[];
 for(const [name,size] of Object.entries(lanes)){
  const attribute=source.getAttribute(name);
  if(!attribute||attribute.isInterleavedBufferAttribute||attribute.isInstancedBufferAttribute||!(attribute.array instanceof Float32Array)||attribute.itemSize!==size||attribute.count!==count||attribute.normalized)throw Error('Unexpected bridge lane '+name);
  fields.push({name,attribute,bits:new Uint32Array(attribute.array.buffer,attribute.array.byteOffset,attribute.array.length)});
 }
 for(const [name,attribute] of Object.entries(source.attributes))if(!Object.hasOwn(lanes,name)&&!attribute.isInstancedBufferAttribute)throw Error('Unknown static bridge attribute '+name);
 const table=new Map(),representatives=[],indices=[];
 for(let corner=0;corner<count;corner++){
  const key=fields.map(({attribute,bits})=>Array.from(bits.subarray(corner*attribute.itemSize,(corner+1)*attribute.itemSize)).join(',')).join('/');
  if(!table.has(key)){table.set(key,representatives.length);representatives.push(corner);}
  indices.push(table.get(key));
 }
 const geometry=new THREE.BufferGeometry();
 for(const {name,attribute,bits} of fields){
  const array=new Float32Array(representatives.length*attribute.itemSize),out=new Uint32Array(array.buffer);
  representatives.forEach((corner,i)=>out.set(bits.subarray(corner*attribute.itemSize,(corner+1)*attribute.itemSize),i*attribute.itemSize));
  const indexed=new THREE.BufferAttribute(array,attribute.itemSize);indexed.name=attribute.name;indexed.setUsage(attribute.usage);geometry.setAttribute(name,indexed);
 }
 for(const [name,attribute] of Object.entries(source.attributes))if(attribute.isInstancedBufferAttribute)geometry.setAttribute(name,attribute);
 geometry.setIndex(new THREE.BufferAttribute(representatives.length<=65535?Uint16Array.from(indices):Uint32Array.from(indices),1));
 geometry.name=source.name;geometry.userData={...source.userData};geometry.drawRange={...source.drawRange};geometry.groups=source.groups.map(g=>({...g}));geometry.boundingBox=source.boundingBox?.clone()??null;geometry.boundingSphere=source.boundingSphere?.clone()??null;
 return{geometry,originalCorners:count,uniqueVertices:representatives.length,originalStaticBytes:count*88,indexedStaticBytes:representatives.length*88+geometry.index.array.byteLength,meaning:'Lossless indexed DoubleSide control only; no culling, appearance or GPU-benefit approval'};
}
