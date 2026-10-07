import {Object3D} from 'three';
import {nativeLodBins} from '../../src/rendering/lod-source.js';
import {standbyTreeKey} from './native-tree-standby.js';

// Data only: use the existing procedural population, source dimensions and LOD
// recipe. No terrain mesh, collider, worker task or distant shadow is created.
export function logicalNativeStandbyEntries(trees,{metadata,camera,quality,range,physicalIds,suppressed,maxTrees=1024,levels=3,preloadBounds=null}){
 if(!Number.isFinite(range)||range<=0||!Number.isInteger(maxTrees)||maxTrees<1)throw Error('Invalid logical standby budget');
 if(preloadBounds!==null&&(!Array.isArray(preloadBounds)||preloadBounds.length!==4||!preloadBounds.every(Number.isFinite)||preloadBounds[2]<=preloadBounds[0]||preloadBounds[3]<=preloadBounds[1]))throw Error('Invalid logical preload bounds');
 const selected=trees.filter(t=>(preloadBounds===null||t.x>=preloadBounds[0]&&t.z>=preloadBounds[1]&&t.x<=preloadBounds[2]&&t.z<=preloadBounds[3])&&!physicalIds.has(t.id)&&!suppressed.has(t.id)&&Math.hypot(t.x-camera.x,t.z-camera.z)<=range)
  .sort((a,b)=>Math.hypot(a.x-camera.x,a.z-camera.z)-Math.hypot(b.x-camera.x,b.z-camera.z)||a.id.localeCompare(b.id)).slice(0,maxTrees);
 const native=selected.map(t=>({...t,...t.origin})),b=metadata.sourceBounds,prototype={size:b.max.map((v,i)=>v-b.min[i]),centerY:(b.min[1]+b.max[1])/2};
 const bins=nativeLodBins(native,prototype,0,[camera.x,camera.y,camera.z],quality,levels),dummy=new Object3D(),rows=[];
 for(const [level,indices]of bins.entries())for(const i of indices){const t=native[i];dummy.position.set(t.x,t.y,t.z);dummy.rotation.y=t.yaw;dummy.scale.set(t.sx,t.sy,t.sz);dummy.updateMatrix();rows.push({id:t.id,key:standbyTreeKey(t),x:t.x,z:t.z,sy:t.sy,level,matrix:dummy.matrix.toArray()});}
 return rows;
}
