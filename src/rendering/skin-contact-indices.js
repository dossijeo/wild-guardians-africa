import {isTailContactVertex,applyAuthoredContactMask} from './beast-ground-contact.js';
const cache=new WeakMap();
const version=a=>a?.isInterleavedBufferAttribute?a.data.version:a?.version;
export function skinContactIndices(mesh){
 applyAuthoredContactMask(mesh);
 const geometry=mesh.geometry,g=geometry.attributes,attributes=[g.position,g.skinIndex,g.skinWeight,...(geometry.morphAttributes.position??[])],mask=g.tailContactExempt;
 const skeletonKey=mesh.skeleton.bones.map(b=>{const chain=[];for(let p=b;p?.isBone;p=p.parent)chain.push(p.name);return chain.join('/');}).join('|');
 let entries=cache.get(geometry);if(!entries){entries=new Map();cache.set(geometry,entries);}
 const old=entries.get(skeletonKey);
 if(old&&old.mask===mask&&old.maskVersion===mask?.version&&attributes.length===old.attributes.length&&attributes.every((a,i)=>a===old.attributes[i]&&version(a)===old.versions[i]))return old.indices;
 const indices=[],seen=new Set();
 // Exact position/skin/morph equality removes UV seams without losing shape.
 for(let i=0;i<g.position.count;i++){if(isTailContactVertex(mesh,i))continue;let key='';for(const a of attributes)for(let k=0;k<a.itemSize;k++)key+=a.getComponent(i,k)+',';if(!seen.has(key)){seen.add(key);indices.push(i);}}
 entries.set(skeletonKey,{indices,attributes,versions:attributes.map(version),mask,maskVersion:mask?.version});return indices;
}
