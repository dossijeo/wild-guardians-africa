import * as THREE from 'three';
import {attribute,materialReference,positionWorld,step} from 'three/tsl';

// One graph for every clipped chunk. The bounds are instance data, so moving
// between chunks changes neither the material graph nor its pipeline key.
const bounds=attribute('wgChunkClip','vec4'),x=positionWorld.x,z=positionWorld.z;
export const chunkClipOpacity=materialReference('opacity','float').mul(step(bounds.x,x)).mul(step(bounds.y,z)).mul(step(bounds.z,x).oneMinus()).mul(step(bounds.w,z).oneMinus());
export function insideChunkClip(point,attribute){
 if(!attribute)return true;
 if(!point||attribute.itemSize!==4||attribute.count<1)return false;
 return point.x>=attribute.getX(0)&&point.z>=attribute.getY(0)&&point.x<attribute.getZ(0)&&point.z<attribute.getW(0);
}
export function installChunkClipBounds(geometry,cx,cz,count){
 if(!geometry?.isBufferGeometry||!Number.isSafeInteger(cx)||!Number.isSafeInteger(cz)||!Number.isSafeInteger(count)||count<1)throw TypeError('Invalid chunk clip geometry');
 const array=new Float32Array(count*4),rect=[cx*48-24,cz*48-24,cx*48+24,cz*48+24];for(let i=0;i<count;i++)array.set(rect,i*4);
 geometry.setAttribute('wgChunkClip',new THREE.InstancedBufferAttribute(array,4));return geometry;
}
export function cloneChunkAttribute(source){
 const copy=new THREE.BufferAttribute(source.array,source.itemSize,source.normalized);copy.setUsage(source.usage);copy.gpuType=source.gpuType;return copy;
}
export function cloneChunkGeometry(source){
 const geometry=new THREE.BufferGeometry();if(source.index)geometry.setIndex(cloneChunkAttribute(source.index));for(const [key,value] of Object.entries(source.attributes))geometry.setAttribute(key,cloneChunkAttribute(value));geometry.groups=source.groups.map(group=>({...group}));geometry.drawRange={...source.drawRange};geometry.boundingBox=source.boundingBox?.clone()??null;geometry.boundingSphere=source.boundingSphere?.clone()??null;geometry.userData.ownsChunkClip=true;return geometry;
}
