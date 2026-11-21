import * as THREE from 'three';
import {Fn,Loop,dot,float,max,positionLocal,smoothstep,uniform,uniformArray,vec4} from 'three/tsl';

// The loading garden is bounded to 18 plants. The array and pipeline stay
// resident; only plant positions and count change after a planting event.
export function createWebGpuLoadingContact({capacity=18}={}){
 if(!Number.isSafeInteger(capacity)||capacity<1||capacity>64)throw TypeError('Invalid loading contact capacity');
 const points=Array.from({length:capacity},()=>new THREE.Vector2()),roots=uniformArray(points,'vec2'),count=uniform(0,'int');let length=0;
 const occlusion=Fn(()=>{const contact=float(0).toVar();Loop(count,({i})=>{const delta=positionLocal.xy.sub(roots.element(i));contact.assign(max(contact,float(1).sub(smoothstep(.015,.42,dot(delta,delta)))));});return float(1).sub(contact.mul(.38));})();
 return {configure(material){if(!material?.isNodeMaterial||!material.outputNode?.isNode)throw TypeError('Unsupported loading contact material');const lit=material.outputNode;material.outputNode=vec4(lit.rgb.mul(occlusion),lit.a);return material;},sync(plants){if(!Array.isArray(plants)||plants.length>capacity||plants.some(p=>!Number.isFinite(p?.x)||!Number.isFinite(p?.z)))throw TypeError('Invalid loading contact plants');let changed=length!==plants.length;for(let i=0;i<plants.length;i++){const plant=plants[i];if(points[i].x!==plant.x||points[i].y!==-plant.z){points[i].set(plant.x,-plant.z);changed=true;}}if(changed){length=plants.length;count.value=length;}return changed;},status(){return {count:length,positions:points.slice(0,length).map(point=>point.toArray())};}};
}
